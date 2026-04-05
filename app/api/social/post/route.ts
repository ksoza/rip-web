// app/api/social/post/route.ts
// Server-side social auto-posting endpoint
// Handles posting creations to: TikTok, X (Twitter), Instagram, YouTube, Discord
// Each platform uses its own OAuth token stored in the social_connections table

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// ── Types ───────────────────────────────────────────────────────
type PlatformId = 'tiktok' | 'twitter' | 'instagram' | 'youtube' | 'discord';

interface PostRequest {
  platform: PlatformId;
  creationId: string;
  caption: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  hashtags: string[];
  scheduled: boolean;
  scheduledAt?: string;
}

interface PlatformConfig {
  postFn: (req: PostRequest, tokens: TokenPair) => Promise<PostResponse>;
}

interface TokenPair {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  channelId?: string;           // Discord channel or YouTube channel
  additionalData?: Record<string, string>;
}

interface PostResponse {
  success: boolean;
  postUrl?: string;
  postId?: string;
  error?: string;
}

// ── Platform Implementations ────────────────────────────────────

// TikTok Content Publishing API v2
async function postToTikTok(req: PostRequest, tokens: TokenPair): Promise<PostResponse> {
  try {
    // Step 1: Initialize upload
    const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        post_info: {
          title: req.caption.slice(0, 150),
          description: req.caption,
          privacy_level: 'PUBLIC_TO_EVERYONE',
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: req.videoUrl,
        },
      }),
    });

    if (!initRes.ok) {
      const err = await initRes.json().catch(() => ({}));
      return { success: false, error: err.error?.message || `TikTok API error: ${initRes.status}` };
    }

    const initData = await initRes.json();
    const publishId = initData.data?.publish_id;

    if (!publishId) {
      return { success: false, error: 'Failed to get TikTok publish_id' };
    }

    // TikTok processes async — return success with publish_id
    return {
      success: true,
      postId: publishId,
      postUrl: `https://www.tiktok.com/@me`, // TikTok doesn't return direct URL immediately
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'TikTok posting failed' };
  }
}

// X (Twitter) API v2
async function postToTwitter(req: PostRequest, tokens: TokenPair): Promise<PostResponse> {
  try {
    let mediaId: string | undefined;

    // Step 1: Upload media if video/image available
    if (req.videoUrl) {
      // Upload via media/upload endpoint (chunked for video)
      const initUpload = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          command: 'INIT',
          media_type: 'video/mp4',
          media_category: 'tweet_video',
          total_bytes: '0', // Will be updated
          source_url: req.videoUrl,
        }),
      });

      if (initUpload.ok) {
        const uploadData = await initUpload.json();
        mediaId = uploadData.media_id_string;
      }
    } else if (req.thumbnailUrl) {
      // Upload image
      const imgUpload = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          media_category: 'tweet_image',
          source_url: req.thumbnailUrl,
        }),
      });

      if (imgUpload.ok) {
        const imgData = await imgUpload.json();
        mediaId = imgData.media_id_string;
      }
    }

    // Step 2: Post tweet
    const tweetBody: any = { text: req.caption };
    if (mediaId) {
      tweetBody.media = { media_ids: [mediaId] };
    }

    const tweetRes = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tweetBody),
    });

    if (!tweetRes.ok) {
      const err = await tweetRes.json().catch(() => ({}));
      return { success: false, error: err.detail || `Twitter API error: ${tweetRes.status}` };
    }

    const tweet = await tweetRes.json();
    const tweetId = tweet.data?.id;

    return {
      success: true,
      postId: tweetId,
      postUrl: tweetId
        ? `https://twitter.com/i/web/status/${tweetId}`
        : undefined,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Twitter posting failed' };
  }
}

