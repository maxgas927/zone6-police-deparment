export const dynamic="force-dynamic";
import {prisma} from "@/lib/prisma";
import {NextResponse} from "next/server";
import {requirePermission} from "@/lib/authz";
import {getGuildMember} from "@/lib/discord";
import {getDiscordRankForRoles} from "@/lib/discord-sync";

export async function GET(){
  const a=await requirePermission("personnel.read");
  if(!a)return NextResponse.json({error:"Forbidden"},{status:403});
  return NextResponse.json(await prisma.officer.findMany({include:{user:true,rank:true,division:true},orderBy:{badgeNumber:"asc"}}));
}

export async function POST(req:Request){
  const a=await requirePermission("personnel.manage");
  if(!a)return NextResponse.json({error:"Forbidden"},{status:403});
  try{
    const b=await req.json();
    if(!b.userId||!b.badgeNumber)return NextResponse.json({error:"User and badge number are required."},{status:400});
    const user=await prisma.user.findUnique({where:{id:String(b.userId)},include:{officer:true,accounts:true}});
    const discord=user?.accounts.find(x=>x.provider==="discord");
    if(!user||!discord)return NextResponse.json({error:"Select a Discord-linked Z6PD user."},{status:400});
    if(user.officer)return NextResponse.json({error:"That user already has a personnel record."},{status:409});

    const member=await getGuildMember(discord.providerAccountId);
    if(!member)return NextResponse.json({error:"That user is not currently in the configured Discord server."},{status:400});
    const discordRank=await getDiscordRankForRoles(member.roles);

    const officer=await prisma.officer.create({data:{userId:user.id,badgeNumber:String(b.badgeNumber).trim(),callsign:b.callsign?String(b.callsign).trim():null,rankId:discordRank?.id||null,divisionId:b.divisionId?String(b.divisionId):null}});
    if(discordRank)await prisma.promotionHistory.create({data:{officerId:officer.id,fromRank:null,toRank:discordRank.name,reason:"Initial Discord rank assignment",approvedBy:"DISCORD_SYNC"}});
    await prisma.auditLog.create({data:{actorId:a.user.id,action:"PERSONNEL_CREATED",entity:"Officer",entityId:officer.id,metadata:{badgeNumber:officer.badgeNumber,callsign:officer.callsign,rank:discordRank?.name||null,rankSource:"DISCORD"}}});
    return NextResponse.json(officer,{status:201});
  }catch(error){
    console.error("PERSONNEL_CREATE_FAILED",error);
    return NextResponse.json({error:"Could not create personnel record. Check Discord availability and badge/callsign uniqueness."},{status:500});
  }
}
