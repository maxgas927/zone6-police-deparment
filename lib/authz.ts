import {auth} from "@/auth";
import {prisma} from "@/lib/prisma";
import {resolveAccess} from "@/lib/discord";
import {syncOfficerFromDiscordData} from "@/lib/discord-sync";
import {can,type Permission} from "@/lib/permissions";

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
        personnelSyncChanged:false
      };
    }

    const personnelSync=await syncOfficerFromDiscordData(
      user.id,
      access.roles,
      access.nickname
    );

    return {
      session,
      user,
      discordId:account.providerAccountId,
      ...access,
      personnelSyncChanged:personnelSync.changed
    };
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
      personnelSyncChanged:false
    };
  }
}

export async function requirePermission(permission:Permission){
  const access=await currentAccess();
  if(!access?.member)return null;
  if(!access.appRoles.some(role=>can(role,permission)))return null;
  return access;
}
