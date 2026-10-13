export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

const commands = [
 { name: "promote", description: "Request an officer promotion", options: [
  { name: "officer", description: "Officer", type: 6, required: true },
  { name: "rank", description: "Select a department rank", type: 3, required: true, autocomplete: true },
  { name: "reason", description: "Reason", type: 3, required: true },
  { name: "bypass", description: "Command only: apply immediately without approval", type: 5, required: false }
 ] },
 { name: "demote", description: "Request an officer demotion", options: [
  { name: "officer", description: "Officer", type: 6, required: true },
  { name: "rank", description: "Select a department rank", type: 3, required: true, autocomplete: true },
  { name: "reason", description: "Reason", type: 3, required: true },
  { name: "bypass", description: "Command only: apply immediately without approval", type: 5, required: false }
 ] },
 { name: "officerinfo", description: "View an officer profile", options: [{name:"officer",description:"Officer",type:6,required:false}] },
 { name: "roster", description: "View department roster" },
 { name: "approvals", description: "List pending personnel requests" },
 { name: "onduty", description: "Start patrol duty" },
 { name: "offduty", description: "End patrol duty" },
 { name: "activeunits", description: "View active units" },
 { name: "patrolstats", description: "View patrol statistics" },
 { name: "auditlog", description: "View recent audit events" },
 { name: "bolo", description: "View active BOLOs" },
 { name: "warrant", description: "View active warrants" },
 { name: "training", description: "View your training records" },
 { name: "report", description: "Open report creation" },
 { name: "loa", description: "Open leave request form" },
 { name: "hire", description: "Open officer onboarding" },
 { name: "approve", description: "Open personnel approval queue" },
 { name: "deny", description: "Open personnel approval queue" },
 { name: "transfer", description: "Request officer division transfer", options: [{name:"officer",description:"Officer",type:6,required:true},{name:"division",description:"Division",type:3,required:true,autocomplete:true},{name:"reason",description:"Reason",type:3,required:true}] },
 { name: "setnickname", description: "Set officer nickname using Callsign | Rank | Name template", options: [{name:"officer",description:"Officer",type:6,required:true},{name:"callsign",description:"Callsign (defaults to roster)",type:3,required:false},{name:"title",description:"Select rank abbreviation (defaults to roster)",type:3,required:false,autocomplete:true},{name:"name",description:"Name (defaults to roster)",type:3,required:false}] },
 { name: "setcallsign", description: "Update officer callsign", options: [{name:"officer",description:"Officer",type:6,required:true},{name:"callsign",description:"New callsign",type:3,required:true}] },
 { name: "status", description: "Set duty status", options: [{name:"state",description:"Status",type:3,required:true,choices:[{name:"Available",value:"AVAILABLE"},{name:"Busy",value:"BUSY"},{name:"On duty",value:"ON_DUTY"},{name:"Off duty",value:"OFF_DUTY"}]}] },
 { name: "fire", description: "Terminate an officer (Command only)", options: [{name:"officer",description:"Officer",type:6,required:true},{name:"reason",description:"Reason",type:3,required:true},{name:"confirm",description:"Confirm termination",type:5,required:true}] },
 { name: "suspend", description: "Suspend an officer (Command only)", options: [{name:"officer",description:"Officer",type:6,required:true},{name:"reason",description:"Reason",type:3,required:true},{name:"confirm",description:"Confirm suspension",type:5,required:true}] },
 { name: "reinstate", description: "Reinstate an officer (Command only)", options: [{name:"officer",description:"Officer",type:6,required:true},{name:"reason",description:"Reason",type:3,required:true},{name:"confirm",description:"Confirm reinstatement",type:5,required:true}] },
 { name: "announcement", description: "Publish announcement (Command only)", options: [{name:"title",description:"Title",type:3,required:true},{name:"message",description:"Message",type:3,required:true},{name:"confirm",description:"Confirm publication",type:5,required:true}] },
 { name: "rankstatus", description: "Show your department rank" }
];
async function guard() {
 const access = await requirePermission("admin.manage");
 return access?.appRoles.includes("COMMAND") ? access : null;
}
export async function GET() {
 if (!await guard()) return NextResponse.json({ error: "Command only" }, { status: 403 });
 const configured = Boolean(process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_GUILD_ID && process.env.DISCORD_CLIENT_ID);
 return NextResponse.json({ configured, commands: commands.map(x => x.name) });
}
export async function POST() {
 const access = await guard();
 if (!access) return NextResponse.json({ error: "Command only" }, { status: 403 });
 const { DISCORD_BOT_TOKEN: token, DISCORD_CLIENT_ID: client, DISCORD_GUILD_ID: guild } = process.env;
 const missing = [["DISCORD_BOT_TOKEN",token],["DISCORD_CLIENT_ID",client],["DISCORD_GUILD_ID",guild]].filter(([,value])=>!value).map(([name])=>name);
 if (missing.length) return NextResponse.json({ error: "Missing Render environment variables: "+missing.join(", ") }, { status: 409 });
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
