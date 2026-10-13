import {NextResponse} from "next/server";
import {requirePermission} from "@/lib/authz";
import {prisma} from "@/lib/prisma";
export const dynamic="force-dynamic";
export async function GET(){
 const access=await requirePermission("admin.manage");
 if(!access?.appRoles.includes("COMMAND"))return NextResponse.json({error:"Forbidden"},{status:403});
 const last=await prisma.auditLog.findFirst({where:{action:"DISCORD_DEPARTMENT_SYNC"},orderBy:{createdAt:"desc"},select:{createdAt:true,metadata:true}});
 return NextResponse.json({
  configured:Boolean(process.env.DISCORD_BOT_TOKEN&&process.env.DISCORD_GUILD_ID&&process.env.DISCORD_CLIENT_ID),
  lastManualSync:last?{at:last.createdAt,result:last.metadata}:null,
  lastAutomaticSyncAt:globalThis.__z6pdLastDepartmentDiscordSyncAt||null,
  nextAutomaticSyncAt:globalThis.__z6pdNextDepartmentDiscordSyncAt||null,
  checkedAt:new Date().toISOString()
 },{headers:{"Cache-Control":"no-store"}});
}
