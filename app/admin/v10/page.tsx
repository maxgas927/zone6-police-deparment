import Link from "next/link";
import {redirect} from "next/navigation";
import {requirePermission} from "@/lib/authz";
import {prisma} from "@/lib/prisma";
export const dynamic="force-dynamic";
const modules=[
 ["V10.0","Foundation & Stability","/admin/discord-health","Discord sync health, readiness and diagnostics"],
 ["V10.1","Personnel Management","/admin/personnel-center","Service history, staffing and personnel records"],
 ["V10.2","Discord Bot","/admin/discord-commands","Command registration and rank management"],
 ["V10.3","High Command","/admin/personnel-approvals","Personnel approvals and command oversight"],
 ["V10.4","Patrol Operations","/patrol","Live duty status and patrol sessions"],
 ["V10.5","Reports & Investigations","/reports","Reports, cases and review queues"],
 ["V10.6","Training Academy","/training","Training records and certification renewal"],
 ["V10.7","Department Automation","/admin/webhooks","Event notifications and Discord webhooks"],
 ["V10.8","Mobile Experience","/admin/v4","Responsive command dashboard"],
 ["V10.9","Production Readiness","/admin/audit","Audit history and operational review"]
] as const;
export default async function V10(){
 const a=await requirePermission("admin.manage");
 if(!a?.appRoles.includes("COMMAND"))redirect("/");
 const [pending,activePatrols,trainingAlerts,reports,officers]=await Promise.all([
  prisma.personnelChangeRequest.count({where:{status:{in:["PENDING","SYNC_FAILED"]}}}),
  prisma.patrolSession.count({where:{endedAt:null}}),
  prisma.trainingRecord.count({where:{expiresAt:{lte:new Date(Date.now()+30*86400000)}}}),
  prisma.report.count({where:{status:"SUBMITTED"}}),
  prisma.officer.count()
 ]);
 return <main className="subpage v4page"><Link className="back" href="/admin">← Administration</Link>
 <div className="pagetop"><div><p className="eyebrow">Z6PD · V10 COMMAND PLATFORM</p><h1>Department Operations Hub</h1><p>One secure starting point for Command workflows and department readiness.</p></div><span className="connpill online">COMMAND ONLY</span></div>
 <div className="personnelstats"><div><b>{officers}</b><span>Personnel</span></div><div><b>{activePatrols}</b><span>Live Patrols</span></div><div><b>{pending}</b><span>Approval Actions</span></div><div><b>{trainingAlerts}</b><span>Training Alerts</span></div><div><b>{reports}</b><span>Reports Awaiting Review</span></div></div>
 <section className="panel"><div className="paneltitle"><div><b>Department Modules</b><span>V10 series operational workspace</span></div><Link href="/admin/v4">Previous command center →</Link></div><div className="v4shortcuts">{modules.map(([version,name,href,description])=><Link href={href} key={version}><b>{version} · {name} →</b><small>{description}</small></Link>)}</div></section>
 <p className="hint">Module links use existing protected workflows. Feature availability depends on each release and its deployment status.</p>
 </main>;
}