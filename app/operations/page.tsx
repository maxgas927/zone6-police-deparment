import Link from "next/link";
import {redirect} from "next/navigation";
import {currentAccess} from "@/lib/authz";
import {prisma} from "@/lib/prisma";
import {can} from "@/lib/permissions";
export const dynamic="force-dynamic";

export default async function OperationsTimeline(){
  const access=await currentAccess();
  if(!access?.member||!access.appRoles.length)redirect("/");
  const review=access.appRoles.some(role=>can(role,"reports.review"));
  const [reports,announcements,events]=await Promise.all([
    prisma.report.findMany({where:review?{status:{in:["SUBMITTED","APPROVED"]}}:{officer:{userId:access.user.id},status:{in:["SUBMITTED","APPROVED"]}},orderBy:{updatedAt:"desc"},take:15,include:{officer:{include:{user:true}}}}),
    prisma.announcement.findMany({where:{published:true},orderBy:{createdAt:"desc"},take:15}),
    prisma.departmentEvent.findMany({where:{startsAt:{gte:new Date(Date.now()-7*86400000)}},orderBy:{startsAt:"asc"},take:15})
  ]);
  const items=[
    ...reports.map(item=>({id:"r"+item.id,kind:"REPORT",title:item.number+" · "+item.title,detail:(item.officer.user.name||"Officer")+" · "+item.status,href:"/reports/"+item.id,date:item.updatedAt})),
    ...announcements.map(item=>({id:"a"+item.id,kind:"ANNOUNCEMENT",title:item.title,detail:item.body.slice(0,130),href:"/announcements",date:item.createdAt})),
    ...events.map(item=>({id:"e"+item.id,kind:"EVENT",title:item.title,detail:item.type+(item.location?" · "+item.location:""),href:"/schedule",date:item.startsAt}))
  ].sort((a,b)=>b.date.getTime()-a.date.getTime()).slice(0,40);
  return <main className="subpage narrow">
    <Link href="/" className="back">← Command Center</Link>
    <div className="pagetop"><div><p className="eyebrow">V8.9 · OPERATIONS POLISH</p><h1>Department Activity</h1><p>Department-wide reports, announcements and events in one timeline.</p></div></div>
    <section className="panel">{items.length?items.map(item=><Link href={item.href} key={item.id} className="operationtimeline">
      <span><small>{item.kind} · {item.date.toLocaleString()}</small><b>{item.title}</b><em>{item.detail}</em></span><strong>→</strong>
    </Link>):<div className="empty">No department activity yet.</div>}</section>
  </main>;
}
