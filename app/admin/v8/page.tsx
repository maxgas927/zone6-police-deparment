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
    "V8.3.7 Discord Server Nickname Identity Sync"
  ];

  const planned=[
    "V8.4 Officer Home V3",
    "V8.5 Notification Center",
    "V8.6 Mobile V3",
    "V8.7 Administration V3",
    "V8.8 Security & Audit",
    "V8.9 Operations Polish",
    "V8.10 Production Release"
  ];

  return <main className="subpage narrow">
    <Link href="/admin" className="back">← Administration</Link>
    <div className="pagetop">
      <div>
        <p className="eyebrow">RELEASE STATUS</p>
        <h1>Z6PD V8.3.7</h1>
        <p>Discord-authoritative rank, callsign and officer name with automatic department synchronization. CAD remains intentionally separate.</p>
      </div>
      <span className="connpill online">V8.3.7</span>
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
