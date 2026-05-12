// app/api/social/discord/feed/route.ts
// Discord channel feed — fetches recent messages from a channel
// Uses Discord Bot API if token available

import { NextRequest, NextResponse } from 'next/server';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

// Channel IDs from the ReMiX IP Discord server
const ALLOWED_CHANNELS: Record<string, string> = {
  showcase:      '1490514698418917558',
  announcements: '1490454433966854407',
  general:       '1490454434445135923',
  nftGallery:    '1490514710494449856',
  ripToken:      '1490514713300308129',
};

interface DiscordMessage {
  id: string;
  author: { name: string; avatar?: string; badge?: string };
  content: string;
  timestamp: string;
  channel: string;
  attachments?: { url: string; type: 'image' | 'video' }[];
  reactions?: { emoji: string; count: number }[];
}

export async function GET(req: NextRequest) {
  try {
    const channelName = req.nextUrl.searchParams.get('channel') || 'general';
    const channelId = ALLOWED_CHANNELS[channelName] || ALLOWED_CHANNELS.general;

    if (!DISCORD_BOT_TOKEN) {
      // Return placeholder messages when no bot token
      return NextResponse.json({
        messages: getPlaceholderMessages(),
        source: 'placeholder',
      });
    }

    // Fetch real messages from Discord
    const res = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages?limit=20`,
      {
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          'User-Agent': 'DiscordBot (https://remixip.icu, 1.0)',
        },
      }
    );

    if (!res.ok) {
      console.error(`[discord/feed] Failed to fetch: ${res.status}`);
      return NextResponse.json({
        messages: getPlaceholderMessages(),
        source: 'fallback',
      });
    }

    const rawMessages = await res.json();

    const messages: DiscordMessage[] = rawMessages.map((msg: any) => ({
      id: msg.id,
      author: {
        name: msg.author.global_name || msg.author.username,
        avatar: msg.author.avatar
          ? `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png?size=64`
          : undefined,
        badge: msg.author.bot ? 'BOT' : undefined,
      },
      content: msg.content,
      timestamp: msg.timestamp,
      channel: channelName,
      attachments: (msg.attachments || []).map((a: any) => ({
        url: a.url,
        type: a.content_type?.startsWith('video') ? 'video' : 'image',
      })),
      reactions: (msg.reactions || []).map((r: any) => ({
        emoji: r.emoji.name,
        count: r.count,
      })),
    }));

    return NextResponse.json({ messages, source: 'live' });

  } catch (err) {
    console.error('[discord/feed] Error:', err);
    return NextResponse.json({
      messages: getPlaceholderMessages(),
      source: 'error-fallback',
    });
  }
}

function getPlaceholderMessages(): DiscordMessage[] {
  return [
    {
      id: '1',
      author: { name: 'RiP Bot', badge: 'BOT' },
      content: '🎬 New creation dropped by @creator123 — check it out in the showcase!',
      timestamp: new Date().toISOString(),
      channel: 'showcase',
      reactions: [{ emoji: '🔥', count: 5 }, { emoji: '❤️', count: 3 }],
    },
    {
      id: '2',
      author: { name: 'xKreator' },
      content: 'Just minted my first NFT on the platform! The mint-on-publish flow is smooth 💎',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      channel: 'general',
      reactions: [{ emoji: '🙌', count: 7 }],
    },
    {
      id: '3',
      author: { name: 'ReMiXr_OG' },
      content: 'Who else staking $RiP? The APY on the 3-month lock is insane 📈',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      channel: 'staking',
      reactions: [{ emoji: '💎', count: 4 }, { emoji: '🚀', count: 2 }],
    },
    {
      id: '4',
      author: { name: 'FilmFan42' },
      content: 'The Walking Dead remix with the anime style is INSANE. How do you guys come up with these?',
      timestamp: new Date(Date.now() - 14400000).toISOString(),
      channel: 'general',
      reactions: [{ emoji: '😂', count: 2 }],
    },
  ];
}
