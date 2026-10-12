import Link from "next/link";
import {redirect} from "next/navigation";
import RoleMappingManager from "./RoleMappingManager";
import SyncPersonnel from "./SyncPersonnel";
import {prisma} from "@/lib/prisma";
import {getGuildRoles} from "@/lib/discord";
import {currentAccess} from "@/lib/authz";
import {can} from "@/lib/permissions";

export const dynamic="force-dynamic";

export default async function DiscordSettings(){
  const access=await currentAccess();
  if(!access?.appRoles.some(r=>can(r,"discord.manage")))redirect("/");

  let roles:any[]=[];
  let mappings:any[]=[];
  let error="";
  try{
    [roles,mappings]=await Promise.all([getGuildRoles(),prisma.discordRoleMapping.findMany({orderBy:{createdAt:"desc"}})]);
  }catch{
    error="Unable to load Discord or database data.";
  }

  const roleName=new Map(roles.map(r=>[r.id,r.name]));
  return <main className="subpage">
    <Link href="/" className="back">← Dashboard</Link>
    <div className="pagetop"><div><p className="eyebrow">INTEGRATIONS</p><h1>Discord Control Center</h1><p>Full department Discord synchronization runs every minute, with 30-second live refreshes for active signed-in users.</p></div><span className={roles.length?"connpill online":"connpill offline"}>{roles.length?"● Connected":"● Needs attention"}</span></div>
    {error&&<div className="discordalert panel"><b>Integration warning</b><p>{error}</p></div>}
    <div className="discordhero panel"><div><span className="discordmark">Z6</span><div><b>Zone6 Police Department</b><p>Department personnel ranks are kept aligned with mapped Discord roles automatically, even when officers are not actively using the website.</p></div></div><div className="discordmetrics"><span><b>1m</b> Full Dept Sync</span><span><b>30s</b> Active User Sync</span><span><b>{roles.length}</b> Roles</span><span><b>{mappings.length}</b> Permission Mappings</span></div></div>
    <SyncPersonnel/>
    <div className="twocol discordgrid">
      <section className="panel setting"><div className="paneltitle"><div><b>Permission Role Mapping</b><span>Discord role → Z6PD permission group.</span></div></div><RoleMappingManager roles={roles}/></section>
      <section className="panel setting"><div className="paneltitle"><div><b>Saved Permission Mappings</b><span>Stored in PostgreSQL.</span></div></div>{mappings.length?mappings.map(m=><div className="mappingrow" key={m.id}><span><b>{roleName.get(m.discordRoleId)||"Discord Role"}</b><small>{m.appRole}</small></span><em>{m.syncEnabled?"SYNC ON":"OFF"}</em></div>):<div className="empty">No mappings saved yet.</div>}</section>
    </div>
    <section className="panel rolepanel"><div className="paneltitle"><div><b>Detected Discord Roles</b><span>Use Administration → Ranks & Divisions to map department ranks. Highest rank priority wins automatically.</span></div><span className="rolecount">{roles.length}</span></div><div className="rolelist">{roles.map(r=><div className="roleitem" key={r.id}><span className="roleicon">#</span><div><b>{r.name}</b><small>Position {r.position} · {r.managed?"Discord managed":"Available"}</small></div><code>{r.id}</code></div>)}</div></section>
  </main>;
}
