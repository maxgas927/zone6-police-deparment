import Link from "next/link";
import {redirect} from "next/navigation";
import {currentAccess} from "@/lib/authz";
import {prisma} from "@/lib/prisma";
export const dynamic="force-dynamic";
export default async function PersonnelCommandCenter(){
 const access=await currentAccess();if(!access?.member||!access.appRoles.includes("COMMAND"))redirect("/");
 const [officers,changes,leaves,training]=await Promise.all([
  prisma.officer.findMany({select:{id:true,status:true,rank:{select:{name:true}},division:{select:{name:true}},patrols:{select:{startedAt:true},orderBy:{startedAt:"desc"},take:1}}}),
  prisma.personnelChangeRequest.count({where:{status:"PENDING"}}),
  prisma.leaveRequest.count({where:{status:"PENDING"}}),
  prisma.trainingRecord.count()
 ]);
 const rankCounts=new Map<string,number>(),divisionCounts=new Map<string,number>();
 for(const o of officers){const r=o.rank?.name||"Unassigned",d=o.division?.name||"Unassigned";rankCounts.set(r,(rankCounts.get(r)||0)+1);divisionCounts.set(d,(divisionCounts.get(d)||0)+1)}
 const now=Date.now();const inactive=officers.filter(o=>o.status==="ACTIVE"&&(!o.patrols[0]||now-o.patrols[0].startedAt.getTime()>14*86400000)).length;
 return <main className="subpage"><Link className="back" href="/admin">← Administration</Link><div className="pagetop"><div><p className="eyebrow">PERSONNEL MANAGEMENT V2</p><h1>Command Personnel Center</h1><p>Staffing, approvals, training and patrol activity at a glance.</p></div><span className="connpill online">COMMAND ONLY</span></div>
 <div className="personnelstats"><div><b>{officers.length}</b><span>Total officers</span></div><div><b>{officers.filter(o=>o.status==="ACTIVE").length}</b><span>Active</span></div><div><b>{changes}</b><span>Personnel approvals</span></div><div><b>{leaves}</b><span>Leave requests</span></div></div>
 <div className="personnelstats"><div><b>{inactive}</b><span>No patrol recorded in 14 days*</span></div><div><b>{training}</b><span>Training records</span></div><div><b>{officers.filter(o=>o.status==="LOA").length}</b><span>On LOA</span></div><div><b>{officers.filter(o=>o.status==="SUSPENDED").length}</b><span>Suspended</span></div></div>
 <p className="hint">*Includes active officers with no recorded patrol. This is a review signal, not an automatic disciplinary finding.</p>
 <div className="admincards"><section className="panel"><h3>Ranks</h3>{[...rankCounts].sort((a,b)=>b[1]-a[1]).map(([name,count])=><p key={name}>{name}: <b>{count}</b></p>)}</section><section className="panel"><h3>Divisions</h3>{[...divisionCounts].sort((a,b)=>b[1]-a[1]).map(([name,count])=><p key={name}>{name}: <b>{count}</b></p>)}</section></div>
 <div className="admincards">{[["Roster","/personnel"],["Personnel approvals","/admin/personnel-approvals"],["Google Sheets preview","/admin/integrations"],["Training","/training"],["Leave requests","/loa"],["Audit logs","/admin/audit"]].map(([name,href])=><section className="panel" key={name}><h3>{name}</h3><Link href={href}>Open →</Link></section>)}</div>
 </main>;
}