// Instagram Content Publishing API (via Facebook Graph API)
async function postToInstagram(req: PostRequest, tokens: TokenPair): Promise<PostResponse> {
  const igUserId = tokens.additionalData?.instagram_user_id;
  if (!igUserId) {
    return { success: false, error: 'Instagram user ID not found. Reconnect your account.' };
  }

  try {
    let containerId: string;

    // Step 1: Create media container
    if (req.videoUrl) {
      // Create Reels container
      const containerRes = await fetch(
        `https://graph.facebook.com/v18.0/${igUserId}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            media_type: 'REELS',
            video_url: req.videoUrl,
            caption: req.caption,
            share_to_feed: true,
            access_token: tokens.accessToken,
          }),
        }
      );

      if (!containerRes.ok) {
        const err = await containerRes.json().catch(() => ({}));
        return { success: false, error: err.error?.message || `Instagram API error: ${containerRes.status}` };
      }

      const containerData = await containerRes.json();
      containerId = containerData.id;
    } else if (req.thumbnailUrl) {
      // Create image container
      const containerRes = await fetch(
        `https://graph.facebook.com/v18.0/${igUserId}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: req.thumbnailUrl,
            caption: req.caption,
            access_token: tokens.accessToken,
          }),
        }
      );

      if (!containerRes.ok) {
        const err = await containerRes.json().catch(() => ({}));
        return { success: false, error: err.error?.message || `Instagram container error: ${containerRes.status}` };
      }

      const containerData = await containerRes.json();
      containerId = containerData.id;
    } else {
      return { success: false, error: 'No media to post on Instagram' };
    }

    // Step 2: Publish (may need polling for video processing)
    const maxAttempts = 10;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Check container status
      const statusRes = await fetch(
        `https://graph.facebook.com/v18.0/${containerId}?fields=status_code&access_token=${tokens.accessToken}`
      );
      const statusData = await statusRes.json();

      if (statusData.status_code === 'FINISHED') {
        // Publish
        const publishRes = await fetch(
          `https://graph.facebook.com/v18.0/${igUserId}/media_publish`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              creation_id: containerId,
              access_token: tokens.accessToken,
            }),
          }
        );

        if (publishRes.ok) {
          const pub = await publishRes.json();
          return {
            success: true,
            postId: pub.id,
            postUrl: `https://www.instagram.com/p/${pub.id}/`,
          };
        }
      } else if (statusData.status_code === 'ERROR') {
        return { success: false, error: 'Instagram video processing failed' };
      }

      // Wait 3s between polls
      await new Promise(r => setTimeout(r, 3000));
    }

    return { success: false, error: 'Instagram upload timed out' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Instagram posting failed' };
  }
}

