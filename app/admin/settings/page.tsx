import Link from "next/link";
import {redirect} from "next/navigation";
import {currentAccess} from "@/lib/authz";

export default async function Settings(){
  const access=await currentAccess();
  if(!access?.appRoles.includes("COMMAND"))redirect("/");

  return <main className="subpage narrow">
    <Link href="/admin" className="back">← Administration</Link>
    <div className="pagetop">
      <div>
        <p className="eyebrow">DEPARTMENT SETTINGS</p>
        <h1>Settings</h1>
        <p>Department configuration, integrations and production release information.</p>
      </div>
      <span className="connpill online">COMMAND ONLY</span>
    </div>

    <section className="panel">
      <div className="paneltitle">
        <div>
          <b>Release Status</b>
          <span>Updated with every Z6PD application change</span>
        </div>
        <Link href="/admin/v8" className="primary">Full Release Notes</Link>
      </div>

      <div className="profilefacts">
        <span><small>Current Version</small><b>V9.2.2</b></span>
        <span><small>Latest Change</small><b>Personnel Files V4 & Command Analytics</b></span>
        <span><small>Updated</small><b>Oct 12, 2026</b></span>
        <span><small>Deployment</small><b>DEPLOYING</b></span>
      </div>

      <p className="hint">V9.2.2 adds confidential, audit-logged supervisor notes to personnel files; detailed officer activity timelines; team certification alerts; enhanced supervisor review and leave queues; division staffing, patrol and report analytics; and improved training access controls.</p>
    </section>

    <section className="panel">
      <h3>Automatic Personnel Onboarding</h3>
      <p className="hint">Users must have a Discord-linked Z6PD account and a server nickname in the format Callsign | Title | Name, for example 1A-03 | Dept. Chief | Davion. Once detected, Z6PD creates and maintains the personnel file automatically.</p>
    </section>
  </main>;
}
