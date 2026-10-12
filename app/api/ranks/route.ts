export const dynamic="force-dynamic";
import {prisma} from "@/lib/prisma";
import {NextResponse} from "next/server";
import {requirePermission} from "@/lib/authz";
import {getGuildRoles} from "@/lib/discord";

export async function GET(){
  const a=await requirePermission("personnel.read");
  if(!a)return NextResponse.json({error:"Forbidden"},{status:403});
  return NextResponse.json(await prisma.rank.findMany({orderBy:{priority:"desc"}}));
}

export async function POST(req:Request){
  const a=await requirePermission("admin.manage");
  if(!a)return NextResponse.json({error:"Forbidden"},{status:403});
  const b=await req.json();
  const name=String(b.name||"").trim();
  const discordRoleId=b.discordRoleId?String(b.discordRoleId):null;
  if(!name)return NextResponse.json({error:"name required"},{status:400});

  if(discordRoleId){
    const roles=await getGuildRoles();
    if(!roles.some(role=>role.id===discordRoleId))return NextResponse.json({error:"Select a valid Discord role."},{status:400});
  }

  try{
    const rank=await prisma.rank.create({data:{name,priority:Number(b.priority||0),discordRoleId}});
    await prisma.auditLog.create({data:{actorId:a.user.id,action:"RANK_CREATED",entity:"Rank",entityId:rank.id,metadata:{discordRoleId}}});
    return NextResponse.json(rank,{status:201});
  }catch{
    return NextResponse.json({error:"Could not create rank. Rank names and Discord role mappings must be unique."},{status:409});
  }
}
