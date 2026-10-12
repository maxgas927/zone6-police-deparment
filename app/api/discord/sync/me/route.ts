import {NextResponse} from "next/server";
import {currentAccess} from "@/lib/authz";
import {effectiveMatrix} from "@/lib/effective-permissions";

export const dynamic="force-dynamic";

export async function GET(){
  const access=await currentAccess();
  if(!access)return NextResponse.json({error:"Unauthorized"},{status:401});

  const matrix=access.member?await effectiveMatrix():{};
  const granted=[...new Set(access.appRoles.flatMap(role=>matrix[role]||[]))];
  return NextResponse.json({
    ok:true,
    member:access.member,
    appRoles:access.appRoles,
    grantedPermissions:granted,
    personnelChanged:access.personnelSyncChanged,
    personnelFileCreated:access.personnelFileCreated,
    accessError:"accessError" in access?access.accessError:false
  });
}
