// app/api/generate/music/route.ts
// Music generation for Music Video format
// Uses VidMuse (video-to-music) with 3-tier fallback:
//   Free users  → HuggingFace Inference API ($0, slow)
//   Paid users  → Replicate (~$0.01/run, baked into subscription)
//   Self-hosted → GPU if VIDMUSE_GPU_URL configured (highest priority)
//
// If user uploads their own track, this route is skipped entirely.
import { NextRequest, NextResponse } from 'next/server';
import {
  generateMusicFromVideo,
  isVidMuseConfigured,
  getVidMuseStatus,
} from '@/lib/vidmuse';
import { checkGenerationAccess, recordGeneration } from '@/lib/credits';
import { logGeneration } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { videoUrl, duration = 30, topK, topP, temperature, cfgCoef } =
      await req.json();

    if (!videoUrl) {
      return NextResponse.json(
        { error: 'Missing videoUrl — provide a video to generate music from' },
        { status: 400 },
      );
    }

    // Check generation access
    const access = await checkGenerationAccess(userId);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error || 'Generation limit reached. Upgrade for unlimited.' },
        { status: 402 },
      );
    }

    // Check if any VidMuse provider is configured
    if (!isVidMuseConfigured()) {
      const status = getVidMuseStatus();
      return NextResponse.json(
        {
          error:
            'VidMuse not configured. Set VIDMUSE_GPU_URL (self-hosted), ' +
            'REPLICATE_API_TOKEN (paid), or HF_TOKEN (free) in environment.',
          status,
        },
        { status: 503 },
      );
    }

    // Generate music via 3-tier fallback
    const result = await generateMusicFromVideo(
      { videoUrl, duration, topK, topP, temperature, cfgCoef },
      access.tier,
    );

    // Record generation
    await recordGeneration(userId).catch(() => {});

    // Log it
    await logGeneration({
      userId,
      creationType: 'music',
      model: `vidmuse-${result.provider}`,
      prompt: `video-to-music: ${videoUrl.slice(0, 200)}`,
      result: { audioUrl: result.audioUrl.slice(0, 500) },
      success: true,
    }).catch(() => {});

    return NextResponse.json({
      type: 'music',
      provider: result.provider,
      audioUrl: result.audioUrl,
      duration: result.duration,
      tier: access.tier,
    });
  } catch (err: any) {
    console.error('Music generation error:', err);
    return NextResponse.json(
      { error: err.message || 'Music generation failed' },
      { status: 500 },
    );
  }
}

// GET — check VidMuse status
export async function GET() {
  const status = getVidMuseStatus();
  return NextResponse.json({
    configured: isVidMuseConfigured(),
    providers: status,
    tiers: {
      free: 'HuggingFace Inference API (slow, $0)',
      paid: 'Replicate (~$0.01/run, included in subscription)',
      selfHosted: 'GPU server (fastest, $0 after setup)',
    },
  });
}
