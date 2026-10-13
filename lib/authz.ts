import {auth} from "@/auth";
import {prisma} from "@/lib/prisma";
import {resolveAccess} from "@/lib/discord";
import {syncOfficerFromDiscordData} from "@/lib/discord-sync";
import {type Permission} from "@/lib/permissions";
import {hasEffectivePermission} from "@/lib/effective-permissions";

const syncCache=new Map<string,number>();
export async function currentAccess(){
  const session=await auth();
  if(!session?.user?.email)return null;

  const user=await prisma.user.findUnique({
    where:{email:session.user.email},
    include:{accounts:true}
  });
  if(!user)return null;

  const account=user.accounts.find(item=>item.provider==="discord");
  if(!account)return null;

  try{
    const access=await resolveAccess(account.providerAccountId);

    if(!access.member){
      return {
        session,
        user,
        discordId:account.providerAccountId,
        ...access,
        personnelSyncChanged:false,
        personnelFileCreated:false
      };
    }

    // Personnel sync failures must not revoke valid Discord role-based access.
    try{
      if((syncCache.get(user.id)||0)>Date.now())return {session,user,discordId:account.providerAccountId,...access,personnelSyncChanged:false,personnelFileCreated:false};
      const personnelSync=await syncOfficerFromDiscordData(
        user.id,
        access.roles,
        access.nickname
      );
      syncCache.set(user.id,Date.now()+300000);
      if(syncCache.size>5000)syncCache.clear();
      return {
        session,user,discordId:account.providerAccountId,...access,
        personnelSyncChanged:personnelSync.changed,
        personnelFileCreated:personnelSync.created===true
      };
    }catch(error){
      console.error("PERSONNEL_SYNC_FAILED_ACCESS_PRESERVED",error);
      return {
        session,user,discordId:account.providerAccountId,...access,
        personnelSyncChanged:false,
        personnelFileCreated:false,
        personnelSyncError:true
      };
    }
  }catch(error){
    console.error("DISCORD_ACCESS_CHECK_FAILED",error);
    return {
      session,
      user,
      discordId:account.providerAccountId,
      member:false,
      roles:[] as string[],
      appRoles:[] as string[],
      username:null,
      nickname:null,
      accessError:true,
      personnelSyncChanged:false,
      personnelFileCreated:false
    };
  }
}

export async function requirePermission(permission:Permission){
  const access=await currentAccess();
  if(!access?.member)return null;
  if(!(await hasEffectivePermission(access.appRoles,permission)))return null;
  return access;
}
