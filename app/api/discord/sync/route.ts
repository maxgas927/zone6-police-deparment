export const dynamic="force-dynamic";
import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {requirePermission} from "@/lib/authz";
import {fullDepartmentDiscordSync} from "@/lib/full-discord-sync";

export async function POST(){
  const access=await requirePermission("discord.manage");
  if(!access)return NextResponse.json({error:"Forbidden"},{status:403});

  let result;
  try{result=await fullDepartmentDiscordSync();}
  catch(error){
    await prisma.auditLog.create({data:{actorId:access.user.id,action:"DISCORD_DEPARTMENT_SYNC_FAILED",entity:"Discord",metadata:{source:"MANUAL",error:error instanceof Error?error.message:"Unknown error"}}});
    return NextResponse.json({error:"Discord synchronization failed. Review audit logs."},{status:503});
  }
  await prisma.auditLog.create({
    data:{
      actorId:access.user.id,
      action:"DISCORD_DEPARTMENT_SYNC",
      entity:"Discord",
      metadata:{...result,source:"MANUAL"}
    }
  });

  return NextResponse.json(result);
}
