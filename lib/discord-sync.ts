import {prisma} from "@/lib/prisma";
import {getGuildMember} from "@/lib/discord";

export async function getDiscordRankForRoles(roles:string[]){
  if(!roles.length)return null;
  return prisma.rank.findFirst({where:{discordRoleId:{in:roles}},orderBy:[{priority:"desc"},{name:"asc"}]});
}

export async function syncOfficerFromDiscordData(userId:string,roles:string[],username:string|null){
  const nextRank=await getDiscordRankForRoles(roles);
  const nextCallsign=username?.trim()||null;
  const officer=await prisma.officer.findUnique({where:{userId},include:{rank:true}});
  if(!officer)return {officer:false,rank:nextRank?.name||null,callsign:nextCallsign,changed:false,rankChanged:false,callsignChanged:false};

  const nextRankId=nextRank?.id||null;
  const rankChanged=officer.rankId!==nextRankId;
  const callsignChanged=officer.callsign!==nextCallsign;
  if(!rankChanged&&!callsignChanged){
    return {officer:true,rank:nextRank?.name||null,callsign:nextCallsign,changed:false,rankChanged:false,callsignChanged:false};
  }

  await prisma.$transaction(async tx=>{
    await tx.officer.update({where:{id:officer.id},data:{rankId:nextRankId,callsign:nextCallsign}});

    if(rankChanged){
      await tx.promotionHistory.create({
        data:{
          officerId:officer.id,
          fromRank:officer.rank?.name||null,
          toRank:nextRank?.name||"Unassigned",
          reason:"Automatic Discord rank sync",
          approvedBy:"DISCORD_SYNC"
        }
      });
    }

    await tx.auditLog.create({
      data:{
        actorId:userId,
        action:"DISCORD_PERSONNEL_SYNC",
        entity:"Officer",
        entityId:officer.id,
        metadata:{
          rankChanged,
          callsignChanged,
          fromRank:officer.rank?.name||null,
          toRank:nextRank?.name||null,
          fromCallsign:officer.callsign,
          toCallsign:nextCallsign,
          discordRoleId:nextRank?.discordRoleId||null
        }
      }
    });
  });

  return {officer:true,rank:nextRank?.name||null,callsign:nextCallsign,changed:true,rankChanged,callsignChanged};
}

export async function syncOfficerFromDiscord(userId:string,discordId:string){
  const member=await getGuildMember(discordId);
  if(!member){
    const result=await syncOfficerFromDiscordData(userId,[],null);
    return {member:false,...result};
  }
  const result=await syncOfficerFromDiscordData(userId,member.roles,member.user.username);
  return {member:true,...result};
}
