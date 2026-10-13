export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { createPublicKey, verify } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasEffectivePermission } from "@/lib/effective-permissions";
import { changeDiscordRank } from "@/lib/discord";

type Option = { name: string; value?: string | boolean; focused?: boolean };
type Interaction = { type: number; guild_id?: string; member?: { user?: { id: string }; roles?: string[] }; data?: { name?: string; options?: Option[] } };
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
  if (interaction.type === 4) {
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
