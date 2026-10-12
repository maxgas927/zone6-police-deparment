export const dynamic="force-dynamic";
import {prisma} from "@/lib/prisma";
import {NextResponse} from "next/server";
import {requirePermission} from "@/lib/authz";
import {sendZ6Webhook} from "@/lib/webhooks";

export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 const a=await requirePermission("personnel.manage");
 if(!a)return NextResponse.json({error:"Forbidden"},{status:403});
 const {id}=await params;
 let body:Record<string,unknown>;
 try{body=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 const status=body.status==="APPROVED"?"APPROVED":body.status==="DENIED"?"DENIED":null;
 if(!status)return NextResponse.json({error:"Invalid review status"},{status:400});
 const note=typeof body.reviewNote==="string"?body.reviewNote.trim():"";
 if(note.length>4000)return NextResponse.json({error:"Review note is too long"},{status:400});
 if(status==="DENIED"&&!note)return NextResponse.json({error:"A denial reason is required"},{status:400});
 const now=new Date();
 const result=await prisma.$transaction(async tx=>{
  const changed=await tx.leaveRequest.updateMany({where:{id,status:"PENDING"},data:{status,reviewNote:note||null,reviewedBy:a.user.id,reviewedAt:now}});
  if(changed.count!==1)return null;
  const leave=await tx.leaveRequest.findUnique({where:{id},include:{officer:{include:{user:true}}}});
  if(!leave)throw new Error("Leave request disappeared during review");
  if(status==="APPROVED"&&leave.startDate<=now&&leave.endDate>=now){
   await tx.officer.update({where:{id:leave.officerId},data:{status:"LOA",dutyStatus:"OFF_DUTY"}});
  }
  await tx.auditLog.create({data:{actorId:a.user.id,action:status==="APPROVED"?"LOA_APPROVED":"LOA_DENIED",entity:"LeaveRequest",entityId:id,metadata:{officerId:leave.officerId,reviewNote:note||null,previousStatus:"PENDING",nextStatus:status}}});
  return leave;
 });
 if(!result)return NextResponse.json({error:"Request not found or already reviewed. Refresh and retry."},{status:409});
 await sendZ6Webhook("personnel",status==="APPROVED"?"Leave Request Approved":"Leave Request Denied",(result.officer.user.name||"Officer")+" · Badge #"+result.officer.badgeNumber,[{name:"Leave Period",value:result.startDate.toLocaleDateString()+" → "+result.endDate.toLocaleDateString(),inline:true},{name:"Reviewed By",value:a.user.name||"Command",inline:true},...(note?[{name:"Review Note",value:note.slice(0,1000)}]:[])],{style:status==="APPROVED"?"success":"danger",url:"/loa",thumbnail:result.officer.user.image||undefined}).catch(()=>null);
 return NextResponse.json(result);
}
