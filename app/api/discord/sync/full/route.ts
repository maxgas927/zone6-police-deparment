import {NextResponse} from "next/server";
import {fullDepartmentDiscordSync} from "@/lib/full-discord-sync";

export const dynamic="force-dynamic";

let lastRun=0;
let running=false;

export async function POST(req:Request){
  if(req.headers.get("x-z6pd-job")!=="department-discord-sync"){
    return NextResponse.json({error:"Unauthorized"},{status:401});
  }

  const now=Date.now();
  if(running||now-lastRun<50000){
    return NextResponse.json({ok:true,skipped:true},{status:202});
  }

  running=true;
  try{
    const result=await fullDepartmentDiscordSync();
    lastRun=Date.now();
    if(result.failed)console.error("SCHEDULED_DISCORD_SYNC_PARTIAL_FAILURE",result);
    return NextResponse.json({ok:true,skipped:false});
  }catch(error){
    console.error("SCHEDULED_DISCORD_SYNC_FAILED",error);
    return NextResponse.json({ok:false,error:"Sync failed"},{status:500});
  }finally{
    running=false;
  }
}
