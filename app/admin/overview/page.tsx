import Link from "next/link";
import {redirect} from "next/navigation";
import {requirePermission} from "@/lib/authz";
import {prisma} from "@/lib/prisma";
export const dynamic="force-dynamic";
export default async function CommandOverview(){
  const access=await requirePermission("admin.manage");
  if(!access)redirect("/");
  const now=new Date(),soon=new Date(now.getTime()+30*86400000);
  const [officers,active,submitted,pendingLeave,overdueEquipment,expiringTraining,pendingDocuments,openVacancies,latest]=await Promise.all([
    prisma.officer.count(),
    prisma.officer.count({where:{status:"ACTIVE"}}),
    prisma.report.count({where:{status:"SUBMITTED"}}),
    prisma.leaveRequest.count({where:{status:"PENDING"}}),
    prisma.equipmentAsset.count({where:{status:"ISSUED",dueAt:{lt:now}}}),
    prisma.trainingRecord.count({where:{expiresAt:{gte:now,lte:soon}}}),
    prisma.policyDocument.count({where:{published:true,requiredAck:true}}),
    prisma.organizationVacancy.count({where:{status:"OPEN"}}),
    prisma.auditLog.findMany({orderBy:{createdAt:"desc"},take:12})
  ]);
  const cards=[
    {title:"Personnel",value:active+"/"+officers,href:"/personnel",note:"Active / total officers"},
    {title:"Report Review",value:String(submitted),href:"/supervisor",note:"Awaiting supervisor review"},
    {title:"Leave Approvals",value:String(pendingLeave),href:"/loa",note:"Pending requests"},
    {title:"Equipment Overdue",value:String(overdueEquipment),href:"/armory",note:"Unreturned assigned equipment"},
    {title:"Training Expiring",value:String(expiringTraining),href:"/training",note:"Within 30 days"},
    {title:"Required Policies",value:String(pendingDocuments),href:"/documents",note:"Published policies requiring acknowledgement"},
    {title:"Open Vacancies",value:String(openVacancies),href:"/organization",note:"Department recruitment needs"}
  ];
  return <main className="subpage">
    <Link href="/admin" className="back">← Administration</Link>
    <div className="pagetop"><div><p className="eyebrow">V8.7 · COMMAND OVERVIEW</p><h1>Department Readiness</h1><p>Live department operations, pending work and accountability.</p></div><span className="connpill online">COMMAND ONLY</span></div>
    <section className="readinesscards">{cards.map(card=><Link key={card.title} href={card.href} className="panel readinesscard">
      <span>{card.title}</span><strong>{card.value}</strong><small>{card.note}</small>
    </Link>)}</section>
    <section className="panel"><div className="paneltitle"><div><b>Latest Audit Activity</b><span>Recorded server-side operations</span></div><Link href="/admin/audit">Full Audit Center →</Link></div>
      {latest.length?latest.map(item=><div className="profileline" key={item.id}><span><b>{item.action.replaceAll("_"," ")}</b><small>{item.entity} · {item.actorId||"System"}</small></span><em>{item.createdAt.toLocaleString()}</em></div>):<div className="empty">No recent audit events.</div>}
    </section>
  </main>;
}
