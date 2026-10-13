import {prisma} from "@/lib/prisma";
export type DiscordGuildRole={id:string;name:string;position:number;managed:boolean};
export type DiscordGuildMember={roles:string[];nick:string|null;user:{id:string;username:string}};
const guild=()=>process.env.DISCORD_GUILD_ID;
const token=()=>process.env.DISCORD_BOT_TOKEN;
const memberCache=new Map<string,{until:number;value:DiscordGuildMember|null}>();
const pending=new Map<string,Promise<DiscordGuildMember|null>>();
let rolesCache:{until:number;value:DiscordGuildRole[]}|null=null;
let discordCooldownUntil=0;
let queue:Promise<void>=Promise.resolve();
const sleep=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
async function discord(path:string,init?:RequestInit):Promise<Response>{
 if(!guild()||!token())throw new Error("Discord is not configured");
 // Serialize requests in this process to prevent burst traffic.
 const previous=queue;
 let release!:()=>void;
 queue=new Promise<void>(resolve=>{release=resolve});
 await previous;
 try{
  for(let attempt=0;attempt<4;attempt++){
   const cooldown=discordCooldownUntil-Date.now();
   if(cooldown>0)await sleep(cooldown);
   const response=await fetch("https://discord.com/api/v10"+path,{
    ...init,
    headers:{Authorization:"Bot "+token(),"Content-Type":"application/json",...(init?.headers||{})},
    cache:"no-store"
   });
   if(response.status!==429)return response;
   const body=await response.clone().json().catch(()=>null) as {retry_after?:number;global?:boolean}|null;
   const header=Number(response.headers.get("retry-after"));
   const seconds=Number.isFinite(header)&&header>0?header:body?.retry_after;
   const wait=Math.min(60000,Math.max(1000,Number.isFinite(seconds)?Number(seconds)*1000:Math.pow(2,attempt)*1500));
   discordCooldownUntil=Math.max(discordCooldownUntil,Date.now()+wait);
   console.warn("DISCORD_RATE_LIMIT",{attempt:attempt+1,delayMs:wait,global:body?.global===true});
   if(attempt===3)return response;
  }
  throw new Error("Discord retry limit reached");
 }finally{release()}
}
export async function getGuildRoles():Promise<DiscordGuildRole[]>{
 if(rolesCache&&rolesCache.until>Date.now())return rolesCache.value;
 const response=await discord("/guilds/"+guild()+"/roles");
 if(!response.ok)throw new Error("Discord roles failed: "+response.status);
 const roles=(await response.json() as DiscordGuildRole[])
  .filter(role=>role.name!=="@everyone")
  .sort((a,b)=>b.position-a.position);
 rolesCache={until:Date.now()+300000,value:roles};
 return roles;
}
export async function getGuildMember(discordId:string):Promise<DiscordGuildMember|null>{
 const cached=memberCache.get(discordId);
 if(cached&&cached.until>Date.now())return cached.value;
 const inflight=pending.get(discordId);
 if(inflight)return inflight;
 const job=(async()=>{
  const response=await discord("/guilds/"+guild()+"/members/"+discordId);
  if(response.status===404){
   memberCache.set(discordId,{until:Date.now()+10000,value:null});
   return null;
  }
  if(!response.ok)throw new Error("Discord member failed: "+response.status);
  const member=await response.json() as DiscordGuildMember;
  memberCache.set(discordId,{until:Date.now()+300000,value:member});
  if(memberCache.size>5000)memberCache.clear();
  return member;
 })();
 pending.set(discordId,job);
 try{return await job}finally{pending.delete(discordId)}
}
export async function resolveAccess(discordId:string){
 const member=await getGuildMember(discordId);
 if(!member)return {member:false,roles:[],appRoles:[] as string[],username:null,nickname:null};
 const mappings=await prisma.discordRoleMapping.findMany({where:{discordRoleId:{in:member.roles},syncEnabled:true}});
 return {member:true,roles:member.roles,appRoles:[...new Set(mappings.map(x=>x.appRole))],username:member.user.username,nickname:member.nick};
}

export async function changeDiscordRank(discordId:string,fromRoleId:string|null,toRoleId:string){
 if(!guild()||!token())throw new Error("Discord bot not configured");
 const [roles,member]=await Promise.all([getGuildRoles(),getGuildMember(discordId)]);
 if(!member)throw new Error("Officer is not in the Discord server");
 const target=roles.find(r=>r.id===toRoleId);
 if(!target||target.managed)throw new Error("Target rank role is unavailable");
 const rankMappings=await prisma.rank.findMany({where:{discordRoleId:{not:null}},select:{discordRoleId:true}});
 const currentRankRoles=rankMappings.map(r=>r.discordRoleId).filter((id):id is string=>!!id&&id!==toRoleId&&member.roles.includes(id));
 if(!member.roles.includes(toRoleId)){
  const added=await discord("/guilds/"+guild()+"/members/"+discordId+"/roles/"+toRoleId,{method:"PUT"});
  if(!added.ok)throw new Error("Discord could not assign the new rank (HTTP "+added.status+")");
 }
 for(const oldRoleId of currentRankRoles){
  const removed=await discord("/guilds/"+guild()+"/members/"+discordId+"/roles/"+oldRoleId,{method:"DELETE"});
  if(!removed.ok)throw new Error("New rank assigned, but old rank "+oldRoleId+" could not be removed (HTTP "+removed.status+"). Reconcile in Discord and retry.");
 }
 memberCache.delete(discordId);
 rolesCache=null;
 return {added:!member.roles.includes(toRoleId),removed:currentRankRoles.length>0};
}

export async function changeDiscordCallsign(discordId:string,callsign:string){
 if(!/^[A-Za-z0-9][A-Za-z0-9-]{1,14}$/.test(callsign))throw new Error("Callsign must be 2–15 letters, numbers or hyphens.");
 const member=await getGuildMember(discordId);
 if(!member)throw new Error("Officer is not in the department Discord server.");
 const oldNickname=member.nick;
 if(!oldNickname)throw new Error("Officer needs a server nickname in Callsign | Title | Name format.");
 const parts=oldNickname.split("|").map(p=>p.trim());
 if(parts.length<2||parts.some(p=>!p))throw new Error("Officer nickname must use Callsign | Title | Name format.");
 const nickname=[callsign,...parts.slice(1)].join(" | ");
 if(nickname.length>32)throw new Error("New Discord nickname exceeds 32 characters.");
 const response=await discord("/guilds/"+guild()+"/members/"+discordId,{method:"PATCH",body:JSON.stringify({nick:nickname})});
 if(!response.ok)throw new Error("Discord nickname update failed (HTTP "+response.status+"). Check Manage Nicknames permission and bot role hierarchy.");
 memberCache.delete(discordId);
 return {oldNickname,nickname};
}

export async function setDiscordNickname(discordId:string,nickname:string){
 if(!nickname||nickname.length>32)throw new Error("Discord nickname must be 1–32 characters.");
 const member=await getGuildMember(discordId);
 if(!member)throw new Error("Officer is not in the department Discord server.");
 const response=await discord("/guilds/"+guild()+"/members/"+discordId,{method:"PATCH",body:JSON.stringify({nick:nickname})});
 if(!response.ok)throw new Error("Discord nickname update failed (HTTP "+response.status+"). Check Manage Nicknames permission and bot role hierarchy.");
 memberCache.delete(discordId);
 return {oldNickname:member.nick,nickname};
}
