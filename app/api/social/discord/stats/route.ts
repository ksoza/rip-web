// app/api/social/discord/stats/route.ts
// Discord server stats — member count, online count, boost level
// Uses Discord Bot API if token available, otherwise returns cached/placeholder data

import { NextRequest, NextResponse } from 'next/server';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID || '1490454432645775401';

// Cache stats for 5 minutes to avoid rate limits
let cachedStats: { data: any; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export async function GET(_req: NextRequest) {
  try {
    // Return cached if fresh
    if (cachedStats && Date.now() - cachedStats.ts < CACHE_TTL) {
      return NextResponse.json(cachedStats.data);
    }

    if (!DISCORD_BOT_TOKEN) {
      // No bot token — return placeholder stats
      const placeholder = {
        memberCount: 47,
        onlineCount: 12,
        boostLevel: 1,
        creationCount: 234,
        userJoined: false,
      };
      cachedStats = { data: placeholder, ts: Date.now() };
      return NextResponse.json(placeholder);
    }

    // Fetch real stats from Discord
    const [guildRes, widgetRes] = await Promise.allSettled([
      fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}?with_counts=true`, {
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          'User-Agent': 'DiscordBot (https://remixip.icu, 1.0)',
        },
      }),
      fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/widget.json`).catch(() => null),
    ]);

    let memberCount = 0;
    let onlineCount = 0;
    let boostLevel = 0;

    if (guildRes.status === 'fulfilled' && guildRes.value.ok) {
      const guild = await guildRes.value.json();
      memberCount = guild.approximate_member_count || 0;
      onlineCount = guild.approximate_presence_count || 0;
      boostLevel = guild.premium_tier || 0;
    }

    // Widget might give online count even without bot
    if (widgetRes.status === 'fulfilled' && widgetRes.value && widgetRes.value.ok) {
      const widget = await widgetRes.value.json();
      if (widget.presence_count) onlineCount = widget.presence_count;
      if (widget.members) memberCount = Math.max(memberCount, widget.members.length);
    }

    const stats = {
      memberCount,
      onlineCount,
      boostLevel,
      creationCount: 0, // TODO: count from our DB
      userJoined: false, // TODO: check if user is in guild
    };

    cachedStats = { data: stats, ts: Date.now() };
    return NextResponse.json(stats);

  } catch (err) {
    console.error('[discord/stats] Error:', err);
    return NextResponse.json({
      memberCount: 0,
      onlineCount: 0,
      boostLevel: 0,
      creationCount: 0,
      userJoined: false,
    });
  }
}
