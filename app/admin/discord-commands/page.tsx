import Link from "next/link";
import {redirect} from "next/navigation";
import {requirePermission} from "@/lib/authz";
import DiscordCommandRegistration from "./DiscordCommandRegistration";
export const dynamic="force-dynamic";
export default async function DiscordCommandsPage(){
 const access=await requirePermission("admin.manage");
 if(!access?.appRoles.includes("COMMAND"))redirect("/");
 return <main className="subpage"><Link href="/admin/v10" className="back">← V10 Command Hub</Link><div className="pagetop"><div><p className="eyebrow">V10.2 · DISCORD BOT</p><h1>Discord Slash Commands</h1><p>View and register Z6PD slash commands for your Discord server.</p></div><span className="connpill online">COMMAND ONLY</span></div><DiscordCommandRegistration/><section className="panel"><h3>Before registering</h3><p className="hint">Confirm the bot is invited to the correct Discord server and that DISCORD_CLIENT_ID, DISCORD_GUILD_ID and DISCORD_BOT_TOKEN are set on Render. Registration replaces the application's guild command list. Command execution still follows server-side permissions.</p><Link href="/admin/discord-health">Discord health →</Link></section></main>;
}
