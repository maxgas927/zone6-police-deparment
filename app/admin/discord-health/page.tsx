import Link from "next/link";
import {redirect} from "next/navigation";
import {requirePermission} from "@/lib/authz";
import {prisma} from "@/lib/prisma";
export const dynamic="force-dynamic";
export default async function DiscordHealth(){
 const a=await requirePermission("admin.manage");if(!a?.appRoles.includes("COMMAND"))redirect("/");
 const last=await prisma.auditLog.findFirst({where:{action:"DISCORD_DEPARTMENT_SYNC"},orderBy:{createdAt:"desc"}});
 const result=globalThis.__z6pdLastDepartmentDiscordSyncResult;
 return <main className="subpage"><Link className="back" href="/admin/v10">← V10 Hub</Link><div className="pagetop"><div><p className="eyebrow">V10.0 · STABILITY</p><h1>Discord Health</h1><p>Live process-local sync indicators and last recorded manual sync.</p></div></div>
 <div className="personnelstats"><div><b>{process.env.DISCORD_BOT_TOKEN&&process.env.DISCORD_GUILD_ID?"Configured":"Needs setup"}</b><span>Bot Credentials</span></div><div><b>{result?.synced??"—"}</b><span>Last Auto Synced</span></div><div><b>{result?.failed??"—"}</b><span>Last Auto Failures</span></div><div><b>{result?.rateLimited?"Yes":"No"}</b><span>Last Rate Limit</span></div></div>
 <section className="panel"><div className="v4shortcuts"><Link href="/admin/discord-commands"><b>Discord Commands →</b><small>Review and register slash commands</small></Link><Link href="/discord"><b>Discord Role Mapping →</b><small>Review website and guild access roles</small></Link></div></section><section className="panel"><h3>Synchronization timeline</h3><p>Last automatic sync: {globalThis.__z6pdLastDepartmentDiscordSyncAt?new Date(globalThis.__z6pdLastDepartmentDiscordSyncAt).toLocaleString():"Not recorded in this process"}</p><p>Next expected sync: {globalThis.__z6pdNextDepartmentDiscordSyncAt?new Date(globalThis.__z6pdNextDepartmentDiscordSyncAt).toLocaleString():"Unknown"}</p><p>Last manual sync: {last?.createdAt.toLocaleString()||"No recorded manual sync"}</p><p className="hint">Process-local values reset after redeploys and may differ across instances. Credentials are never displayed.</p></section>
 </main>;
}