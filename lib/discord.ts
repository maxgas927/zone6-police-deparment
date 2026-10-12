import {prisma} from "@/lib/prisma";
export type DiscordGuildRole={id:string;name:string;position:number;managed:boolean};
export type DiscordGuildMember={roles:string[];nick:string|null;user:{id:string;username:string}};
const guild=()=>process.env.DISCORD_GUILD_ID;
const token=()=>process.env.DISCORD_BOT_TOKEN;
const memberCache=new Map<string,{until:number;value:DiscordGuildMember|null}>();
const pending=new Map<string,Promise<DiscordGuildMember|null>>();
async function discord(path:string,init?:RequestInit){
 if(!guild()||!token())throw new Error("Discord is not configured");
 for(let attempt=0;attempt<3;attempt++){
  const response=await fetch("https://discord.com/api/v10"+path,{
   ...init,
   headers:{Authorization:"Bot "+token(),"Content-Type":"application/json",...(init?.headers||{})},
   cache:"no-store"
  });
  if(response.status!==429||attempt===2)return response;
  const retry=Number(response.headers.get("retry-after")||"1");
  const wait=Math.min(3000,Math.max(500,Number.isFinite(retry)?retry*1000:1000));
  console.warn("DISCORD_RATE_LIMIT_RETRY",{attempt:attempt+1,delayMs:wait});
  await new Promise(resolve=>setTimeout(resolve,wait));
 }
 throw new Error("Discord request retry limit reached");
}
export async function getGuildRoles():Promise<DiscordGuildRole[]>{
 const response=await discord("/guilds/"+guild()+"/roles");
 if(!response.ok)throw new Error("Discord roles failed: "+response.status);
 return (await response.json() as DiscordGuildRole[])
  .filter(role=>role.name!=="@everyone")
  .sort((a,b)=>b.position-a.position);
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
  memberCache.set(discordId,{until:Date.now()+12000,value:member});
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
 const current=fromRoleId&&member.roles.includes(fromRoleId)?fromRoleId:null;
 if(!member.roles.includes(toRoleId)){
  const added=await discord("/guilds/"+guild()+"/members/"+discordId+"/roles/"+toRoleId,{method:"PUT"});
  if(!added.ok)throw new Error("Discord could not assign the new rank (HTTP "+added.status+")");
 }
 if(current&&current!==toRoleId){
  const removed=await discord("/guilds/"+guild()+"/members/"+discordId+"/roles/"+current,{method:"DELETE"});
  if(!removed.ok)throw new Error("New rank assigned, but old rank could not be removed. Manual Discord reconciliation required (HTTP "+removed.status+").");
 }
 memberCache.delete(discordId);
 return {added:!member.roles.includes(toRoleId),removed:!!current&&current!==toRoleId};
}
