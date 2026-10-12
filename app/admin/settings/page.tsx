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
        <span><small>Current Version</small><b>V8.3.8</b></span>
        <span><small>Latest Change</small><b>Automatic 5-Digit Badge Numbers</b></span>
        <span><small>Updated</small><b>Oct 12, 2026</b></span>
        <span><small>Deployment</small><b>DEPLOYING</b></span>
      </div>

      <p className="hint">V8.3.8 automatically assigns every new officer a unique random 5-digit badge number from 10000 through 99999. Badge generation is server-side and collision checked before the personnel record is created.</p>
    </section>

    <section className="panel">
      <h3>Personnel Identity Rules</h3>
      <p className="hint">Badge number is generated automatically. Discord nickname format remains Callsign | Title | Name, for example 1A-03 | Dept. Chief | Davion.</p>
    </section>
  </main>;
}
