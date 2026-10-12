export const dynamic="force-dynamic";
import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {requirePermission} from "@/lib/authz";
import {sendZ6Webhook} from "@/lib/webhooks";
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 const a=await requirePermission("reports.create");
 if(!a)return NextResponse.json({error:"Forbidden"},{status:403});
 const {id}=await params;
 let b:Record<string,unknown>;
 try{b=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 const report=await prisma.report.findUnique({where:{id},include:{officer:{include:{user:true}}}});
 if(!report)return NextResponse.json({error:"Report not found."},{status:404});
 if(report.officer.userId!==a.user.id)return NextResponse.json({error:"Only the reporting officer can resubmit."},{status:403});
 if(report.status!=="RETURNED")return NextResponse.json({error:"Only returned reports can be resubmitted."},{status:409});
 const title=String(b.title||"").trim(),type=String(b.type||"").trim(),narrative=String(b.narrative||"").trim();
 if(!title||!type||!narrative)return NextResponse.json({error:"Title, type and corrected narrative are required."},{status:400});
 if(title.length>200||type.length>100||narrative.length>50000)return NextResponse.json({error:"Report content exceeds allowed length."},{status:400});
 const changed=await prisma.$transaction(async tx=>{
  const result=await tx.report.updateMany({where:{id,status:"RETURNED",officerId:report.officerId},data:{title,type,narrative,status:"SUBMITTED",reviewedBy:null,reviewedAt:null}});
  if(result.count!==1)return false;
  await tx.auditLog.create({data:{actorId:a.user.id,action:"REPORT_RESUBMITTED",entity:"Report",entityId:id,metadata:{number:report.number,previousStatus:"RETURNED",nextStatus:"SUBMITTED"}}});
  return true;
 });
 if(!changed)return NextResponse.json({error:"Report changed while resubmitting. Refresh and retry."},{status:409});
 await sendZ6Webhook("reports","Report Resubmitted","A corrected report is awaiting supervisor review.",
 [{name:"Report Number",value:report.number,inline:true},{name:"Officer",value:(report.officer.callsign?report.officer.callsign+" - ":"")+(report.officer.user.name||"Officer"),inline:true},{name:"Title",value:title},{name:"Correction Status",value:"Awaiting Supervisor Review",inline:true}],
 {style:"info",url:"/reports/"+id,thumbnail:report.officer.user.image||undefined}).catch(()=>null);
 return NextResponse.json(await prisma.report.findUnique({where:{id}}));
}