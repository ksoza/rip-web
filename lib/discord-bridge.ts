// lib/discord-bridge.ts
// Discord ↔ Platform bridge — sends notifications to Discord channels
// Uses Discord bot token via webhook-style HTTP posts

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = '1490454432645775401';

// Channel IDs from the ReMiX IP Discord server
const CHANNELS = {
  showcase:      '1490514698418917558',
  announcements: '1490454433966854407',
  general:       '1490454434445135923',
  nftGallery:    '1490514710494449856',
  ripToken:      '1490514713300308129',
} as const;

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  thumbnail?: { url: string };
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  url?: string;
  image?: { url: string };
  timestamp?: string;
}

async function sendDiscordMessage(channelId: string, content: string, embeds?: DiscordEmbed[]) {
  if (!DISCORD_BOT_TOKEN) {
    console.warn('[Discord Bridge] No bot token configured — skipping notification');
    return null;
  }

  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'DiscordBot (https://remixip.icu, 1.0)',
      },
      body: JSON.stringify({ content, embeds }),
    });

    if (!res.ok) {
      console.error(`[Discord Bridge] Failed: ${res.status} ${await res.text()}`);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error('[Discord Bridge] Error:', err);
    return null;
  }
}

// ── Public API ───────────────────────────────────────────────────

/** Notify #showcase when a new remix is published */
export async function notifyNewRemix(data: {
  title: string;
  creator: string;
  sourceIp: string;
  thumbnailUrl?: string;
  remixUrl?: string;
}) {
  const embed: DiscordEmbed = {
    title: `🎬 ${data.title}`,
    description: `A new remix of **${data.sourceIp}** just dropped!`,
    color: 0xff2d78, // ReMiX pink
    fields: [
      { name: 'Creator', value: data.creator, inline: true },
      { name: 'Source IP', value: data.sourceIp, inline: true },
    ],
    footer: { text: 'ReMiX IP • remixip.icu' },
    timestamp: new Date().toISOString(),
  };

  if (data.thumbnailUrl) embed.thumbnail = { url: data.thumbnailUrl };
  if (data.remixUrl) embed.url = data.remixUrl;

  return sendDiscordMessage(
    CHANNELS.showcase,
    '',
    [embed]
  );
}

/** Notify #nft-gallery when an NFT is minted */
export async function notifyNFTMint(data: {
  title: string;
  creator: string;
  mintAddress: string;
  imageUrl?: string;
  editions?: number;
}) {
  const embed: DiscordEmbed = {
    title: `🖼️ New NFT Minted: ${data.title}`,
    description: `**${data.creator}** just minted a remix NFT on Solana!`,
    color: 0xa855f7, // Purple
    fields: [
      { name: 'Mint Address', value: `\`${data.mintAddress.slice(0, 8)}...${data.mintAddress.slice(-6)}\``, inline: true },
      ...(data.editions ? [{ name: 'Editions', value: `${data.editions}`, inline: true }] : []),
    ],
    footer: { text: 'ReMiX IP NFTs • Solana' },
    timestamp: new Date().toISOString(),
  };

  if (data.imageUrl) embed.image = { url: data.imageUrl };

  return sendDiscordMessage(CHANNELS.nftGallery, '', [embed]);
}

/** Post platform announcements to #announcements */
export async function postAnnouncement(data: {
  title: string;
  body: string;
  url?: string;
}) {
  const embed: DiscordEmbed = {
    title: `📢 ${data.title}`,
    description: data.body,
    color: 0x00d4ff, // Cyan
    footer: { text: 'ReMiX IP • remixip.icu' },
    timestamp: new Date().toISOString(),
  };

  if (data.url) embed.url = data.url;

  return sendDiscordMessage(CHANNELS.announcements, '', [embed]);
}

/** Notify #general about trending content */
export async function notifyTrending(data: {
  title: string;
  creator: string;
  views: number;
  likes: number;
}) {
  const embed: DiscordEmbed = {
    title: `🔥 Trending: ${data.title}`,
    description: `This remix by **${data.creator}** is blowing up!`,
    color: 0xff8c00, // Orange
    fields: [
      { name: '👀 Views', value: data.views.toLocaleString(), inline: true },
      { name: '❤️ Likes', value: data.likes.toLocaleString(), inline: true },
    ],
    footer: { text: 'Check it out on remixip.icu' },
    timestamp: new Date().toISOString(),
  };

  return sendDiscordMessage(CHANNELS.general, '', [embed]);
}
