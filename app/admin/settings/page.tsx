import Link from "next/link";
import {redirect} from "next/navigation";
import {currentAccess} from "@/lib/authz";

export default async function Settings(){
  const a=await currentAccess();
  if(!a?.appRoles.includes("COMMAND"))redirect("/");

  return <main className="subpage narrow">
    <Link href="/admin" className="back">← Administration</Link>
    <div className="pagetop"><div><p className="eyebrow">DEPARTMENT SETTINGS</p><h1>Settings</h1><p>Department configuration, integrations and production release information.</p></div><span className="connpill online">COMMAND ONLY</span></div>
    <section className="panel">
      <div className="paneltitle"><div><b>Release Status</b><span>Updated with every Z6PD application change</span></div><Link href="/admin/v8" className="primary">Full Release Notes</Link></div>
      <div className="profilefacts">
        <span><small>Current Version</small><b>V8.3.4</b></span>
        <span><small>Latest Change</small><b>1-Minute Full Department Discord Sync Worker</b></span>
        <span><small>Updated</small><b>Oct 12, 2026</b></span>
        <span><small>Deployment</small><b>LIVE</b></span>
      </div>
      <p className="hint">V8.3.4 now runs a server-side full-department Discord sync worker every minute while Z6PD is online. Every Discord-linked personnel record is rechecked for membership and mapped rank, including officers who are not actively using the website. Active signed-in users also continue their separate 30-second live refresh.</p>
    </section>
    <section className="panel"><h3>Configuration Center</h3><p className="hint">Map department ranks to Discord roles under Administration → Ranks & Divisions. Permission groups remain managed in the Discord Control Center.</p></section>
  </main>;
}
