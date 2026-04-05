// app/api/social/connect/route.ts
// OAuth connection flow for social platforms
// Initiates the OAuth2 redirect for TikTok, X/Twitter, Instagram, YouTube
// Handles callback with token exchange and stores in social_connections table

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// ── Platform OAuth Configs ──────────────────────────────────────
type PlatformId = 'tiktok' | 'twitter' | 'instagram' | 'youtube' | 'discord';

interface OAuthConfig {
  authUrl: string;
  tokenUrl: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  scopes: string[];
  extraParams?: Record<string, string>;
}

const OAUTH_CONFIGS: Record<PlatformId, OAuthConfig> = {
  tiktok: {
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    clientIdEnv: 'TIKTOK_CLIENT_KEY',
    clientSecretEnv: 'TIKTOK_CLIENT_SECRET',
    scopes: ['user.info.basic', 'video.publish', 'video.upload'],
    extraParams: { response_type: 'code' },
  },
  twitter: {
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    clientIdEnv: 'TWITTER_CLIENT_ID',
    clientSecretEnv: 'TWITTER_CLIENT_SECRET',
    scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
    extraParams: { response_type: 'code', code_challenge_method: 'S256' },
  },
  instagram: {
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    clientIdEnv: 'INSTAGRAM_APP_ID',
    clientSecretEnv: 'INSTAGRAM_APP_SECRET',
    scopes: ['instagram_basic', 'instagram_content_publish', 'pages_show_list'],
  },
  youtube: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientIdEnv: 'YOUTUBE_CLIENT_ID',
    clientSecretEnv: 'YOUTUBE_CLIENT_SECRET',
    scopes: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.force-ssl',
    ],
    extraParams: { access_type: 'offline', prompt: 'consent' },
  },
  discord: {
    authUrl: 'https://discord.com/api/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    clientIdEnv: 'DISCORD_CLIENT_ID',
    clientSecretEnv: 'DISCORD_CLIENT_SECRET',
    scopes: ['identify', 'guilds', 'webhook.incoming'],
  },
};

const REDIRECT_BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://remixip.icu';

