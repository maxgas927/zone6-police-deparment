export const dynamic="force-dynamic";
import {prisma} from "@/lib/prisma";
import {NextResponse} from "next/server";
import {requirePermission} from "@/lib/authz";
import {getGuildRoles} from "@/lib/discord";

export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
  const a=await requirePermission("admin.manage");
  if(!a)return NextResponse.json({error:"Forbidden"},{status:403});

  const {id}=await params;
  const b=await req.json();
  const name=String(b.name||"").trim();
  const discordRoleId=b.discordRoleId?String(b.discordRoleId):null;
  if(!name)return NextResponse.json({error:"Rank name is required."},{status:400});

  if(discordRoleId){
    const roles=await getGuildRoles();
    if(!roles.some(role=>role.id===discordRoleId))return NextResponse.json({error:"Select a valid Discord role."},{status:400});
  }

  try{
    const rank=await prisma.rank.update({where:{id},data:{name,priority:Number(b.priority||0),discordRoleId}});
    await prisma.auditLog.create({data:{actorId:a.user.id,action:"RANK_UPDATED",entity:"Rank",entityId:id,metadata:{discordRoleId}}});
    return NextResponse.json(rank);
  }catch{
    return NextResponse.json({error:"Could not update rank. Rank names and Discord role mappings must be unique."},{status:409});
  }
}
