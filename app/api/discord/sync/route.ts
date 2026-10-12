export const dynamic="force-dynamic";
import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {requirePermission} from "@/lib/authz";
import {syncOfficerFromDiscord} from "@/lib/discord-sync";

export async function POST(){
  const a=await requirePermission("discord.manage");
  if(!a)return NextResponse.json({error:"Forbidden"},{status:403});

  const users=await prisma.user.findMany({where:{officer:{isNot:null},accounts:{some:{provider:"discord"}}},include:{accounts:true}});
  let synced=0,missing=0,failed=0,changed=0;

  for(const u of users){
    const d=u.accounts.find(x=>x.provider==="discord");
    if(!d)continue;
    try{
      const r=await syncOfficerFromDiscord(u.id,d.providerAccountId);
      if(r.member){synced++;if(r.changed)changed++}else{missing++}
    }catch(error){
      failed++;
      console.error("DISCORD_PERSONNEL_SYNC_FAILED",u.id,error);
    }
  }

  await prisma.auditLog.create({data:{actorId:a.user.id,action:"DISCORD_PERSONNEL_SYNC",entity:"Discord",metadata:{synced,changed,missing,failed}}});
  return NextResponse.json({synced,changed,missing,failed});
}
