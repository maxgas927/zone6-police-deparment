import {NextResponse} from "next/server";
import {currentAccess} from "@/lib/authz";

export const dynamic="force-dynamic";

export async function GET(){
  const access=await currentAccess();
  if(!access)return NextResponse.json({error:"Unauthorized"},{status:401});

  return NextResponse.json({
    ok:true,
    member:access.member,
    appRoles:access.appRoles,
    personnelChanged:access.personnelSyncChanged,
    accessError:"accessError" in access?access.accessError:false
  });
}