// ── GET: Initiate OAuth flow ────────────────────────────────────
export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${REDIRECT_BASE}/login?redirect=/settings`);
  }

  const platform = request.nextUrl.searchParams.get('platform') as PlatformId;
  if (!platform || !OAUTH_CONFIGS[platform]) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  }

  const config = OAUTH_CONFIGS[platform];
  const clientId = process.env[config.clientIdEnv];

  if (!clientId) {
    return NextResponse.json(
      { error: `${platform} not configured. Missing ${config.clientIdEnv}.` },
      { status: 500 }
    );
  }

  // Generate state token
  const state = Buffer.from(JSON.stringify({
    userId: user.id,
    platform,
    ts: Date.now(),
  })).toString('base64url');

  // Store state in Supabase for verification
  await supabase
    .from('oauth_states')
    .upsert({
      state,
      user_id: user.id,
      platform,
      created_at: new Date().toISOString(),
    });

  const redirectUri = `${REDIRECT_BASE}/api/social/callback`;

  // Build OAuth URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: config.scopes.join(' '),
    state,
    ...(config.extraParams || {}),
  });

  // Twitter PKCE
  if (platform === 'twitter') {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    params.set('code_challenge', codeChallenge);

    // Store verifier for token exchange
    await supabase
      .from('oauth_states')
      .update({ code_verifier: codeVerifier })
      .eq('state', state);
  }

  return NextResponse.redirect(`${config.authUrl}?${params.toString()}`);
}

// ── POST: Handle callback / token exchange ──────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const body = await request.json();
    const { code, state, platform: platformOverride } = body;

    if (!state) {
      return NextResponse.json({ error: 'Missing state parameter' }, { status: 400 });
    }

    // Verify state
    const { data: stateRecord } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('state', state)
      .single();

    if (!stateRecord) {
      return NextResponse.json({ error: 'Invalid or expired state' }, { status: 400 });
    }

    // Check expiry (15 min)
    const stateAge = Date.now() - new Date(stateRecord.created_at).getTime();
    if (stateAge > 15 * 60 * 1000) {
      await supabase.from('oauth_states').delete().eq('state', state);
      return NextResponse.json({ error: 'State expired' }, { status: 400 });
    }

    const platform = stateRecord.platform as PlatformId;
    const config = OAUTH_CONFIGS[platform];
    const clientId = process.env[config.clientIdEnv]!;
    const clientSecret = process.env[config.clientSecretEnv]!;
    const redirectUri = `${REDIRECT_BASE}/api/social/callback`;

    // Exchange code for tokens
    const tokenParams: Record<string, string> = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
    };

    // Platform-specific token params
    if (platform === 'twitter') {
      tokenParams.code_verifier = stateRecord.code_verifier || '';
    } else {
      tokenParams.client_secret = clientSecret;
    }

    const tokenHeaders: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    // Twitter uses Basic auth for token exchange
    if (platform === 'twitter') {
      tokenHeaders['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
    }

    const tokenRes = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: tokenHeaders,
      body: new URLSearchParams(tokenParams),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error(`[social/connect] Token exchange failed for ${platform}:`, err);
      return NextResponse.json({ error: 'Token exchange failed' }, { status: 500 });
    }

    const tokens = await tokenRes.json();

    // Get additional platform data
    let additionalData: Record<string, string> = {};

    if (platform === 'instagram') {
      // Get IG user ID from pages
      try {
        const pagesRes = await fetch(
          `https://graph.facebook.com/v18.0/me/accounts?access_token=${tokens.access_token}`
        );
        const pages = await pagesRes.json();
        const page = pages.data?.[0];
        if (page) {
          const igRes = await fetch(
            `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${tokens.access_token}`
          );
          const ig = await igRes.json();
          additionalData.instagram_user_id = ig.instagram_business_account?.id || '';
          additionalData.page_id = page.id;
        }
      } catch {}
    }

    if (platform === 'discord' && tokens.webhook) {
      additionalData.webhook_url = tokens.webhook.url;
      additionalData.webhook_id = tokens.webhook.id;
      additionalData.channel_id = tokens.webhook.channel_id;
      additionalData.guild_id = tokens.webhook.guild_id;
    }

    if (platform === 'youtube') {
      try {
        const channelRes = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true`,
          { headers: { 'Authorization': `Bearer ${tokens.access_token}` } }
        );
        const channelData = await channelRes.json();
        const channel = channelData.items?.[0];
        if (channel) {
          additionalData.channel_id = channel.id;
          additionalData.channel_title = channel.snippet?.title || '';
        }
      } catch {}
    }

    // Store connection
    const { error: upsertErr } = await supabase
      .from('social_connections')
      .upsert({
        user_id: stateRecord.user_id,
        platform,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_in
          ? Math.floor(Date.now() / 1000) + tokens.expires_in
          : null,
        channel_id: additionalData.channel_id || null,
        additional_data: additionalData,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,platform',
      });

    if (upsertErr) {
      console.error('[social/connect] Upsert error:', upsertErr);
      return NextResponse.json({ error: 'Failed to store connection' }, { status: 500 });
    }

    // Clean up state
    await supabase.from('oauth_states').delete().eq('state', state);

    return NextResponse.json({
      success: true,
      platform,
      connected: true,
    });
  } catch (err: any) {
    console.error('[social/connect POST]', err);
    return NextResponse.json({ error: 'Connection failed' }, { status: 500 });
  }
}

// ── DELETE: Disconnect platform ─────────────────────────────────
export async function DELETE(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const platform = request.nextUrl.searchParams.get('platform');
  if (!platform) {
    return NextResponse.json({ error: 'Missing platform' }, { status: 400 });
  }

  const { error } = await supabase
    .from('social_connections')
    .delete()
    .eq('user_id', user.id)
    .eq('platform', platform);

  if (error) {
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }

  return NextResponse.json({ success: true, disconnected: platform });
}

// ── PKCE Helpers (for Twitter OAuth2) ───────────────────────────
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString('base64url');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Buffer.from(hash).toString('base64url');
}
