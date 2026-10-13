import Link from "next/link";
import {redirect} from "next/navigation";
import {currentAccess} from "@/lib/authz";
import {prisma} from "@/lib/prisma";
import PersonnelApprovalSettings from "./PersonnelApprovalSettings";
import DiscordCommandsSettings from "./DiscordCommandsSettings";

export default async function Settings(){
  const access=await currentAccess();
  if(!access?.appRoles.includes("COMMAND"))redirect("/");

  const policy=await prisma.personnelApprovalPolicy.findUnique({where:{id:"default"}});
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
        <span><small>Current Version</small><b>V9.2.4</b></span>
        <span><small>Latest Change</small><b>Google Sheets Roster Preview (read-only)</b></span>
        <span><small>Updated</small><b>Oct 13, 2026</b></span>
        <span><small>Deployment</small><b>DEPLOYING</b></span>
      </div>

      <p className="hint">V9.2.4 adds a Command-only Google Sheets roster preview. The website uses a separately configured Google service account with read-only access; no roster records, Discord roles or spreadsheet cells are modified. Import and two-way sync remain disabled pending identity matching.</p>
    </section>

    <PersonnelApprovalSettings initial={policy?.allowCommandSelfReview??false}/>
    <DiscordCommandsSettings/>
    <section className="panel">
      <h3>Automatic Personnel Onboarding</h3>
      <p className="hint">Users must have a Discord-linked Z6PD account and a server nickname in the format Callsign | Title | Name, for example 1A-03 | Dept. Chief | Davion. Once detected, Z6PD creates and maintains the personnel file automatically.</p>
    </section>
  </main>;
}
