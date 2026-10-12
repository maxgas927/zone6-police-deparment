import {NextResponse} from "next/server";
import {currentAccess} from "@/lib/authz";
import {getDepartmentNotices} from "@/lib/notifications";
import {prisma} from "@/lib/prisma";
export const dynamic="force-dynamic";

export async function POST(req:Request){
  const access=await currentAccess();
  if(!access?.member||!access.appRoles.length)return NextResponse.json({error:"Forbidden"},{status:403});
  let body:unknown;
  try{body=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
  const keys=(body&&typeof body==="object"&&"keys" in body?(body as {keys:unknown}).keys:null);
  if(!Array.isArray(keys)||keys.length>100||keys.some(key=>typeof key!=="string"||key.length>250)){
    return NextResponse.json({error:"Invalid notification keys"},{status:400});
  }
  const allowed=new Set((await getDepartmentNotices(access.user.id,access.appRoles)).map(item=>item.key));
  const unique=[...new Set(keys as string[])].filter(key=>allowed.has(key));
  if(unique.length)await prisma.notificationRead.createMany({
    data:unique.map(key=>({userId:access.user.id,key})),skipDuplicates:true
  });
  return NextResponse.json({ok:true,updated:unique.length});
}
