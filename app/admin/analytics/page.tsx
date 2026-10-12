import Link from "next/link";
import {redirect} from "next/navigation";
import {prisma} from "@/lib/prisma";
import {requirePermission} from "@/lib/authz";
export const dynamic="force-dynamic";
const hrs=(n:number)=>Math.round(n/6)/10;
export default async function Analytics(){
 const a=await requirePermission("admin.manage");
 if(!a)redirect("/");
 const now=new Date(),start=new Date(now.getTime()-30*86400000),soon=new Date(now.getTime()+30*86400000);
 const [officers,patrols,reports,training,leavePending,fleet,equipment]=await Promise.all([
  prisma.officer.findMany({where:{status:"ACTIVE"},select:{id:true,division:{select:{name:true}},dutyStatus:true,user:{select:{name:true}}}}),
  prisma.patrolSession.findMany({where:{startedAt:{gte:start}},select:{minutes:true,officerId:true,startedAt:true}}),
  prisma.report.findMany({where:{createdAt:{gte:start}},select:{createdAt:true,status:true}}),
  prisma.trainingRecord.findMany({where:{expiresAt:{lte:soon}},select:{expiresAt:true}}),
  prisma.leaveRequest.count({where:{status:"PENDING"}}),
  prisma.fleetVehicle.findMany({select:{status:true}}),
  prisma.equipmentAsset.count({where:{status:"ISSUED",dueAt:{lt:now}}})
 ]);
 const minutes=patrols.reduce((sum,p)=>sum+(p.minutes||0),0);
 const expiring=training.filter(x=>x.expiresAt&&x.expiresAt>now).length;
 const expired=training.filter(x=>x.expiresAt&&x.expiresAt<=now).length;
 const ready=fleet.filter(x=>["AVAILABLE","IN_SERVICE","ASSIGNED"].includes(x.status)).length;
 const submitted=reports.filter(x=>x.status==="SUBMITTED").length;
 const approved=reports.filter(x=>x.status==="APPROVED").length;
 const activeDuty=officers.filter(x=>["AVAILABLE","ON_DUTY"].includes(x.dutyStatus)).length;
 const divisions=new Map<string,number>();
 officers.forEach(x=>{const name=x.division?.name||"Unassigned";divisions.set(name,(divisions.get(name)||0)+1)});
 const reportWeeks=[3,2,1,0].map(week=>{
  const from=new Date(now.getTime()-(week+1)*7*86400000);
  const to=new Date(now.getTime()-week*7*86400000);
  return {label:week===0?"Last 7 days":(week+1)+"–"+week+" weeks ago",count:reports.filter(x=>x.createdAt>=from&&x.createdAt<to).length};
 });
 const maxReports=Math.max(1,...reportWeeks.map(x=>x.count));
 const patrolByOfficer=new Map<string,number>();
 patrols.forEach(x=>patrolByOfficer.set(x.officerId,(patrolByOfficer.get(x.officerId)||0)+(x.minutes||0)));
 const topOfficers=[...patrolByOfficer.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id,mins])=>({id,mins,name:officers.find(x=>x.id===id)?.user.name||"Officer"}));
 return <main className="subpage">
  <Link href="/admin" className="back">← Administration</Link>
  <div className="pagetop"><div><p className="eyebrow">COMMAND ANALYTICS · V4</p><h1>Department Performance</h1><p>Live staffing, patrol output, report workflow and operational readiness.</p></div><span className="connpill online">30-DAY WINDOW</span></div>
  <div className="personnelstats"><div><b>{officers.length}</b><span>Active Personnel</span></div><div><b>{activeDuty}</b><span>On Duty / Available</span></div><div><b>{hrs(minutes)}</b><span>Patrol Hours</span></div><div><b>{reports.length}</b><span>Reports Created</span></div></div>
  <div className="twocol">
   <section className="panel setting"><div className="paneltitle"><div><b>Weekly Report Volume</b><span>Last four complete 7-day windows</span></div></div>
    {reportWeeks.map(x=><div className="analytics-bar-row" key={x.label}><span>{x.label}</span><div className="analytics-bar-track"><div style={{width:(x.count/maxReports*100)+"%"}}/></div><b>{x.count}</b></div>)}
   </section>
   <section className="panel setting"><div className="paneltitle"><div><b>Report Workflow</b><span>Current state of reports created in the last 30 days</span></div></div>
    <div className="profilefacts"><span><small>Awaiting Review</small><b>{submitted}</b></span><span><small>Approved</small><b>{approved}</b></span><span><small>Returned</small><b>{reports.filter(x=>x.status==="RETURNED").length}</b></span><span><small>Drafts</small><b>{reports.filter(x=>x.status==="DRAFT").length}</b></span></div>
    <Link href="/supervisor" className="outline">Open Supervisor Queue →</Link>
   </section>
   <section className="panel setting"><div className="paneltitle"><div><b>Division Staffing</b><span>Active officers by assignment</span></div></div>
    {[...divisions.entries()].sort((a,b)=>b[1]-a[1]).map(([name,count])=><div className="profileline" key={name}><span><b>{name}</b><small>Active personnel</small></span><em>{count}</em></div>)}
   </section>
   <section className="panel setting"><div className="paneltitle"><div><b>Patrol Performance</b><span>Most recorded patrol hours in the last 30 days</span></div></div>
    {topOfficers.length?topOfficers.map(x=><Link className="profileline" key={x.id} href={"/personnel/"+x.id}><span><b>{x.name}</b><small>Recorded duty time</small></span><em>{hrs(x.mins)} hrs</em></Link>):<div className="empty compact">No patrol sessions recorded.</div>}
   </section>
   <section className="panel setting"><div className="paneltitle"><div><b>Command Attention</b><span>Department items needing follow-up</span></div></div>
    <div className="profilefacts"><span><small>Pending LOA</small><b>{leavePending}</b></span><span><small>Expiring Certifications</small><b>{expiring}</b></span><span><small>Expired Certifications</small><b>{expired}</b></span><span><small>Overdue Equipment</small><b>{equipment}</b></span></div>
   </section>
   <section className="panel setting"><div className="paneltitle"><div><b>Fleet Readiness</b><span>Current vehicle availability</span></div></div>
    <div className="profilefacts"><span><small>Ready</small><b>{ready}</b></span><span><small>Total</small><b>{fleet.length}</b></span><span><small>Unavailable</small><b>{fleet.length-ready}</b></span><span><small>Patrol Sessions</small><b>{patrols.length}</b></span></div>
   </section>
  </div>
 </main>;
}