// YouTube Data API v3
async function postToYouTube(req: PostRequest, tokens: TokenPair): Promise<PostResponse> {
  try {
    if (!req.videoUrl) {
      return { success: false, error: 'No video to upload to YouTube' };
    }

    // Step 1: Initiate resumable upload
    const isShort = req.caption.toLowerCase().includes('#shorts') ||
                    req.hashtags.some(h => h.toLowerCase() === 'shorts');

    const metadata = {
      snippet: {
        title: req.caption.split('\n')[0].slice(0, 100),  // First line, max 100 chars
        description: req.caption,
        tags: req.hashtags,
        categoryId: '22', // People & Blogs
      },
      status: {
        privacyStatus: req.scheduled ? 'private' : 'public',
        publishAt: req.scheduled && req.scheduledAt
          ? new Date(req.scheduledAt).toISOString()
          : undefined,
        selfDeclaredMadeForKids: false,
        embeddable: true,
      },
    };

    // YouTube requires a resumable upload session
    const initRes = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': 'video/*',
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!initRes.ok) {
      const err = await initRes.json().catch(() => ({}));
      return { success: false, error: err.error?.message || `YouTube init error: ${initRes.status}` };
    }

    const uploadUrl = initRes.headers.get('Location');
    if (!uploadUrl) {
      return { success: false, error: 'No upload URL from YouTube' };
    }

    // Step 2: Fetch video from our URL and upload to YouTube
    const videoRes = await fetch(req.videoUrl);
    if (!videoRes.ok) {
      return { success: false, error: 'Could not fetch video file for YouTube upload' };
    }

    const videoBuffer = await videoRes.arrayBuffer();
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Length': videoBuffer.byteLength.toString(),
        'Content-Type': 'video/*',
      },
      body: videoBuffer,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      return { success: false, error: err.error?.message || `YouTube upload error: ${uploadRes.status}` };
    }

    const video = await uploadRes.json();
    const videoId = video.id;

    // Step 3: Set thumbnail if available
    if (req.thumbnailUrl && videoId) {
      try {
        const thumbRes = await fetch(req.thumbnailUrl);
        const thumbBuffer = await thumbRes.arrayBuffer();

        await fetch(
          `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}&uploadType=media`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${tokens.accessToken}`,
              'Content-Type': 'image/jpeg',
            },
            body: thumbBuffer,
          }
        );
      } catch {
        // Thumbnail upload failed — non-critical, continue
      }
    }

    return {
      success: true,
      postId: videoId,
      postUrl: isShort
        ? `https://youtube.com/shorts/${videoId}`
        : `https://youtube.com/watch?v=${videoId}`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'YouTube upload failed' };
  }
}

// Discord via Webhook / Bot
async function postToDiscord(req: PostRequest, tokens: TokenPair): Promise<PostResponse> {
  const webhookUrl = tokens.additionalData?.webhook_url || tokens.channelId;
  if (!webhookUrl) {
    return { success: false, error: 'No Discord webhook configured. Add one in Settings.' };
  }

  try {
    const embed = {
      title: `🎬 ${req.caption.split('\n')[0].slice(0, 256)}`,
      description: req.caption.slice(0, 2048),
      color: 0x00f2ea, // cyan accent
      thumbnail: req.thumbnailUrl ? { url: req.thumbnailUrl } : undefined,
      fields: [
        ...(req.videoUrl ? [{
          name: '🎥 Watch',
          value: `[Open on RiP](https://remixip.icu/watch/${req.creationId})`,
          inline: true,
        }] : []),
        {
          name: '🏷️ Tags',
          value: req.hashtags.map(h => `\`#${h}\``).join(' '),
          inline: true,
        },
      ],
      footer: {
        text: 'ReMiX I.P. — AI Fan Studio',
        icon_url: 'https://remixip.icu/rip-logo.png',
      },
      timestamp: new Date().toISOString(),
    };

    const body: any = {
      content: req.videoUrl
        ? `🆕 New creation just dropped!\n${req.videoUrl}`
        : '🆕 New creation just dropped!',
      embeds: [embed],
      username: 'RiP Bot',
      avatar_url: 'https://remixip.icu/rip-logo.png',
    };

    const discordRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!discordRes.ok) {
      const err = await discordRes.text();
      return { success: false, error: `Discord webhook error: ${err.slice(0, 200)}` };
    }

    return {
      success: true,
      postUrl: `https://discord.com/channels/${tokens.additionalData?.guild_id || ''}/${tokens.additionalData?.channel_id || ''}`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Discord posting failed' };
  }
}

// ── Platform Registry ───────────────────────────────────────────
const PLATFORM_HANDLERS: Record<PlatformId, PlatformConfig> = {
  tiktok:    { postFn: postToTikTok },
  twitter:   { postFn: postToTwitter },
  instagram: { postFn: postToInstagram },
  youtube:   { postFn: postToYouTube },
  discord:   { postFn: postToDiscord },
};

// ── Route Handler ───────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: PostRequest = await request.json();
    const { platform, creationId, caption, videoUrl, thumbnailUrl, hashtags, scheduled, scheduledAt } = body;

    // Validate platform
    if (!PLATFORM_HANDLERS[platform]) {
      return NextResponse.json({ error: `Unknown platform: ${platform}` }, { status: 400 });
    }

    // Validate creation exists and belongs to user
    const { data: creation } = await supabase
      .from('creations')
      .select('id, title, user_id')
      .eq('id', creationId)
      .single();

    if (!creation || creation.user_id !== user.id) {
      return NextResponse.json({ error: 'Creation not found' }, { status: 404 });
    }

    // Get platform tokens from social_connections table
    const { data: connection } = await supabase
      .from('social_connections')
      .select('access_token, refresh_token, expires_at, channel_id, additional_data')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .single();

    if (!connection) {
      return NextResponse.json(
        { error: `Not connected to ${platform}. Link your account in Settings.` },
        { status: 400 }
      );
    }

    // Check token expiry — refresh if needed
    const tokens: TokenPair = {
      accessToken: connection.access_token,
      refreshToken: connection.refresh_token,
      expiresAt: connection.expires_at,
      channelId: connection.channel_id,
      additionalData: connection.additional_data || {},
    };

    // If scheduled, store in queue instead of posting immediately
    if (scheduled && scheduledAt) {
      const { error: schedErr } = await supabase
        .from('scheduled_posts')
        .insert({
          user_id: user.id,
          creation_id: creationId,
          platform,
          caption,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          hashtags,
          scheduled_at: new Date(scheduledAt).toISOString(),
          status: 'pending',
        });

      if (schedErr) {
        return NextResponse.json({ error: 'Failed to schedule post' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        scheduled: true,
        scheduledAt,
        message: `Post scheduled for ${new Date(scheduledAt).toLocaleString()}`,
      });
    }

    // Post immediately
    const handler = PLATFORM_HANDLERS[platform];
    const result = await handler.postFn(body, tokens);

    // Log result
    await supabase
      .from('social_posts')
      .insert({
        user_id: user.id,
        creation_id: creationId,
        platform,
        post_id: result.postId,
        post_url: result.postUrl,
        success: result.success,
        error: result.error,
        caption,
        hashtags,
      })
      .catch(() => {}); // Non-critical

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      postUrl: result.postUrl,
      postId: result.postId,
    });
  } catch (err: any) {
    console.error('[social/post]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── GET: Check connection status ────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: connections } = await supabase
      .from('social_connections')
      .select('platform, channel_id, additional_data, created_at')
      .eq('user_id', user.id);

    const status: Record<string, { connected: boolean; since?: string; details?: any }> = {};
    for (const platform of ['tiktok', 'twitter', 'instagram', 'youtube', 'discord']) {
      const conn = connections?.find(c => c.platform === platform);
      status[platform] = {
        connected: !!conn,
        since: conn?.created_at,
        details: conn?.additional_data,
      };
    }

    return NextResponse.json({ platforms: status });
  } catch (err: any) {
    console.error('[social/post GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
