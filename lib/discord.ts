import {prisma} from "@/lib/prisma";

export type DiscordGuildRole={id:string;name:string;position:number;managed:boolean};
export type DiscordGuildMember={
  roles:string[];
  nick:string|null;
  user:{id:string;username:string};
};

const guild=()=>process.env.DISCORD_GUILD_ID;
const token=()=>process.env.DISCORD_BOT_TOKEN;

async function discord(path:string,init?:RequestInit){
  if(!guild()||!token())throw new Error("Discord is not configured");
  return fetch(`https://discord.com/api/v10${path}`,{
    ...init,
    headers:{
      Authorization:`Bot ${token()}`,
      "Content-Type":"application/json",
      ...(init?.headers||{})
    },
    cache:"no-store"
  });
}

export async function getGuildRoles():Promise<DiscordGuildRole[]>{
  const response=await discord(`/guilds/${guild()}/roles`);
  if(!response.ok)throw new Error(`Discord roles failed: ${response.status}`);
  return (await response.json())
    .filter((role:DiscordGuildRole)=>role.name!=="@everyone")
    .sort((a:DiscordGuildRole,b:DiscordGuildRole)=>b.position-a.position);
}

export async function getGuildMember(discordId:string):Promise<DiscordGuildMember|null>{
  const response=await discord(`/guilds/${guild()}/members/${discordId}`);
  if(response.status===404)return null;
  if(!response.ok)throw new Error(`Discord member failed: ${response.status}`);
  return response.json() as Promise<DiscordGuildMember>;
}

export async function resolveAccess(discordId:string){
  const member=await getGuildMember(discordId);
  if(!member){
    return {
      member:false,
      roles:[],
      appRoles:[] as string[],
      username:null,
      nickname:null
    };
  }

  const mappings=await prisma.discordRoleMapping.findMany({
    where:{discordRoleId:{in:member.roles},syncEnabled:true}
  });

  return {
    member:true,
    roles:member.roles,
    appRoles:[...new Set(mappings.map(mapping=>mapping.appRole))],
    username:member.user.username,
    nickname:member.nick
  };
}
