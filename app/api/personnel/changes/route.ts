export const dynamic="force-dynamic";
import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {requirePermission} from "@/lib/authz";
import {sendZ6Webhook} from "@/lib/webhooks";
export async function GET(){
 const a=await requirePermission("personnel.manage");
 if(!a)return NextResponse.json({error:"Forbidden"},{status:403});
 const requests=await prisma.personnelChangeRequest.findMany({orderBy:{createdAt:"desc"},take:150});
 return NextResponse.json(requests);
}
export async function POST(req:Request){
 const a=await requirePermission("personnel.manage");
 if(!a)return NextResponse.json({error:"Forbidden"},{status:403});
 let b:Record<string,unknown>;
 try{b=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 const officerId=typeof b.officerId==="string"?b.officerId:"";
 const kind=typeof b.kind==="string"?b.kind:"";
 const targetId=typeof b.targetId==="string"?b.targetId:"";
 const reason=typeof b.reason==="string"?b.reason.trim():"";
 if(!["PROMOTION","DEMOTION","TRANSFER"].includes(kind)||!officerId||!targetId||reason.length<5||reason.length>4000)return NextResponse.json({error:"Provide officer, change type, target, and a reason (5-4000 characters)."},{status:400});
 const officer=await prisma.officer.findUnique({where:{id:officerId}});
 if(!officer)return NextResponse.json({error:"Officer not found"},{status:404});
 if(kind==="TRANSFER"){
  const division=await prisma.division.findUnique({where:{id:targetId}});
  if(!division||officer.divisionId===targetId)return NextResponse.json({error:"Select a different valid division"},{status:400});
 }else{
  const rank=await prisma.rank.findUnique({where:{id:targetId}});
  const previous=officer.rankId?await prisma.rank.findUnique({where:{id:officer.rankId}}):null;
  if(!rank||rank.id===officer.rankId)return NextResponse.json({error:"Select a different valid rank"},{status:400});
  if(previous&&(kind==="PROMOTION"?rank.priority<=previous.priority:rank.priority>=previous.priority))return NextResponse.json({error:"Rank priority does not match promotion/demotion"},{status:400});
 }
 const pending=await prisma.personnelChangeRequest.findFirst({where:{officerId,kind,status:"PENDING"}});
 if(pending)return NextResponse.json({error:"An approval request of this type is already pending for this officer"},{status:409});
 const created=await prisma.$transaction(async tx=>{
  const request=await tx.personnelChangeRequest.create({data:{officerId,kind,targetId,reason,requestedBy:a.user.id}});
  await tx.auditLog.create({data:{actorId:a.user.id,action:"PERSONNEL_CHANGE_REQUESTED",entity:"PersonnelChangeRequest",entityId:request.id,metadata:{officerId,kind,targetId}}});
  return request;
 });
 await sendZ6Webhook("personnel","Personnel Change Awaiting Approval",kind+" request submitted for officer badge #"+officer.badgeNumber,[{name:"Reason",value:reason.slice(0,900)}],{url:"/admin/personnel-approvals",style:"warning"}).catch(()=>null);
 return NextResponse.json(created,{status:201});
}
