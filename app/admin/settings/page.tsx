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
        <span><small>Current Version</small><b>V8.3.3</b></span>
        <span><small>Latest Change</small><b>30-Second Discord Auto Sync</b></span>
        <span><small>Updated</small><b>Oct 12, 2026</b></span>
        <span><small>Deployment</small><b>DEPLOYING</b></span>
      </div>
      <p className="hint">V8.3.3 adds a 30-second Discord heartbeat for active signed-in users. Membership, mapped permission groups and Discord-authoritative rank are rechecked automatically; changed access or rank refreshes the live interface without requiring a manual sync.</p>
    </section>
    <section className="panel"><h3>Configuration Center</h3><p className="hint">Map department ranks to Discord roles under Administration → Ranks & Divisions. Permission groups remain managed in the Discord Control Center.</p></section>
  </main>;
}
