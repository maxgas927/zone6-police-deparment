export const dynamic="force-dynamic";
import {NextResponse} from "next/server";
import {requirePermission} from "@/lib/authz";
import {prisma} from "@/lib/prisma";
export async function GET(){
 const a=await requirePermission("admin.manage");
 if(!a||!a.appRoles.includes("COMMAND"))return NextResponse.json({error:"Forbidden"},{status:403});
 const policy=await prisma.personnelApprovalPolicy.findUnique({where:{id:"default"}});
 return NextResponse.json({allowCommandSelfReview:policy?.allowCommandSelfReview??false});
}
export async function PUT(req:Request){
 const a=await requirePermission("admin.manage");
 if(!a||!a.appRoles.includes("COMMAND"))return NextResponse.json({error:"Forbidden"},{status:403});
 const body=await req.json().catch(()=>null);
 if(typeof body?.allowCommandSelfReview!=="boolean")return NextResponse.json({error:"Invalid policy"},{status:400});
 const policy=await prisma.$transaction(async tx=>{
  const saved=await tx.personnelApprovalPolicy.upsert({where:{id:"default"},create:{id:"default",allowCommandSelfReview:body.allowCommandSelfReview,updatedBy:a.user.id},update:{allowCommandSelfReview:body.allowCommandSelfReview,updatedBy:a.user.id}});
  await tx.auditLog.create({data:{actorId:a.user.id,action:"PERSONNEL_APPROVAL_POLICY_CHANGED",entity:"PersonnelApprovalPolicy",entityId:"default",metadata:{allowCommandSelfReview:saved.allowCommandSelfReview}}});
  return saved;
 });
 return NextResponse.json({allowCommandSelfReview:policy.allowCommandSelfReview});
}
