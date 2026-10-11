import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic="force-dynamic";

export async function GET(){
  try{return NextResponse.json(await prisma.discordRoleMapping.findMany({orderBy:{createdAt:"desc"}}))}
  catch{return NextResponse.json([])}
}

export async function POST(req:Request){
  const type=req.headers.get("content-type")||"";
  let discordRoleId="",appRole="";
  if(type.includes("application/json")){
    const b=await req.json(); discordRoleId=String(b.discordRoleId||""); appRole=String(b.appRole||"");
  }else{
    const f=await req.formData(); discordRoleId=String(f.get("discordRoleId")||""); appRole=String(f.get("appRole")||"");
  }
  if(!discordRoleId||!appRole)return NextResponse.json({error:"Discord role and Z6PD access are required."},{status:400});
  try{
    await prisma.discordRoleMapping.upsert({where:{discordRoleId},update:{appRole,syncEnabled:true},create:{discordRoleId,appRole,syncEnabled:true}});
  }catch{
    return NextResponse.json({error:"Database is not connected yet. Discord is online, but mappings cannot be saved until PostgreSQL is configured."},{status:503});
  }
  if(!type.includes("application/json"))return NextResponse.redirect(new URL("/discord",req.url),303);
  return NextResponse.json({ok:true});
}
