import Link from "next/link";
import {redirect} from "next/navigation";
import {currentAccess} from "@/lib/authz";

export default async function V8(){
  const access=await currentAccess();
  if(!access?.appRoles.includes("COMMAND"))redirect("/");

  const shipped=[
    "V8.0 SOP & Documents Center",
    "V8.1 Awards & Commendations",
    "V8.2 Organization Chart V3",
    "V8.3 Global Search V2",
    "V8.3.1 Build Recovery",
    "V8.3.2 Discord Rank Authority & Access Lockdown",
    "V8.3.3 30-Second Active User Discord Sync",
    "V8.3.4 1-Minute Full Department Discord Sync",
    "V8.3.5 Live Discord Sync Countdown",
    "V8.3.6 Discord Username Callsign Sync",
    "V8.3.7 Discord Server Nickname Identity Sync",
    "V8.3.8 Automatic 5-Digit Badge Numbers",
    "V8.3.9 Automatic Personnel File Creation",
    "V8.4 Officer Home V3",
    "V8.5 Notification Center",
    "V8.6 Scrollable Sidebar & Mobile Drawer",
    "V8.7 Administration V3 Command Readiness",
    "V8.8 Report Workflow Security",
    "V8.9 Department Activity Timeline",
    "V8.10 Production Release",
    "V9.2.1 Secure Reports & Personnel Controls",
    "V9.2.2 Personnel Files V4, Supervisor & Analytics"
  ];

  const planned=["Post-release end-to-end permissions and workflow regression testing"];

  return <main className="subpage narrow">
    <Link href="/admin" className="back">← Administration</Link>
    <div className="pagetop">
      <div>
        <p className="eyebrow">RELEASE STATUS</p>
        <h1>Z6PD V9.2.2</h1>
        <p>V8.10 production build and deployment verified. Notifications, mobile navigation, Command readiness, report review safeguards and operations activity are included. CAD remains intentionally separate.</p>
      </div>
      <span className="connpill online">V8.10 LIVE</span>
    </div>

    <section className="panel">
      <h3>Included in this release</h3>
      {shipped.map(item=><div className="releaseitem" key={item}><b>✓</b><span>{item}</span></div>)}
    </section>

    <section className="panel">
      <h3>Next in V8</h3>
      {planned.map(item=><div className="releaseitem" key={item}><b>→</b><span>{item}</span></div>)}
    </section>
  </main>;
}
