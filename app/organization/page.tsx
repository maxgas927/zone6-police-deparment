import Link from "next/link";
import {redirect} from "next/navigation";
import {prisma} from "@/lib/prisma";
import {currentAccess} from "@/lib/authz";
import {can} from "@/lib/permissions";
import VacancyForm from "./VacancyForm";
export const dynamic="force-dynamic";

export default async function Organization(){
  const a=await currentAccess();
  if(!a?.appRoles.some(r=>can(r,"personnel.read"))) redirect("/");
  const manage=a.appRoles.some(r=>can(r,"admin.manage"));
  const [divisions,vacancies]=await Promise.all([
    prisma.division.findMany({include:{subdivisions:true,officers:{where:{status:"ACTIVE"},include:{user:true,rank:true,subdivision:true}}},orderBy:{name:"asc"}}),
    prisma.organizationVacancy.findMany({where:{status:"OPEN"},orderBy:{createdAt:"desc"}})
  ]);
  return <main className="subpage">
    <Link href="/" className="back">← Dashboard</Link>
    <div className="pagetop"><div><p className="eyebrow">ORGANIZATION V3</p><h1>Chain of Command</h1><p>Department hierarchy, divisions, subdivisions and open positions.</p></div>{manage&&<Link href="/admin/organization" className="primary">Manage Structure</Link>}</div>
    {manage&&<VacancyForm/>}
    <section className="panel"><h3>Open Positions</h3>{vacancies.length?vacancies.map(v=><div className="profileline" key={v.id}><span><b>{v.title}</b><small>{[v.rank,v.division,v.subdivision].filter(Boolean).join(" · ")||"Department-wide"}</small></span><em>OPEN</em></div>):<div className="empty compact">No open positions.</div>}</section>
    {divisions.map(d=><section className="panel" key={d.id}><div className="paneltitle"><div><b>{d.name}</b><span>{d.subdivisions.length} subdivisions · {d.officers.length} active officers</span></div></div>{d.officers.sort((x,y)=>(y.rank?.priority||0)-(x.rank?.priority||0)).map(o=><Link className="profileline" href={"/personnel/"+o.id} key={o.id}><span><b>{o.rank?.name||"Officer"} · {o.user.name||"Unnamed Officer"}</b><small>Badge #{o.badgeNumber}{o.callsign?" · "+o.callsign:""}{o.subdivision?" · "+o.subdivision.name:""}</small></span><em>PROFILE</em></Link>)}</section>)}
  </main>;
}