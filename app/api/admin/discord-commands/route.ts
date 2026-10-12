export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

const commands = [
 { name: "promote", description: "Request an officer promotion", options: [
  { name: "officer", description: "Officer", type: 6, required: true },
  { name: "rank", description: "Target rank name", type: 3, required: true },
  { name: "reason", description: "Reason", type: 3, required: true }
 ] },
 { name: "demote", description: "Request an officer demotion", options: [
  { name: "officer", description: "Officer", type: 6, required: true },
  { name: "rank", description: "Target rank name", type: 3, required: true },
  { name: "reason", description: "Reason", type: 3, required: true }
 ] },
 { name: "rankstatus", description: "Show your department rank" }
];
async function guard() {
 const access = await requirePermission("admin.manage");
 return access?.appRoles.includes("COMMAND") ? access : null;
}
export async function GET() {
 if (!await guard()) return NextResponse.json({ error: "Command only" }, { status: 403 });
 const configured = Boolean(process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_GUILD_ID && process.env.DISCORD_CLIENT_ID && process.env.DISCORD_PUBLIC_KEY);
 return NextResponse.json({ configured, commands: commands.map(x => x.name) });
}
export async function POST() {
 const access = await guard();
 if (!access) return NextResponse.json({ error: "Command only" }, { status: 403 });
 const { DISCORD_BOT_TOKEN: token, DISCORD_CLIENT_ID: client, DISCORD_GUILD_ID: guild, DISCORD_PUBLIC_KEY: key } = process.env;
 if (!token || !client || !guild || !key) return NextResponse.json({ error: "Missing Discord bot token, application ID, guild ID or public key in Render." }, { status: 409 });
 const response = await fetch("https://discord.com/api/v10/applications/" + client + "/guilds/" + guild + "/commands", {
  method: "PUT", headers: { Authorization: "Bot " + token, "Content-Type": "application/json" },
  body: JSON.stringify(commands), cache: "no-store"
 });
 if (!response.ok) {
  console.error("DISCORD_COMMAND_REGISTRATION_FAILED", response.status);
  return NextResponse.json({ error: "Discord command registration failed (HTTP " + response.status + "). Verify application ID, bot token and server permissions." }, { status: 502 });
 }
 const result = await response.json() as Array<{ id: string }>;
 await prisma.auditLog.create({ data: { actorId: access.user.id, action: "DISCORD_COMMANDS_REGISTERED", entity: "DiscordApplication", entityId: client, metadata: { count: result.length, names: commands.map(x => x.name) } } });
 return NextResponse.json({ ok: true, count: result.length });
}
