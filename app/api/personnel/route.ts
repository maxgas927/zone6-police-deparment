export const dynamic="force-dynamic";
import {randomInt} from "node:crypto";
import {prisma} from "@/lib/prisma";
import {NextResponse} from "next/server";
import {requirePermission} from "@/lib/authz";
import {getGuildMember} from "@/lib/discord";
import {getDiscordRankForRoles,parsePersonnelNickname} from "@/lib/discord-sync";

async function generateBadgeNumber(){
  for(let attempt=0;attempt<50;attempt++){
    const badge=String(randomInt(10000,100000));
    const exists=await prisma.officer.findUnique({where:{badgeNumber:badge},select:{id:true}});
    if(!exists)return badge;
  }
  throw new Error("Unable to generate a unique badge number.");
}

export async function GET(){
  const access=await requirePermission("personnel.read");
  if(!access)return NextResponse.json({error:"Forbidden"},{status:403});

  return NextResponse.json(
    await prisma.officer.findMany({
      include:{user:true,rank:true,division:true},
      orderBy:{badgeNumber:"asc"}
    })
  );
}

export async function POST(req:Request){
  const access=await requirePermission("personnel.manage");
  if(!access)return NextResponse.json({error:"Forbidden"},{status:403});

  try{
    const body=await req.json();
    if(!body.userId){
      return NextResponse.json(
        {error:"A Discord-linked user is required."},
        {status:400}
      );
    }

    const user=await prisma.user.findUnique({
      where:{id:String(body.userId)},
      include:{officer:true,accounts:true}
    });
    const discord=user?.accounts.find(account=>account.provider==="discord");

    if(!user||!discord){
      return NextResponse.json(
        {error:"Select a Discord-linked Z6PD user."},
        {status:400}
      );
    }

    if(user.officer){
      return NextResponse.json(
        {error:"That user already has a personnel record."},
        {status:409}
      );
    }

    const member=await getGuildMember(discord.providerAccountId);
    if(!member){
      return NextResponse.json(
        {error:"That user is not currently in the configured Discord server."},
        {status:400}
      );
    }

    const identity=parsePersonnelNickname(member.nick);
    if(!identity){
      return NextResponse.json(
        {error:"Set the Discord server nickname like: 1A-03 | Dept. Chief | Davion"},
        {status:400}
      );
    }

    const [discordRank,badgeNumber]=await Promise.all([
      getDiscordRankForRoles(member.roles),
      generateBadgeNumber()
    ]);

    const officer=await prisma.$transaction(async tx=>{
      await tx.user.update({
        where:{id:user.id},
        data:{name:identity.name}
      });

      return tx.officer.create({
        data:{
          userId:user.id,
          badgeNumber,
          callsign:identity.callsign,
          rankId:discordRank?.id||null,
          divisionId:body.divisionId?String(body.divisionId):null
        }
      });
    });

    if(discordRank){
      await prisma.promotionHistory.create({
        data:{
          officerId:officer.id,
          fromRank:null,
          toRank:discordRank.name,
          reason:"Initial Discord rank assignment",
          approvedBy:"DISCORD_SYNC"
        }
      });
    }

    await prisma.auditLog.create({
      data:{
        actorId:access.user.id,
        action:"PERSONNEL_CREATED",
        entity:"Officer",
        entityId:officer.id,
        metadata:{
          badgeNumber:officer.badgeNumber,
          badgeSource:"AUTO_GENERATED_5_DIGIT",
          callsign:officer.callsign,
          name:identity.name,
          discordNickname:member.nick,
          callsignSource:"DISCORD_SERVER_NICKNAME",
          nameSource:"DISCORD_SERVER_NICKNAME",
          rank:discordRank?.name||null,
          rankSource:"DISCORD_ROLE"
        }
      }
    });

    return NextResponse.json(officer,{status:201});
  }catch(error){
    console.error("PERSONNEL_CREATE_FAILED",error);
    return NextResponse.json(
      {error:"Could not create personnel record. Check Discord nickname format and try again."},
      {status:500}
    );
  }
}
