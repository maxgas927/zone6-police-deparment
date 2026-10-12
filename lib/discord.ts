import { prisma } from "@/lib/prisma";
export type DiscordGuildRole={id:string;name:string;position:number;managed:boolean};
export type DiscordGuildMember={roles:string[];user:{id:string;username:string}};
const guild=()=>process.env.DISCORD_GUILD_ID;
const token=()=>process.env.DISCORD_BOT_TOKEN;

async function discord(path:string,init?:RequestInit){
  if(!guild()||!token())throw new Error("Discord is not configured");
  return fetch(`https://discord.com/api/v10${path}`,{
    ...init,
    headers:{Authorization:`Bot ${token()}`,"Content-Type":"application/json",...(init?.headers||{})},
    cache:"no-store"
  });
}

export async function getGuildRoles():Promise<DiscordGuildRole[]>{
  const r=await discord(`/guilds/${guild()}/roles`);
  if(!r.ok)throw new Error(`Discord roles failed: ${r.status}`);
  return (await r.json()).filter((x:DiscordGuildRole)=>x.name!=="@everyone").sort((a:DiscordGuildRole,b:DiscordGuildRole)=>b.position-a.position);
}

export async function getGuildMember(discordId:string):Promise<DiscordGuildMember|null>{
  const r=await discord(`/guilds/${guild()}/members/${discordId}`);
  if(r.status===404)return null;
  if(!r.ok)throw new Error(`Discord member failed: ${r.status}`);
  return r.json() as Promise<DiscordGuildMember>;
}

export async function resolveAccess(discordId:string){
  const member=await getGuildMember(discordId);
  if(!member)return {member:false,roles:[],appRoles:[] as string[],username:null};
  const mappings=await prisma.discordRoleMapping.findMany({where:{discordRoleId:{in:member.roles},syncEnabled:true}});
  return {
    member:true,
    roles:member.roles,
    appRoles:[...new Set(mappings.map(m=>m.appRole))],
    username:member.user.username
  };
}
