import Link from "next/link";
import {redirect} from "next/navigation";
import {requirePermission} from "@/lib/authz";
import {prisma} from "@/lib/prisma";
export const dynamic="force-dynamic";
export default async function V4CommandCenter(){
 const access=await requirePermission("admin.manage");
 if(!access?.appRoles.includes("COMMAND"))redirect("/");
 const now=new Date(),soon=new Date(now.getTime()+30*86400000);
 const [officers,requests,patrols,trainingAlerts,discipline,history,audit]=await Promise.all([
  prisma.officer.findMany({select:{id:true,badgeNumber:true,callsign:true,status:true,dutyStatus:true,hiredAt:true,user:{select:{name:true}},rank:{select:{name:true,priority:true}},division:{select:{name:true}}},orderBy:{badgeNumber:"asc"},take:200}),
  prisma.personnelChangeRequest.findMany({where:{status:{in:["PENDING","SYNC_FAILED"]}},orderBy:{createdAt:"asc"},take:15}),
  prisma.patrolSession.findMany({where:{endedAt:null},include:{officer:{include:{user:true,rank:true,division:true}}},orderBy:{startedAt:"asc"},take:30}),
  prisma.trainingRecord.findMany({where:{expiresAt:{lte:soon}},select:{officerId:true,expiresAt:true,course:{select:{name:true}}},take:200}),
  prisma.disciplineCase.findMany({where:{status:"OPEN"},select:{officerId:true},take:200}),
  prisma.promotionHistory.findMany({select:{officerId:true},orderBy:{createdAt:"desc"},take:200}),
  prisma.auditLog.findMany({orderBy:{createdAt:"desc"},take:12})
 ]);
 const trainingByOfficer=new Map<string,number>();
 for(const item of trainingAlerts)trainingByOfficer.set(item.officerId,(trainingByOfficer.get(item.officerId)||0)+1);
 const disciplineByOfficer=new Set(discipline.map(x=>x.officerId));
 const promoted=new Set(history.map(x=>x.officerId));
 const pending=requests.filter(x=>x.status==="PENDING").length;
 const failed=requests.filter(x=>x.status==="SYNC_FAILED").length;
 const shortcuts=[["Personnel files","/personnel","Profiles, service records, certifications and discipline"],["Approval center","/admin/personnel-approvals","Promotions, demotions and transfers"],["Training records","/training","Qualifications and expiring certifications"],["Patrol operations","/patrol","Live patrol activity and duty sessions"],["Audit history","/admin/audit","Accountability and administrative actions"],["Discord health","/api/admin/discord-health","Bot configuration and latest sync results"]];
 return <main className="subpage v4page"><Link className="back" href="/admin">← Administration</Link>
 <div className="pagetop"><div><p className="eyebrow">Z6PD V4 · COMMAND OPERATIONS</p><h1>Unified Command Center</h1><p>Personnel readiness, approvals, live patrols and accountability in one place.</p></div><span className="connpill online">COMMAND ONLY</span></div>
 <div className="personnelstats"><div><b>{officers.length}</b><span>Officers shown</span></div><div><b>{pending}</b><span>Pending approvals</span></div><div><b>{failed}</b><span>Sync retries needed</span></div><div><b>{patrols.length}</b><span>Active patrols</span></div></div>
 <div className="v4layout">
 <section className="panel"><div className="paneltitle"><div><b>Command action queue</b><span>Oldest requests first · rank and division changes</span></div><Link href="/admin/personnel-approvals">Review all →</Link></div>
 {requests.length?requests.map(item=><div className="profileline" key={item.id}><span><b>{item.kind.replaceAll("_"," ")} · {item.status}</b><small>{item.reason.slice(0,140)}</small><small>{item.createdAt.toLocaleString()}</small></span><Link href="/admin/personnel-approvals">Review →</Link></div>):<p className="hint">No pending or failed personnel requests.</p>}</section>
 <section className="panel"><div className="paneltitle"><div><b>Live patrol board</b><span>Open duty sessions</span></div><Link href="/patrol">Patrol →</Link></div>
 {patrols.length?patrols.map(s=><Link className="profileline" href={"/personnel/"+s.officerId} key={s.id}><span><b>{s.officer.callsign||s.officer.badgeNumber} · {s.officer.user.name||"Officer"}</b><small>{s.officer.rank?.name||"Unranked"} · {s.officer.division?.name||"Unassigned"}</small></span><em>ON DUTY</em></Link>):<p className="hint">No officers are currently on patrol.</p>}</section>
 </div>
 <section className="panel"><div className="paneltitle"><div><b>Personnel readiness</b><span>Review signals only; promotion decisions require command evaluation</span></div><Link href="/personnel">Full roster →</Link></div>
 <div className="v4tablewrap"><table className="v4table"><thead><tr><th>Officer</th><th>Rank</th><th>Division</th><th>Service</th><th>Training alerts</th><th>Review flags</th></tr></thead><tbody>{officers.map(o=><tr key={o.id}><td><Link href={"/personnel/"+o.id}>{o.callsign||o.badgeNumber} · {o.user.name||"Officer"}</Link></td><td>{o.rank?.name||"Unassigned"}</td><td>{o.division?.name||"—"}</td><td>{Math.max(0,Math.floor((now.getTime()-o.hiredAt.getTime())/86400000))} days</td><td>{trainingByOfficer.get(o.id)||0}</td><td>{[o.status!=="ACTIVE"?o.status:null,disciplineByOfficer.has(o.id)?"Open discipline":null,promoted.has(o.id)?"Promotion history":null].filter(Boolean).join(" · ")||"No listed flags"}</td></tr>)}</tbody></table></div>
 <p className="hint">Training alerts include expired or expiring certificates. Flags are informational, not automated eligibility determinations. Display limited to 200 officers.</p></section>
 <div className="v4layout"><section className="panel"><div className="paneltitle"><div><b>Command shortcuts</b><span>Core V4 workflows</span></div></div><div className="v4shortcuts">{shortcuts.map(([name,href,description])=><Link key={href} href={href}><b>{name} →</b><small>{description}</small></Link>)}</div></section>
 <section className="panel"><div className="paneltitle"><div><b>Recent accountability events</b><span>Latest recorded actions</span></div><Link href="/admin/audit">Full audit →</Link></div>{audit.length?audit.map(x=><div className="profileline" key={x.id}><span><b>{x.action.replaceAll("_"," ")}</b><small>{x.entity} · {x.createdAt.toLocaleString()}</small></span></div>):<p className="hint">No audit events recorded.</p>}</section></div>
 </main>;
}
