import Link from "next/link";

type DiscordRole={id:string;name:string;position:number;managed:boolean};
type Status={ok:boolean;guildId?:string;roles?:DiscordRole[];error?:string};

async function getDiscordStatus():Promise<Status>{
  const base=process.env.AUTH_URL||process.env.NEXTAUTH_URL||"https://z6pd.onrender.com";
  try{
    const res=await fetch(`${base}/api/discord/status`,{cache:"no-store"});
    return await res.json();
  }catch{return {ok:false,error:"Unable to check Discord connection."}}
}

export const dynamic="force-dynamic";

export default async function DiscordSettings(){
  const status=await getDiscordStatus();
  const roles=status.roles||[];
  return <main className="subpage">
    <Link href="/" className="back">← Dashboard</Link>
    <div className="pagetop"><div><p className="eyebrow">INTEGRATIONS</p><h1>Discord Control Center</h1><p>Connect Zone6 roles to department access and keep your roster synchronized.</p></div><span className={status.ok?"connpill online":"connpill offline"}>{status.ok?"● Connected":"● Needs attention"}</span></div>
    <div className="discordhero panel">
      <div><span className="discordmark">Z6</span><div><b>Zone6 Police Department</b><p>Guild {status.guildId||process.env.DISCORD_GUILD_ID||"Not configured"}</p></div></div>
      <div className="discordmetrics"><span><b>{roles.length}</b> Roles detected</span><span><b>{roles.filter(r=>r.managed).length}</b> Managed roles</span><span><b>{status.ok?"Online":"Offline"}</b> Bot status</span></div>
    </div>
    {!status.ok&&<div className="discordalert panel"><b>Discord connection failed</b><p>{status.error||"Check the guild ID and bot token in Render."}</p></div>}
    <div className="twocol discordgrid">
      <section className="panel setting"><div className="paneltitle"><div><b>Role Mapping</b><span>Choose what each Discord role grants inside Z6PD.</span></div></div>
        <form action="/api/discord/mappings" method="post" className="mappingform">
          <label>Discord Role<select name="discordRoleId" required defaultValue=""><option value="" disabled>Select a server role</option>{roles.filter(r=>!r.managed).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
          <label>Z6PD Access<select name="appRole" required defaultValue="OFFICER"><option value="OFFICER">Officer</option><option value="SUPERVISOR">Supervisor</option><option value="FTO">FTO / Training</option><option value="IA">Internal Affairs</option><option value="COMMAND">Command / Admin</option></select></label>
          <button className="primary" type="submit">Save Role Mapping</button>
        </form>
        <p className="hint">Only roles you explicitly map will affect website permissions.</p>
      </section>
      <section className="panel setting"><div className="paneltitle"><div><b>Sync Safety</b><span>Built-in protection for your Discord server.</span></div></div>
        <div className="safetyitem"><b>✓ Explicit mappings only</b><span>Unmapped roles are ignored.</span></div>
        <div className="safetyitem"><b>✓ Bot token stays server-side</b><span>Credentials are never returned to the browser.</span></div>
        <div className="safetyitem"><b>✓ Managed roles excluded</b><span>Discord integration roles cannot be mapped accidentally.</span></div>
      </section>
    </div>
    <section className="panel rolepanel"><div className="paneltitle"><div><b>Detected Discord Roles</b><span>Live roles returned by your Z6PD bot.</span></div><span className="rolecount">{roles.length}</span></div>
      <div className="rolelist">{roles.length?roles.map(r=><div className="roleitem" key={r.id}><span className="roleicon">#</span><div><b>{r.name}</b><small>Position {r.position} · {r.managed?"Discord managed":"Available for mapping"}</small></div><code>{r.id}</code></div>):<div className="empty">No roles available.</div>}</div>
    </section>
  </main>
}
