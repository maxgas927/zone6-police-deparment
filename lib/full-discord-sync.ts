import {prisma} from "@/lib/prisma";
import {syncOfficerFromDiscord} from "@/lib/discord-sync";

export async function fullDepartmentDiscordSync(){
  const users=await prisma.user.findMany({
    where:{accounts:{some:{provider:"discord"}}},
    include:{accounts:true}
  });

  let synced=0;
  let created=0;
  let changed=0;
  let missing=0;
  let skipped=0;
  let failed=0;

  for(const user of users){
    const discord=user.accounts.find(account=>account.provider==="discord");
    if(!discord)continue;

    try{
      const result=await syncOfficerFromDiscord(user.id,discord.providerAccountId);

      if(result.member) synced++;
      else missing++;

      if(result.created) created++;
      else if(result.changed) changed++;

      if(!result.officer&&"skippedReason" in result) skipped++;
    }catch(error){
      failed++;
      console.error("DISCORD_DEPARTMENT_SYNC_FAILED",user.id,error);
    }
  }

  return {
    total:users.length,
    synced,
    created,
    changed,
    missing,
    skipped,
    failed
  };
}
