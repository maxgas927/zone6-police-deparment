import {NextResponse} from "next/server";
import {fullDepartmentDiscordSync} from "@/lib/full-discord-sync";

export const dynamic="force-dynamic";

export async function POST(req:Request){
  const secret=process.env.Z6PD_SYNC_CRON_SECRET;
  const authorization=req.headers.get("authorization");

  if(!secret||authorization!=="Bearer "+secret){
    return NextResponse.json({error:"Unauthorized"},{status:401});
  }

  const result=await fullDepartmentDiscordSync();
  if(result.failed>0)console.error("SCHEDULED_DISCORD_SYNC_PARTIAL_FAILURE",result);
  return NextResponse.json({ok:true,...result});
}
