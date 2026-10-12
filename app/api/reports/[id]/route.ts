export const dynamic="force-dynamic";
import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {requirePermission} from "@/lib/authz";
import {sendZ6Webhook} from "@/lib/webhooks";
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 const a=await requirePermission("reports.review");
 if(!a)return NextResponse.json({error:"Forbidden"},{status:403});
 const {id}=await params;
 let b:Record<string,unknown>;
 try{b=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 const status=String(b.status||"");
 if(!["APPROVED","RETURNED"].includes(status))return NextResponse.json({error:"Invalid review action."},{status:400});
 const note=String(b.reviewNote||"").trim();
 if(status==="RETURNED"&&!note)return NextResponse.json({error:"A return reason is required."},{status:400});
 if(note.length>4000)return NextResponse.json({error:"Review note too long."},{status:400});
 const report=await prisma.report.findUnique({where:{id},include:{officer:{include:{user:true,rank:true,division:true,subdivision:true}}}});
 if(!report)return NextResponse.json({error:"Report not found."},{status:404});
 if(report.officer.userId===a.user.id)return NextResponse.json({error:"Officers cannot review their own reports."},{status:403});
 if(report.status!=="SUBMITTED")return NextResponse.json({error:"Only submitted reports can be reviewed."},{status:409});
 const updated=await prisma.$transaction(async tx=>{
   const change=await tx.report.updateMany({where:{id,status:"SUBMITTED"},data:{status,reviewNote:note||null,reviewedBy:a.user.id,reviewedAt:new Date()}});
   if(change.count!==1)return false;
   await tx.auditLog.create({data:{actorId:a.user.id,action:status==="APPROVED"?"REPORT_APPROVED":"REPORT_RETURNED",entity:"Report",entityId:id,metadata:{number:report.number,reviewNote:note||null,previousStatus:"SUBMITTED",nextStatus:status}}});
   return true;
 });
 if(!updated)return NextResponse.json({error:"Report was already reviewed. Refresh and retry."},{status:409});
 await sendZ6Webhook("reports",status==="APPROVED"?"Report Approved":"Report Returned",report.number+" · "+report.title,
 [{name:"Report Number",value:report.number,inline:true},{name:"Type",value:report.type,inline:true},
 {name:"Officer",value:(report.officer.callsign?report.officer.callsign+" - ":"")+(report.officer.user.name||"Officer")+" - Badge "+report.officer.badgeNumber},
 {name:"Assignment",value:[report.officer.rank?.name,report.officer.division?.name,report.officer.subdivision?.name].filter(Boolean).join(" - ")||"Unassigned"},
 {name:"Report Title",value:report.title},{name:"Narrative Preview",value:report.narrative?report.narrative.slice(0,700):"No narrative provided."},
 {name:"Decision",value:status,inline:true},{name:"Reviewed By",value:a.user.name||"Supervisor",inline:true},...(note?[{name:"Supervisor Note",value:note.slice(0,1000)}]:[])]
 ,{style:status==="APPROVED"?"success":"warning",url:"/reports/"+id,thumbnail:report.officer.user.image||undefined}).catch(()=>null);
 return NextResponse.json(await prisma.report.findUnique({where:{id}}));
}