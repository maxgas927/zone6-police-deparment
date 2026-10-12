import {prisma} from "@/lib/prisma";
import {syncOfficerFromDiscord} from "@/lib/discord-sync";

export async function fullDepartmentDiscordSync(){
  const users=await prisma.user.findMany({
    where:{officer:{isNot:null},accounts:{some:{provider:"discord"}}},
    include:{accounts:true}
  });

  let synced=0,missing=0,failed=0,changed=0;

  for(const user of users){
    const discord=user.accounts.find(account=>account.provider==="discord");
    if(!discord)continue;

    try{
      const result=await syncOfficerFromDiscord(user.id,discord.providerAccountId);
      if(result.changed)changed++;
      if(result.member)synced++;
      else missing++;
    }catch(error){
      failed++;
      console.error("DISCORD_DEPARTMENT_SYNC_FAILED",user.id,error);
    }
  }

  return {total:users.length,synced,changed,missing,failed};
}
