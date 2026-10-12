import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
export const dynamic="force-dynamic";
export async function GET(){
 try{
  await prisma.$queryRaw`SELECT 1`;
  return NextResponse.json({status:"ok",version:"9.2.3",database:"connected",checkedAt:new Date().toISOString()},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  console.error("HEALTH_DATABASE_CHECK_FAILED",error);
  return NextResponse.json({status:"unavailable",version:"9.2.3",database:"unavailable"},{status:503,headers:{"Cache-Control":"no-store"}});
 }
}
