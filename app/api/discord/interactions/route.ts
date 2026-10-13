export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { createPublicKey, verify } from "node:crypto";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasEffectivePermission } from "@/lib/effective-permissions";
import type { Permission } from "@/lib/permissions";
import { changeDiscordRank, changeDiscordCallsign, setDiscordNickname } from "@/lib/discord";

type Option = { name: string; value?: string | boolean; focused?: boolean };
type Interaction = { type: number; guild_id?: string; member?: { user?: { id: string }; roles?: string[] }; data?: { name?: string; options?: Option[] } };
const rankAbbreviations:Record<string,string>={"recruit":"REC","cadet":"CDT","probationary officer":"P/O","police officer":"OFF","officer i":"PO I","officer ii":"PO II","officer iii":"PO III","senior officer":"SPO","corporal":"CPL","sergeant":"SGT","staff sergeant":"SSG","lieutenant":"LT","captain":"CPT","major":"MAJ","commander":"CDR","deputy chief":"DCOP","assistant chief":"ACOP","chief of police":"COP","sheriff":"SHF","deputy":"DPTY","detective":"DET","senior detective":"SDET","field training officer":"FTO"};
const respond = (content: string) => NextResponse.json({ type: 4, data: { content, flags: 64 } });

export async function POST(req: Request) {
  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");
  const key = process.env.DISCORD_PUBLIC_KEY;
  if (!signature || !timestamp || !key || !/^[a-f0-9]{128}$/i.test(signature) || !/^[a-f0-9]{64}$/i.test(key)) return new Response("Unauthorized", { status: 401 });
  const raw = await req.text();
  let valid = false;
  try {
    const publicKey = createPublicKey({ key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), Buffer.from(key, "hex")]), format: "der", type: "spki" });
    valid = verify(null, Buffer.from(timestamp + raw), publicKey, Buffer.from(signature, "hex"));
  } catch {}
  if (!valid) return new Response("Invalid signature", { status: 401 });
  let interaction: Interaction;
  try { interaction = JSON.parse(raw) as Interaction; } catch { return respond("Invalid interaction"); }
  if (interaction.type === 1) return NextResponse.json({ type: 1 });
  if (interaction.type !== 2 && interaction.type !== 4) return respond("Unsupported interaction");
  if (!process.env.DISCORD_GUILD_ID || interaction.guild_id !== process.env.DISCORD_GUILD_ID) return respond("This command is restricted to the department server.");
  // Every slash command and autocomplete request requires a mapped Command role.
  const commandMappings = await prisma.discordRoleMapping.findMany({
    where: { discordRoleId: { in: interaction.member?.roles || [] }, syncEnabled: true, appRole: "COMMAND" }
  });
  const commandAuthorized = commandMappings.length > 0 &&
    await hasEffectivePermission(["COMMAND"], "admin.manage");
  if (!commandAuthorized) {
    if (interaction.type === 4) return NextResponse.json({ type: 8, data: { choices: [] } });
    return respond("Only department Command staff may use Z6PD Discord commands.");
  }
  if (interaction.type === 4) {
    if (interaction.data?.name === "transfer") { const q = String(interaction.data?.options?.find(o=>o.name==="division"&&o.focused)?.value||"").slice(0,80); const rows = await prisma.division.findMany({where:{name:{contains:q,mode:"insensitive"}},take:25,orderBy:{name:"asc"}}); return NextResponse.json({type:8,data:{choices:rows.map(x=>({name:x.name,value:x.id}))}}); }
    if (!["promote", "demote"].includes(interaction.data?.name || "")) return NextResponse.json({ type: 8, data: { choices: [] } });
    const focused = interaction.data?.options?.find(o => o.name === "rank" && o.focused);
    const query = typeof focused?.value === "string" ? focused.value.slice(0,80) : "";
    const ranks = await prisma.rank.findMany({ where: { discordRoleId: { not: null }, name: { contains: query, mode: "insensitive" } }, orderBy: { priority: "desc" }, take: 25 });
    return NextResponse.json({ type: 8, data: { choices: ranks.map(r => ({ name: r.name.slice(0,100), value: r.id })) } });
  }
  const discordId = interaction.member?.user?.id;
  if (!discordId) return respond("Discord member not found");
  const account = await prisma.account.findFirst({ where: { provider: "discord", providerAccountId: discordId } });
  if (!account) return respond("Sign in to the department website with Discord first.");
  const command = interaction.data?.name;
  if (command === "rankstatus") {
    const officer = await prisma.officer.findUnique({ where: { userId: account.userId }, include: { rank: true } });
    return respond(officer ? "Your rank: " + (officer.rank?.name || "Unassigned") : "No personnel file found.");
  }
  const options = Object.fromEntries((interaction.data?.options || []).map(o=>[o.name,o.value??""]));
  const mapped = await prisma.discordRoleMapping.findMany({where:{discordRoleId:{in:interaction.member?.roles||[]},syncEnabled:true}});
  const roles = [...new Set(mapped.map(x=>x.appRole))];
  const permitted = async (permission:Permission) => hasEffectivePermission(roles,permission);
  const isCommand = roles.includes("COMMAND") && await permitted("admin.manage");
  const lookupTargetAccount = async () => prisma.account.findFirst({where:{provider:"discord",providerAccountId:String(options.officer||discordId)}});
  const targetOfficer = async () => { const a=await lookupTargetAccount();return a?prisma.officer.findUnique({where:{userId:a.userId},include:{user:true,rank:true,division:true}}):null; };
  const log = async (action:string,entity:string,entityId:string,metadata:Prisma.InputJsonObject={})=>prisma.auditLog.create({data:{actorId:account.userId,action,entity,entityId,metadata}});
  const links:Record<string,string>={hire:"/admin/organization",approve:"/admin/personnel-approvals",deny:"/admin/personnel-approvals",report:"/reports",loa:"/leave"};
  if (command && links[command]) { if(["hire","approve","deny"].includes(command)&&!isCommand)return respond("Command permission required.");return respond("Continue securely on the Z6PD website: https://z6pd.onrender.com"+links[command]); }
  if(command==="officerinfo"){const o=await targetOfficer();return respond(o?"Officer #"+o.badgeNumber+" | "+(o.user.name||"Unknown")+" | "+(o.rank?.name||"Unranked")+" | "+(o.division?.name||"No division")+" | "+o.status:"Officer not found.");}
  if(command==="roster"){if(!await permitted("personnel.manage"))return respond("No roster access.");const officers=await prisma.officer.findMany({take:15,include:{user:true,rank:true},orderBy:{badgeNumber:"asc"}});return respond(officers.map(o=>"#"+o.badgeNumber+" "+(o.user.name||"Officer")+" — "+(o.rank?.name||"Unranked")).join("\n")||"Roster empty.");}
  if(command==="approvals"){if(!isCommand)return respond("Command only.");const items=await prisma.personnelChangeRequest.findMany({where:{status:"PENDING"},take:10,orderBy:{createdAt:"desc"}});return respond(items.map(x=>x.id+" — "+x.kind).join("\n")||"No pending approvals.");}
  if(command==="auditlog"){if(!isCommand)return respond("Command only.");const items=await prisma.auditLog.findMany({take:10,orderBy:{createdAt:"desc"}});return respond(items.map(x=>x.action+" — "+x.createdAt.toISOString().slice(0,16)).join("\n")||"No events.");}
  if(command==="onduty"||command==="offduty"){if(!await permitted("patrol.use"))return respond("Patrol permission required.");const o=await prisma.officer.findUnique({where:{userId:account.userId}});if(!o||o.status!=="ACTIVE")return respond("Active personnel file required.");const open=await prisma.patrolSession.findFirst({where:{officerId:o.id,endedAt:null}});if(command==="onduty"){if(open)return respond("Already on duty.");await prisma.$transaction(async tx=>{const s=await tx.patrolSession.create({data:{officerId:o.id}});await tx.officer.update({where:{id:o.id},data:{dutyStatus:"ON_DUTY"}});await tx.auditLog.create({data:{actorId:account.userId,action:"DISCORD_PATROL_STARTED",entity:"PatrolSession",entityId:s.id}});});return respond("You are now on duty.");}if(!open)return respond("You are already off duty.");const minutes=Math.max(1,Math.round((Date.now()-open.startedAt.getTime())/60000));await prisma.$transaction(async tx=>{await tx.patrolSession.update({where:{id:open.id},data:{endedAt:new Date(),minutes}});await tx.officer.update({where:{id:o.id},data:{dutyStatus:"OFF_DUTY"}});await tx.auditLog.create({data:{actorId:account.userId,action:"DISCORD_PATROL_ENDED",entity:"PatrolSession",entityId:open.id,metadata:{minutes}}});});return respond("Off duty. Patrol duration: "+minutes+" minutes.");}
  if(command==="status"){if(!await permitted("patrol.use"))return respond("Patrol permission required.");const state=String(options.state);if(!["AVAILABLE","BUSY","ON_DUTY","OFF_DUTY"].includes(state))return respond("Invalid status.");const o=await prisma.officer.findUnique({where:{userId:account.userId}});if(!o||o.status!=="ACTIVE")return respond("Active officer required.");if(state==="OFF_DUTY"||state==="ON_DUTY")return respond("Use /offduty or /onduty to track patrol time.");await prisma.officer.update({where:{id:o.id},data:{dutyStatus:state as "AVAILABLE"|"BUSY"}});await log("DISCORD_DUTY_STATUS","Officer",o.id,{state});return respond("Duty status: "+state);}
  if(command==="activeunits"){if(!await permitted("patrol.use"))return respond("Patrol permission required.");const units=await prisma.officer.findMany({where:{dutyStatus:{not:"OFF_DUTY"}},include:{user:true},take:20});return respond(units.map(o=>(o.callsign||o.badgeNumber)+" "+(o.user.name||"Officer")+" — "+o.dutyStatus).join("\n")||"No active units.");}
  if(command==="patrolstats"){if(!await permitted("patrol.use"))return respond("Patrol permission required.");const o=await targetOfficer();if(!o)return respond("Officer not found.");const sessions=await prisma.patrolSession.findMany({where:{officerId:o.id},select:{minutes:true}});return respond("Patrol sessions: "+sessions.length+" | Completed minutes: "+sessions.reduce((n,s)=>n+(s.minutes||0),0));}
  if(command==="bolo"||command==="warrant"){if(!await permitted("reports.review"))return respond("Reports permission required.");const rows=command==="bolo"?await prisma.bolo.findMany({where:{status:"ACTIVE"},take:10,orderBy:{createdAt:"desc"}}):await prisma.warrant.findMany({where:{status:"ACTIVE"},take:10,orderBy:{createdAt:"desc"}});return respond(rows.map(x=>x.number+" — "+("subject" in x?x.subject:"")).join("\n")||"No active records.");}
  if(command==="training"){const o=await targetOfficer();if(!o)return respond("Officer not found.");if(o.userId!==account.userId&&!await permitted("personnel.manage"))return respond("Personnel permission required.");const rows=await prisma.trainingRecord.findMany({where:{officerId:o.id},include:{course:true},take:15});return respond(rows.map(x=>x.course.name).join("\n")||"No training records.");}
  if(command==="transfer"){if(!await permitted("personnel.manage"))return respond("Personnel permission required.");const o=await targetOfficer();const division=await prisma.division.findUnique({where:{id:String(options.division||"")}});const reason=String(options.reason||"").trim();if(!o||!division||o.divisionId===division.id||reason.length<5)return respond("Valid officer, different division, and reason required.");const pending=await prisma.personnelChangeRequest.findFirst({where:{officerId:o.id,kind:"TRANSFER",status:{in:["PENDING","SYNCING","SYNC_FAILED"]}}});if(pending)return respond("Transfer already pending.");const item=await prisma.$transaction(async tx=>{const x=await tx.personnelChangeRequest.create({data:{officerId:o.id,kind:"TRANSFER",targetId:division.id,reason,requestedBy:account.userId}});await tx.auditLog.create({data:{actorId:account.userId,action:"DISCORD_TRANSFER_REQUESTED",entity:"PersonnelChangeRequest",entityId:x.id}});return x;});return respond("Transfer request "+item.id+" submitted for Command approval.");}
  if(command==="setnickname"){
    if(!isCommand)return respond("Command only.");
    const o=await targetOfficer();
    const targetId=String(options.officer||"");
    if(!o||!/^\d{16,22}$/.test(targetId))return respond("Select an officer linked to the Z6PD website.");
    const callsign=String(options.callsign||o.callsign||"").trim().toUpperCase();
    const name=String(options.name||o.user.name||"").trim();
    const rawTitle=String(options.title||o.rank?.name||"").trim();
    const title=rankAbbreviations[rawTitle.toLowerCase()]||rawTitle;
    if(!/^[A-Z0-9][A-Z0-9-]{1,14}$/.test(callsign)||!name||!title||[name,title].some(s=>s.includes("|")||/[\r\n]/.test(s)))return respond("Valid callsign, rank/title and name are required. Do not use | in fields.");
    const nickname=callsign+" | "+title+" | "+name;
    if(nickname.length>32)return respond("Nickname exceeds Discord's 32-character limit ("+nickname.length+"). Shorten the title or name.");
    const conflict=await prisma.officer.findFirst({where:{id:{not:o.id},callsign:{equals:callsign,mode:"insensitive"}},select:{id:true}});
    if(conflict)return respond("That callsign is already assigned.");
    let changed;
    try{changed=await setDiscordNickname(targetId,nickname);}catch(e){return respond(e instanceof Error?e.message:"Discord nickname update failed.");}
    try{
      await prisma.$transaction(async tx=>{
        await tx.officer.update({where:{id:o.id},data:{callsign}});
        if(name!==o.user.name)await tx.user.update({where:{id:o.userId},data:{name}});
        await tx.auditLog.create({data:{actorId:account.userId,action:"DISCORD_NICKNAME_TEMPLATE_APPLIED",entity:"Officer",entityId:o.id,metadata:{from:changed.oldNickname,to:nickname,callsign,displayName:name,title}}});
      });
    }catch(e){console.error("DISCORD_NICKNAME_DB_SYNC_FAILED",e);return respond("Discord nickname changed, but the website database did not update. Command must reconcile this officer.");}
    return respond("Nickname set: "+nickname+"\nWebsite callsign and name updated. Rank roles were not changed.");
  }
  if(command==="setcallsign"){if(!isCommand)return respond("Command only.");const o=await targetOfficer();const callsign=String(options.callsign||"").trim().toUpperCase();const targetId=String(options.officer||"");if(!o||!/^\d{16,22}$/.test(targetId)||!/[A-Z0-9][A-Z0-9-]{1,14}$/.test(callsign))return respond("Select a linked officer and a callsign (2–15 letters, numbers or hyphens).");if(o.callsign===callsign)return respond("That officer already has this callsign.");const collision=await prisma.officer.findFirst({where:{callsign:{equals:callsign,mode:"insensitive"},id:{not:o.id}},select:{id:true}});if(collision)return respond("That callsign is already assigned to another officer.");let changed;try{changed=await changeDiscordCallsign(targetId,callsign);}catch(error){return respond(error instanceof Error?error.message:"Could not update Discord nickname.");}try{await prisma.$transaction(async tx=>{await tx.officer.update({where:{id:o.id},data:{callsign}});await tx.auditLog.create({data:{actorId:account.userId,action:"DISCORD_CALLSIGN_CHANGED",entity:"Officer",entityId:o.id,metadata:{from:o.callsign,to:callsign,oldNickname:changed.oldNickname,newNickname:changed.nickname}}});});return respond("Updated callsign to "+callsign+" and Discord nickname to "+changed.nickname);}catch(error){console.error("CALLSIGN_DB_UPDATE_FAILED",error);return respond("Discord nickname updated, but database update failed. Command staff must reconcile the personnel record.");}}
  if(["fire","suspend","reinstate"].includes(command||"")){if(!isCommand)return respond("Command only.");if(options.confirm!==true)return respond("Set confirm to True to authorize this action.");const reason=String(options.reason||"").trim();const o=await targetOfficer();if(!o||reason.length<5)return respond("Valid officer and reason (at least 5 characters) required.");const next=command==="fire"?"TERMINATED":command==="suspend"?"SUSPENDED":"ACTIVE";if(o.status===next)return respond("Officer already has this status.");await prisma.$transaction(async tx=>{await tx.officer.update({where:{id:o.id},data:{status:next as "TERMINATED"|"SUSPENDED"|"ACTIVE",dutyStatus:"OFF_DUTY"}});await tx.auditLog.create({data:{actorId:account.userId,action:"DISCORD_OFFICER_"+next,entity:"Officer",entityId:o.id,metadata:{reason,previous:o.status}}});});return respond("Officer status updated: "+next+". Review Discord roles separately.");}
  if(command==="announcement"){if(!isCommand)return respond("Command only.");if(options.confirm!==true)return respond("Set confirm to True.");const title=String(options.title||"").trim(),body=String(options.message||"").trim();if(!title||!body||title.length>150||body.length>1800)return respond("Title (max 150) and message (max 1800) required.");const item=await prisma.announcement.create({data:{title,body,authorId:account.userId}});await log("DISCORD_ANNOUNCEMENT_PUBLISHED","Announcement",item.id);return respond("Announcement published: "+title);}

  if (command !== "promote" && command !== "demote") return respond("Unknown command");
  const mappings = await prisma.discordRoleMapping.findMany({ where: { discordRoleId: { in: interaction.member?.roles || [] }, syncEnabled: true } });
  if (!(await hasEffectivePermission([...new Set(mappings.map(x => x.appRole))], "personnel.manage"))) return respond("You cannot request personnel changes.");
  const opts = Object.fromEntries((interaction.data?.options || []).map(o => [o.name, o.value ?? ""]));
  const targetDiscordId = String(opts.officer || "");
  const reason = String(opts.reason || "").trim();
  if (!/^\d{16,22}$/.test(targetDiscordId) || reason.length < 5 || reason.length > 1000) return respond("Select an officer and enter a reason (5–1000 characters).");
  const targetAccount = await prisma.account.findFirst({ where: { provider: "discord", providerAccountId: targetDiscordId } });
  if (!targetAccount) return respond("Officer must link their Discord account to the website.");
  const officer = await prisma.officer.findUnique({ where: { userId: targetAccount.userId }, include: { rank: true } });
  if (!officer) return respond("Officer personnel file not found.");
  const rank = await prisma.rank.findFirst({ where: { OR: [{ id: String(opts.rank || "") }, { name: { equals: String(opts.rank || ""), mode: "insensitive" } }] } });
  if (!rank || !rank.discordRoleId) return respond("Rank not found or not mapped to Discord.");
  const kind = command === "promote" ? "PROMOTION" : "DEMOTION";
  if (rank.id === officer.rankId || (officer.rank && (kind === "PROMOTION" ? rank.priority <= officer.rank.priority : rank.priority >= officer.rank.priority))) return respond("Invalid target rank for this action.");
  const pending = await prisma.personnelChangeRequest.findFirst({ where: { officerId: officer.id, kind, status: { in: ["PENDING", "SYNCING", "SYNC_FAILED"] } } });
  if (pending) return respond("An unresolved request already exists for this officer.");
  if (opts.bypass === true) {
    const commandRoles = [...new Set(mappings.map(x => x.appRole))];
    if (!commandRoles.includes("COMMAND") || !(await hasEffectivePermission(commandRoles, "admin.manage"))) return respond("Only Command staff can bypass the approval process.");
    const currentRankId = officer.rankId;
    try { await changeDiscordRank(targetDiscordId, officer.rank?.discordRoleId || null, rank.discordRoleId); }
    catch (error) { console.error("DISCORD_DIRECT_RANK_SYNC_FAILED", error); return respond("Discord rank update failed. Check the bot role hierarchy and try again."); }
    try {
      await prisma.$transaction(async tx => {
        const changed = await tx.officer.updateMany({ where: { id: officer.id, rankId: currentRankId }, data: { rankId: rank.id } });
        if (changed.count !== 1) throw new Error("Officer rank changed concurrently");
        await tx.promotionHistory.create({ data: { officerId: officer.id, fromRank: officer.rank?.name || null, toRank: rank.name, reason, approvedBy: account.userId } });
        await tx.auditLog.create({ data: { actorId: account.userId, action: "DISCORD_DIRECT_" + kind, entity: "Officer", entityId: officer.id, metadata: { fromRank: officer.rank?.name || null, toRank: rank.name, reason, bypass: true } } });
      });
    } catch (error) { console.error("DISCORD_DIRECT_RANK_DB_FAILED", error); return respond("Discord role changed, but the personnel database did not update. Command must reconcile this officer manually."); }
    return respond(kind === "PROMOTION" ? "Promotion applied immediately: " + rank.name : "Demotion applied immediately: " + rank.name);
  }
  const item = await prisma.$transaction(async tx => {
    const created = await tx.personnelChangeRequest.create({ data: { officerId: officer.id, kind, targetId: rank.id, reason, requestedBy: account.userId } });
    await tx.auditLog.create({ data: { actorId: account.userId, action: "DISCORD_PERSONNEL_CHANGE_REQUESTED", entity: "PersonnelChangeRequest", entityId: created.id, metadata: { kind, rank: rank.name } } });
    return created;
  });
  return respond("Request " + item.id + " submitted. Command can review it on the website.");
}
