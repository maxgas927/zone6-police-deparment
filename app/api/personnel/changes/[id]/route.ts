export const dynamic="force-dynamic";
import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {requirePermission} from "@/lib/authz";
import {sendZ6Webhook} from "@/lib/webhooks";
import {changeDiscordRank} from "@/lib/discord";
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 const a=await requirePermission("admin.manage");
 if(!a)return NextResponse.json({error:"Command permission required"},{status:403});
 const {id}=await params;
 let b:Record<string,unknown>;
 try{b=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 const status=b.status==="APPROVED"?"APPROVED":b.status==="DENIED"?"DENIED":null;
 const note=typeof b.reviewNote==="string"?b.reviewNote.trim():"";
 if(!status||note.length>4000||(status==="DENIED"&&!note))return NextResponse.json({error:"Invalid decision or missing denial reason"},{status:400});
 const request=await prisma.personnelChangeRequest.findUnique({where:{id}});
 if(!request)return NextResponse.json({error:"Request not found"},{status:404});
 if(request.requestedBy===a.user.id){
  const policy=await prisma.personnelApprovalPolicy.findUnique({where:{id:"default"}});
  if(!policy?.allowCommandSelfReview)return NextResponse.json({error:"Self-review is disabled in Personnel Approval Settings"},{status:403});
 }
 if(!["PENDING","SYNC_FAILED"].includes(request.status))return NextResponse.json({error:"Request already reviewed"},{status:409});
 let claimed=false;
 if(status==="APPROVED"&&request.kind!=="TRANSFER"){
  const officer=await prisma.officer.findUnique({where:{id:request.officerId},include:{rank:true,user:{include:{accounts:true}}}});
  const target=await prisma.rank.findUnique({where:{id:request.targetId}});
  const account=officer?.user.accounts.find(x=>x.provider==="discord");
  if(!officer||!target?.discordRoleId||!account)return NextResponse.json({error:"Officer Discord account and mapped target rank required"},{status:409});
  const claim=await prisma.personnelChangeRequest.updateMany({where:{id,status:request.status},data:{status:"SYNCING"}});
  if(claim.count!==1)return NextResponse.json({error:"Approval already in progress"},{status:409});
  claimed=true;
  try{await changeDiscordRank(account.providerAccountId,officer.rank?.discordRoleId||null,target.discordRoleId)}
  catch(e){
   const reason=e instanceof Error?e.message:"Discord role update failed";
   await prisma.personnelChangeRequest.update({where:{id},data:{status:"SYNC_FAILED",reviewNote:reason}});
   return NextResponse.json({error:reason+"; retry approval after correcting Discord permissions."},{status:502});
  }
 }
 let result:string;
 try{result=await prisma.$transaction(async tx=>{
  const updated=await tx.personnelChangeRequest.updateMany({where:{id,status:claimed?"SYNCING":request.status},data:{status,reviewNote:note||null,reviewedBy:a.user.id,reviewedAt:new Date()}});
  if(updated.count!==1)return "CONFLICT";
  const officer=await tx.officer.findUnique({where:{id:request.officerId},include:{rank:true}});
  if(!officer)throw new Error("MISSING");
  if(status==="APPROVED"){
   if(request.kind==="TRANSFER"){
    const division=await tx.division.findUnique({where:{id:request.targetId}});
    if(!division)throw new Error("INVALID");
    const changed=await tx.officer.updateMany({where:{id:officer.id,divisionId:officer.divisionId},data:{divisionId:division.id,subdivisionId:null}});
    if(changed.count!==1)throw new Error("CONFLICT");
   }else{
    const rank=await tx.rank.findUnique({where:{id:request.targetId}});
    if(!rank)throw new Error("INVALID");
    if(officer.rank&&(request.kind==="PROMOTION"?rank.priority<=officer.rank.priority:rank.priority>=officer.rank.priority))throw new Error("INVALID");
    const changed=await tx.officer.updateMany({where:{id:officer.id,rankId:officer.rankId},data:{rankId:rank.id}});
    if(changed.count!==1)throw new Error("CONFLICT");
    await tx.promotionHistory.create({data:{officerId:officer.id,fromRank:officer.rank?.name||null,toRank:rank.name,reason:request.reason,approvedBy:a.user.id}});
   }
  }
  await tx.auditLog.create({data:{actorId:a.user.id,action:"PERSONNEL_CHANGE_"+status,entity:"PersonnelChangeRequest",entityId:id,metadata:{officerId:request.officerId,kind:request.kind,targetId:request.targetId,reason:request.reason,reviewNote:note||null}}});
  return "OK";
 });}catch{if(claimed)await prisma.personnelChangeRequest.update({where:{id},data:{status:"SYNC_FAILED",reviewNote:"Discord rank was updated but database approval failed. Reconcile and retry."}});return NextResponse.json({error:"Approval could not be applied; the target or officer assignment may have changed."},{status:409})}
 if(result!=="OK"){if(claimed)await prisma.personnelChangeRequest.update({where:{id},data:{status:"SYNC_FAILED",reviewNote:"Discord role changed but database update conflicted; review officer rank before retrying."}});return NextResponse.json({error:"Personnel assignment changed or target is no longer valid. Review the request before retrying."},{status:409});}
 await sendZ6Webhook("personnel","Personnel Change "+status,request.kind+" request "+status.toLowerCase(),[{name:"Officer ID",value:request.officerId},{name:"Decision",value:note||status}],{style:status==="APPROVED"?"success":"danger",url:"/admin/personnel-approvals"}).catch(()=>null);
 return NextResponse.json({ok:true,status});
}
