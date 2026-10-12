export const dynamic="force-dynamic";
import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {requirePermission} from "@/lib/authz";
import {fullDepartmentDiscordSync} from "@/lib/full-discord-sync";

export async function POST(){
  const access=await requirePermission("discord.manage");
  if(!access)return NextResponse.json({error:"Forbidden"},{status:403});

  const result=await fullDepartmentDiscordSync();
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
