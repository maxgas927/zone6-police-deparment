export const dynamic="force-dynamic";
import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {requirePermission} from "@/lib/authz";
import {permissions,rolePermissions} from "@/lib/permissions";
import {editableRoles,effectiveMatrix} from "@/lib/effective-permissions";
export async function GET(){
 const a=await requirePermission("admin.manage");
 if(!a||!a.appRoles.includes("COMMAND"))return NextResponse.json({error:"Command only"},{status:403});
 return NextResponse.json({matrix:await effectiveMatrix(),roles:editableRoles,permissions});
}
export async function PUT(req:Request){
 const a=await requirePermission("admin.manage");
 if(!a||!a.appRoles.includes("COMMAND"))return NextResponse.json({error:"Command only"},{status:403});
 const b=await req.json().catch(()=>null);
 const role=b?.role,permission=b?.permission,allowed=b?.allowed;
 if(!editableRoles.some(x=>x===role)||!permissions.some(x=>x===permission)||typeof allowed!=="boolean")return NextResponse.json({error:"Invalid role or permission"},{status:400});
 if(role==="COMMAND")return NextResponse.json({error:"Command permissions are protected and cannot be changed"},{status:403});
 await prisma.$transaction(async tx=>{
  await tx.rolePermissionOverride.upsert({where:{appRole_permission:{appRole:role,permission}},create:{appRole:role,permission,allowed,updatedBy:a.user.id},update:{allowed,updatedBy:a.user.id}});
  await tx.auditLog.create({data:{actorId:a.user.id,action:"PERMISSION_MATRIX_UPDATED",entity:"RolePermissionOverride",entityId:role+":"+permission,metadata:{role,permission,allowed,defaultAllowed:rolePermissions[role]?.includes(permission)||false}}});
 });
 return NextResponse.json({ok:true,matrix:await effectiveMatrix()});
}
