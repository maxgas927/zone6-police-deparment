import Link from "next/link";
import {redirect} from "next/navigation";
import {prisma} from "@/lib/prisma";
import {currentAccess} from "@/lib/authz";
import {can} from "@/lib/permissions";
import DocumentForm from "./DocumentForm";
import AcknowledgeButton from "./AcknowledgeButton";
export const dynamic="force-dynamic";

export default async function Documents(){
  const a=await currentAccess();
  if(!a?.appRoles.some(r=>can(r,"documents.read"))) redirect("/");
  const manage=a.appRoles.some(r=>can(r,"documents.manage"));
  const docs=await prisma.policyDocument.findMany({where:{published:true},include:{acknowledgements:{where:{userId:a.user.id}}},orderBy:{updatedAt:"desc"}});
  return <main className="subpage">
    <Link href="/" className="back">← Dashboard</Link>
    <div className="pagetop"><div><p className="eyebrow">SOP & DOCUMENTS</p><h1>Department Documents</h1><p>Policies, SOPs, training material and required acknowledgements.</p></div><span className="connpill online">{docs.length} DOCUMENTS</span></div>
    {manage&&<DocumentForm/>}
    <div className="grid">{docs.map(d=><section className="panel" key={d.id}><div className="paneltitle"><div><b>{d.title}</b><span>{d.category} · v{d.version}{d.effectiveAt?" · Effective "+d.effectiveAt.toLocaleDateString():""}</span></div></div><p>{d.body}</p>{d.requiredAck&&(d.acknowledgements.length?<span className="connpill online">ACKNOWLEDGED</span>:<AcknowledgeButton id={d.id}/>)}</section>)}</div>
  </main>;
}