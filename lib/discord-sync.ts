import {prisma} from "@/lib/prisma";
import {getGuildMember} from "@/lib/discord";

export function parsePersonnelNickname(nickname:string|null|undefined){
  if(!nickname)return null;
  const parts=nickname.split("|").map(part=>part.trim()).filter(Boolean);
  if(parts.length<2)return null;

  const callsign=parts[0];
  const name=parts[parts.length-1];
  if(!callsign||!name)return null;

  return {
    callsign,
    name,
    title:parts.length>=3?parts.slice(1,-1).join(" | "):null
  };
}

export async function getDiscordRankForRoles(roles:string[]){
  if(!roles.length)return null;
  return prisma.rank.findFirst({
    where:{discordRoleId:{in:roles}},
    orderBy:[{priority:"desc"},{name:"asc"}]
  });
}

export async function syncOfficerFromDiscordData(
  userId:string,
  roles:string[],
  nickname:string|null|undefined
){
  const nextRank=await getDiscordRankForRoles(roles);
  const identity=parsePersonnelNickname(nickname);
  const officer=await prisma.officer.findUnique({
    where:{userId},
    include:{rank:true,user:true}
  });

  if(!officer){
    return {
      officer:false,
      rank:nextRank?.name||null,
      callsign:identity?.callsign||null,
      name:identity?.name||null,
      changed:false,
      rankChanged:false,
      callsignChanged:false,
      nameChanged:false
    };
  }

  const nextRankId=nextRank?.id||null;
  const nextCallsign=identity?.callsign??officer.callsign;
  const nextName=identity?.name??officer.user.name;

  const rankChanged=officer.rankId!==nextRankId;
  const callsignChanged=officer.callsign!==nextCallsign;
  const nameChanged=officer.user.name!==nextName;

  if(!rankChanged&&!callsignChanged&&!nameChanged){
    return {
      officer:true,
      rank:nextRank?.name||null,
      callsign:nextCallsign,
      name:nextName,
      changed:false,
      rankChanged:false,
      callsignChanged:false,
      nameChanged:false
    };
  }

  await prisma.$transaction(async tx=>{
    await tx.officer.update({
      where:{id:officer.id},
      data:{rankId:nextRankId,callsign:nextCallsign}
    });

    if(nameChanged){
      await tx.user.update({
        where:{id:userId},
        data:{name:nextName}
      });
    }

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
          nickname:nickname||null,
          rankChanged,
          callsignChanged,
          nameChanged,
          fromRank:officer.rank?.name||null,
          toRank:nextRank?.name||null,
          fromCallsign:officer.callsign,
          toCallsign:nextCallsign,
          fromName:officer.user.name,
          toName:nextName,
          discordRoleId:nextRank?.discordRoleId||null
        }
      }
    });
  });

  return {
    officer:true,
    rank:nextRank?.name||null,
    callsign:nextCallsign,
    name:nextName,
    changed:true,
    rankChanged,
    callsignChanged,
    nameChanged
  };
}

export async function syncOfficerFromDiscord(userId:string,discordId:string){
  const member=await getGuildMember(discordId);
  if(!member){
    const result=await syncOfficerFromDiscordData(userId,[],null);
    return {member:false,...result};
  }

  const result=await syncOfficerFromDiscordData(userId,member.roles,member.nick);
  return {member:true,...result};
}
