export const dynamic="force-dynamic";
import {prisma} from "@/lib/prisma";
import {NextResponse} from "next/server";
import {requirePermission} from "@/lib/authz";
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 const a=await requirePermission("personnel.manage");
 if(!a)return NextResponse.json({error:"Forbidden"},{status:403});
 const {id}=await params;
 let b:Record<string,unknown>;
 try{b=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 const current=await prisma.officer.findUnique({where:{id}});
 if(!current)return NextResponse.json({error:"Officer not found"},{status:404});
 const status=b.status===undefined?current.status:String(b.status);
 const dutyStatus=b.dutyStatus===undefined?current.dutyStatus:String(b.dutyStatus);
 if(!["ACTIVE","LOA","SUSPENDED","TERMINATED"].includes(status)||!["OFF_DUTY","AVAILABLE","ON_DUTY","BUSY"].includes(dutyStatus))return NextResponse.json({error:"Invalid status."},{status:400});
 const divisionId=b.divisionId===undefined?current.divisionId:(b.divisionId?String(b.divisionId):null);
 const subdivisionId=b.subdivisionId===undefined?current.subdivisionId:(b.subdivisionId?String(b.subdivisionId):null);
 if(divisionId&&!(await prisma.division.findUnique({where:{id:divisionId}})))return NextResponse.json({error:"Division not found."},{status:400});
 if(subdivisionId){
  const sub=await prisma.subdivision.findUnique({where:{id:subdivisionId}});
  if(!sub||sub.divisionId!==divisionId)return NextResponse.json({error:"Subdivision must belong to selected division."},{status:400});
 }
 const officer=await prisma.$transaction(async tx=>{
  const updated=await tx.officer.update({where:{id},data:{divisionId,subdivisionId,status:status as typeof current.status,dutyStatus:dutyStatus as typeof current.dutyStatus}});
  await tx.auditLog.create({data:{actorId:a.user.id,action:"PERSONNEL_UPDATED",entity:"Officer",entityId:id,metadata:{before:{divisionId:current.divisionId,subdivisionId:current.subdivisionId,status:current.status,dutyStatus:current.dutyStatus},after:{divisionId,subdivisionId,status,dutyStatus},badgeNumber:current.badgeNumber,identitySource:"DISCORD"}}});
  return updated;
 });
 return NextResponse.json(officer);
}