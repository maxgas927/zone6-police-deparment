export const dynamic="force-dynamic";
import {prisma} from "@/lib/prisma";
import {NextResponse} from "next/server";
import {requirePermission} from "@/lib/authz";

export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
  const a=await requirePermission("personnel.manage");
  if(!a)return NextResponse.json({error:"Forbidden"},{status:403});
  const {id}=await params;
  const b=await req.json();
  const status=["ACTIVE","LOA","SUSPENDED","TERMINATED"].includes(b.status)?b.status:undefined;
  const dutyStatus=["OFF_DUTY","AVAILABLE","ON_DUTY","BUSY"].includes(b.dutyStatus)?b.dutyStatus:undefined;

  try{
    const officer=await prisma.officer.update({where:{id},data:{badgeNumber:String(b.badgeNumber||"").trim(),callsign:b.callsign?String(b.callsign).trim():null,divisionId:b.divisionId||null,subdivisionId:b.subdivisionId||null,status,dutyStatus}});
    await prisma.auditLog.create({data:{actorId:a.user.id,action:"PERSONNEL_UPDATED",entity:"Officer",entityId:id,metadata:{badgeNumber:officer.badgeNumber,status:officer.status,dutyStatus:officer.dutyStatus,rankSource:"DISCORD"}}});
    return NextResponse.json(officer);
  }catch(error){
    console.error("PERSONNEL_UPDATE_FAILED",error);
    return NextResponse.json({error:"Could not update personnel record. Check badge and callsign uniqueness."},{status:500});
  }
}
