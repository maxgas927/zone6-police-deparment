import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const guildId = process.env.DISCORD_GUILD_ID;
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!guildId || !token) {
    return NextResponse.json(
      { ok: false, error: "Discord guild ID or bot token is not configured." },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${token}` },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: "Discord rejected the bot connection.", discordStatus: response.status },
        { status: 502 }
      );
    }

    const roles = (await response.json()) as Array<{
      id: string;
      name: string;
      position: number;
      managed: boolean;
    }>;

    return NextResponse.json({
      ok: true,
      guildId,
      roles: roles
        .filter((role) => role.name !== "@everyone")
        .sort((a, b) => b.position - a.position)
        .map(({ id, name, position, managed }) => ({ id, name, position, managed })),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to reach Discord." },
      { status: 502 }
    );
  }
}
