import {createHash,timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {fullDepartmentDiscordSync} from "@/lib/full-discord-sync";

export const dynamic="force-dynamic";
const EXPECTED_HASH="016c1ce616f2192abf16c698ee72e15498b8caa46972b4ca3ffa693351e8edd7";

function authorized(req:Request){
  const auth=req.headers.get("authorization")||"";
  if(!auth.startsWith("Bearer "))return false;
  const supplied=auth.slice(7);
  const digest=createHash("sha256").update(supplied).digest("hex");
  return timingSafeEqual(Buffer.from(digest),Buffer.from(EXPECTED_HASH));
}

export async function POST(req:Request){
  if(!authorized(req))return NextResponse.json({error:"Unauthorized"},{status:401});
  const result=await fullDepartmentDiscordSync();
  if(result.failed>0)console.error("SCHEDULED_DISCORD_SYNC_PARTIAL_FAILURE",result);
  return NextResponse.json({ok:true,...result});
}
