import {prisma} from "@/lib/prisma";
import {can,permissions,rolePermissions,type Permission} from "@/lib/permissions";
export const editableRoles=["OFFICER","SUPERVISOR","FTO","IA","COMMAND"] as const;
export async function effectiveMatrix(){
 const overrides=await prisma.rolePermissionOverride.findMany();
 const map=new Map(overrides.map(o=>[o.appRole+":"+o.permission,o.allowed]));
 return Object.fromEntries(editableRoles.map(role=>[role,permissions.filter(permission=>{
  if(role==="COMMAND")return true;
  return map.get(role+":"+permission)??can(role,permission);
 })])) as Record<string,Permission[]>;
}
export async function hasEffectivePermission(roles:string[],permission:Permission){
 if(roles.includes("COMMAND"))return true;
 const matrix=await effectiveMatrix();
 return roles.some(role=>matrix[role]?.includes(permission));
}
