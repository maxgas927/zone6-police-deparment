import Link from "next/link";
import {redirect} from "next/navigation";
import {prisma} from "@/lib/prisma";
import {currentAccess} from "@/lib/authz";
import {can} from "@/lib/permissions";
export const dynamic="force-dynamic";
export default async function Supervisor(){
 const a=await currentAccess();
 if(!a?.member||!a.appRoles.some(r=>can(r,"reports.review")||can(r,"admin.manage")))redirect("/");
 const now=new Date(),soon=new Date(now.getTime()+30*86400000);
 const [reports,reportCount,leaves,leaveCount,certs,certCount,duty,overdue,unavailable,activePatrols,activePatrolCount,pendingApplications]=await Promise.all([
  prisma.report.findMany({where:{status:"SUBMITTED"},include:{officer:{include:{user:true}}},orderBy:{createdAt:"asc"},take:20}),
  prisma.report.count({where:{status:"SUBMITTED"}}),
  prisma.leaveRequest.findMany({where:{status:"PENDING"},include:{officer:{include:{user:true}}},orderBy:{createdAt:"asc"},take:12}),
  prisma.leaveRequest.count({where:{status:"PENDING"}}),
  prisma.trainingRecord.findMany({where:{expiresAt:{lte:soon}},include:{course:true,officer:{include:{user:true}}},orderBy:{expiresAt:"asc"},take:12}),
  prisma.trainingRecord.count({where:{expiresAt:{lte:soon}}}),
  prisma.officer.count({where:{dutyStatus:{in:["ON_DUTY","AVAILABLE"]}}}),
  prisma.equipmentAsset.count({where:{status:"ISSUED",dueAt:{lt:now}}}),
  prisma.fleetVehicle.count({where:{status:{in:["MAINTENANCE","OUT_OF_SERVICE"]}}}),
  prisma.patrolSession.findMany({where:{endedAt:null},include:{officer:{include:{user:true}}},orderBy:{startedAt:"asc"},take:20}),
  prisma.patrolSession.count({where:{endedAt:null}}),
  prisma.application.count({where:{status:"PENDING"}})
 ]);
 return <main className="subpage">
  <Link href="/" className="back">← Dashboard</Link>
  <div className="pagetop"><div><p className="eyebrow">SUPERVISOR MANAGEMENT V4</p><h1>Supervisor Command Center</h1><p>Report approvals, leave requests, certification risks and staffing readiness.</p></div></div>
  <div className="personnelstats"><div><b>{reportCount}</b><span>Reports Pending</span></div><div><b>{leaveCount}</b><span>LOA Pending</span></div><div><b>{duty}</b><span>On Duty / Available</span></div><div><b>{certCount}</b><span>Certification Alerts</span></div><div><b>{overdue}</b><span>Equipment Overdue</span></div><div><b>{unavailable}</b><span>Fleet Unavailable</span></div><div><b>{activePatrolCount}</b><span>Live Patrols</span></div><div><b>{pendingApplications}</b><span>Applications Pending</span></div></div>
  <div className="twocol">
   <section className="panel setting"><div className="paneltitle"><div><b>Active Patrol Board</b><span>Live sessions ordered by start time</span></div><Link href="/patrol">Patrol Center →</Link></div>\n    {activePatrols.length?activePatrols.map(p=><Link key={p.id} className="profileline" href={"/personnel/"+p.officerId}><span><b>{p.officer.user.name||"Officer"} · {p.officer.callsign||p.officer.badgeNumber}</b><small>On patrol since {p.startedAt.toLocaleString()}</small></span><em>ACTIVE</em></Link>):<div className="empty compact">No active patrol sessions.</div>}\n   </section>
   <section className="panel setting"><div className="paneltitle"><div><b>Report Review Queue</b><span>Oldest submitted reports first</span></div><Link href="/reports">All reports →</Link></div>
    {reports.length?reports.map(r=><Link className="profileline supervisorlink" href={"/reports/"+r.id} key={r.id}><span><b>{r.number} · {r.title}</b><small>{r.officer.user.name||"Officer"} · {r.createdAt.toLocaleString()}</small></span><em>REVIEW</em></Link>):<div className="empty compact">No reports awaiting review.</div>}
   </section>
   <section className="panel setting"><div className="paneltitle"><div><b>Leave Approval Queue</b><span>Pending requests</span></div><Link href="/loa">Review leave →</Link></div>
    {leaves.length?leaves.map(l=><Link className="profileline" href="/loa" key={l.id}><span><b>{l.officer.user.name||"Officer"}</b><small>{l.startDate.toLocaleDateString()} – {l.endDate.toLocaleDateString()}</small></span><em>PENDING</em></Link>):<div className="empty compact">No pending leave requests.</div>}
   </section>
   <section className="panel setting"><div className="paneltitle"><div><b>Certification Alerts</b><span>Expired and expiring in 30 days</span></div><Link href="/training">Training →</Link></div>
    {certs.length?certs.map(t=><Link className="profileline" href={"/personnel/"+t.officerId} key={t.id}><span><b>{t.officer.user.name||"Officer"} · {t.course.name}</b><small>{t.expiresAt?.toLocaleDateString()}</small></span><em>{t.expiresAt&&t.expiresAt<=now?"EXPIRED":"EXPIRING"}</em></Link>):<div className="empty compact">No certification alerts.</div>}
   </section>
   <section className="panel setting"><div className="paneltitle"><div><b>Command Shortcuts</b><span>Supervisor workflows</span></div></div>
    <div className="officerquickactions"><Link href="/personnel"><b>Personnel Files</b><span>Review officer status and private notes</span></Link><Link href="/personnel"><b>Officer Performance</b><span>Personnel histories and duty activity</span></Link><Link href="/notifications"><b>Notifications</b><span>Unread action items</span></Link><Link href="/operations"><b>Activity</b><span>Department activity timeline</span></Link></div>
   </section>
  </div>
 </main>;
}