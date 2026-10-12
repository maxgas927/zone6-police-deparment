import {NextResponse} from "next/server";
import {requirePermission} from "@/lib/authz";

export const dynamic="force-dynamic";

declare global {
  var __z6pdLastDepartmentDiscordSyncAt: number | undefined;
  var __z6pdNextDepartmentDiscordSyncAt: number | undefined;
}

export async function GET(){
  const access=await requirePermission("discord.manage");
  if(!access)return NextResponse.json({error:"Forbidden"},{status:403});

  return NextResponse.json({
    ok:true,
    now:Date.now(),
    lastRunAt:globalThis.__z6pdLastDepartmentDiscordSyncAt||null,
    nextRunAt:globalThis.__z6pdNextDepartmentDiscordSyncAt||null,
    intervalSeconds:60
  });
}
