import Link from "next/link";
import {redirect} from "next/navigation";
import {currentAccess} from "@/lib/authz";

export default async function V8(){
  const a=await currentAccess();
  if(!a?.appRoles.includes("COMMAND")) redirect("/");
  const shipped=["V8.0 SOP & Documents Center","V8.1 Awards & Commendations","V8.2 Organization Chart V3","V8.3 Global Search V2","V8.3.1 Discord Rank Authority"];
  const planned=["V8.4 Officer Home V3","V8.5 Notification Center","V8.6 Mobile V3","V8.7 Administration V3","V8.8 Security & Audit","V8.9 Operations Polish","V8.10 Production Release"];
  return <main className="subpage narrow">
    <Link href="/admin" className="back">← Administration</Link>
    <div className="pagetop"><div><p className="eyebrow">RELEASE STATUS</p><h1>Z6PD V8.3.1</h1><p>Department Core and Discord authority hardening. CAD remains separate.</p></div><span className="connpill online">V8.3.1</span></div>
    <section className="panel"><h3>Included in this release</h3>{shipped.map(x=><div className="releaseitem" key={x}><b>✓</b><span>{x}</span></div>)}</section>
    <section className="panel"><h3>Next in V8</h3>{planned.map(x=><div className="releaseitem" key={x}><b>→</b><span>{x}</span></div>)}</section>
  </main>;
}