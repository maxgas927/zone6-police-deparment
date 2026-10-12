import {Prisma} from "@prisma/client";
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

async function generateUniqueBadgeNumber(){
  for(let attempt=0;attempt<50;attempt++){
    const badge=String(Math.floor(10000+Math.random()*90000));
    const exists=await prisma.officer.findUnique({
      where:{badgeNumber:badge},
      select:{id:true}
    });
    if(!exists)return badge;
  }
  throw new Error("Unable to generate a unique badge number.");
}

async function createOfficerFromDiscordData(
  userId:string,
  roles:string[],
  nickname:string
){
  const identity=parsePersonnelNickname(nickname);
  if(!identity){
    return {
      officer:false,
      created:false,
      changed:false,
      skippedReason:"INVALID_NICKNAME" as const
    };
  }

  const [nextRank,badgeNumber]=await Promise.all([
    getDiscordRankForRoles(roles),
    generateUniqueBadgeNumber()
  ]);

  try{
    const officer=await prisma.$transaction(async tx=>{
      await tx.user.update({
        where:{id:userId},
        data:{name:identity.name}
      });

      const created=await tx.officer.create({
        data:{
          userId,
          badgeNumber,
          callsign:identity.callsign,
          rankId:nextRank?.id||null
        }
      });

      if(nextRank){
        await tx.promotionHistory.create({
          data:{
            officerId:created.id,
            fromRank:null,
            toRank:nextRank.name,
            reason:"Initial Discord rank assignment",
            approvedBy:"DISCORD_SYNC"
          }
        });
      }

      await tx.auditLog.create({
        data:{
          actorId:userId,
          action:"PERSONNEL_AUTO_CREATED",
          entity:"Officer",
          entityId:created.id,
          metadata:{
            badgeNumber,
            badgeSource:"AUTO_GENERATED_5_DIGIT",
            callsign:identity.callsign,
            name:identity.name,
            nickname,
            rank:nextRank?.name||null,
            source:"DISCORD_JOIN_SYNC"
          }
        }
      });

      return created;
    });

    return {
      officer:true,
      officerId:officer.id,
      created:true,
      changed:true,
      rank:nextRank?.name||null,
      callsign:identity.callsign,
      name:identity.name,
      badgeNumber
    };
  }catch(error){
    if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002"){
      const existing=await prisma.officer.findUnique({where:{userId}});
      if(existing){
        return {
          officer:true,
          officerId:existing.id,
          created:false,
          changed:false
        };
      }
    }
    throw error;
  }
}

export async function syncOfficerFromDiscordData(
  userId:string,
  roles:string[],
  nickname:string|null|undefined
){
  const officer=await prisma.officer.findUnique({
    where:{userId},
    include:{rank:true,user:true}
  });

  if(!officer){
    if(!nickname){
      return {
        officer:false,
        created:false,
        changed:false,
        skippedReason:"NO_NICKNAME" as const
      };
    }
    return createOfficerFromDiscordData(userId,roles,nickname);
  }

  const nextRank=await getDiscordRankForRoles(roles);
  const identity=parsePersonnelNickname(nickname);

  const nextRankId=nextRank?.id||null;
  const nextCallsign=identity?.callsign??officer.callsign;
  const nextName=identity?.name??officer.user.name;

  const rankChanged=officer.rankId!==nextRankId;
  const callsignChanged=officer.callsign!==nextCallsign;
  const nameChanged=officer.user.name!==nextName;

  if(!rankChanged&&!callsignChanged&&!nameChanged){
    return {
      officer:true,
      officerId:officer.id,
      created:false,
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
    officerId:officer.id,
    created:false,
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
