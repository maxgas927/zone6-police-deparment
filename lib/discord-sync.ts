import {prisma} from "@/lib/prisma";
import {getGuildMember} from "@/lib/discord";

export async function getDiscordRankForRoles(roles:string[]){
  if(!roles.length)return null;
  return prisma.rank.findFirst({where:{discordRoleId:{in:roles}},orderBy:[{priority:"desc"},{name:"asc"}]});
}

export async function syncOfficerRankFromRoles(userId:string,roles:string[]){
  const nextRank=await getDiscordRankForRoles(roles);
  const officer=await prisma.officer.findUnique({where:{userId},include:{rank:true}});
  if(!officer)return {officer:false,rank:nextRank?.name||null,changed:false};
  const nextRankId=nextRank?.id||null;
  if(officer.rankId===nextRankId)return {officer:true,rank:nextRank?.name||null,changed:false};

  await prisma.$transaction(async tx=>{
    await tx.officer.update({where:{id:officer.id},data:{rankId:nextRankId}});
    await tx.promotionHistory.create({data:{officerId:officer.id,fromRank:officer.rank?.name||null,toRank:nextRank?.name||"Unassigned",reason:"Automatic Discord rank sync",approvedBy:"DISCORD_SYNC"}});
    await tx.auditLog.create({data:{actorId:userId,action:"DISCORD_RANK_SYNC",entity:"Officer",entityId:officer.id,metadata:{fromRank:officer.rank?.name||null,toRank:nextRank?.name||null,discordRoleId:nextRank?.discordRoleId||null}}});
  });
  return {officer:true,rank:nextRank?.name||null,changed:true};
}

export async function syncOfficerFromDiscord(userId:string,discordId:string){
  const member=await getGuildMember(discordId);
  if(!member)return {member:false,rank:null,changed:false};
  const result=await syncOfficerRankFromRoles(userId,member.roles);
  return {member:true,rank:result.rank,changed:result.changed};
}
