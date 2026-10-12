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
        <span><small>Current Version</small><b>V8.3.7</b></span>
        <span><small>Latest Change</small><b>Discord Server Nickname Identity Sync</b></span>
        <span><small>Updated</small><b>Oct 12, 2026</b></span>
        <span><small>Deployment</small><b>DEPLOYING</b></span>
      </div>

      <p className="hint">V8.3.7 reads personnel identity from the Discord server nickname. For a nickname like 1A-03 | Dept. Chief | Davion, Z6PD stores 1A-03 as the callsign and Davion as the officer name. Both automatically update during active-user and full-department Discord syncs. Rank remains controlled by mapped Discord roles.</p>
    </section>

    <section className="panel">
      <h3>Configuration Center</h3>
      <p className="hint">Use the Discord nickname format Callsign | Title | Name. Example: 1A-03 | Dept. Chief | Davion.</p>
    </section>
  </main>;
}
