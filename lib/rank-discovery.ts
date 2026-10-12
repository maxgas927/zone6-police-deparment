import type {DiscordGuildRole} from "@/lib/discord";
const rankWords=/\b(chief|commissioner|deputy chief|assistant chief|colonel|lieutenant colonel|major|captain|lieutenant|sergeant|corporal|detective|senior officer|master officer|officer|trooper|deputy|cadet|recruit|probationary|commander|inspector|superintendent|constable)\b/i;
const exclude=/\b(bot|admin|administrator|moderator|staff|developer|support|civilian|visitor|guest|member|verified|notification|ping|division|department|dispatch|ems|fire|sheriff's office|sasp|lspd|bcso|swat|k9|traffic|training team|internal affairs|faction|donator|vip)\b/i;
export function discoverPoliceRanks(roles:DiscordGuildRole[]){
 return roles.filter(r=>!r.managed&&!exclude.test(r.name)&&rankWords.test(r.name)).sort((a,b)=>b.position-a.position);
}
