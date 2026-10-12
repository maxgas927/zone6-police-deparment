import {NextResponse} from "next/server";
import {requirePermission} from "@/lib/authz";
import {getGuildRoles} from "@/lib/discord";

export const dynamic="force-dynamic";

export async function GET(){
  const a=await requirePermission("discord.manage");
  if(!a)return NextResponse.json({error:"Forbidden"},{status:403});
  try{
    return NextResponse.json({ok:true,roles:await getGuildRoles()});
  }catch(error){
    console.error("DISCORD_STATUS_FAILED",error);
    return NextResponse.json({ok:false,error:"Unable to reach Discord."},{status:502});
  }
}
