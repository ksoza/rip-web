// app/api/generate/lipsync/route.ts
// Phase 3A — Enhanced Lip Sync: wav2lip + SadTalker + video-retalking
// Sync character face to audio with multiple provider options
import { NextRequest, NextResponse } from 'next/server';
import { logGeneration } from '@/lib/db';

// ── Provider configs ────────────────────────────────────────────
const PROVIDERS: Record<string, { model: string; buildInput: (face: string, audio: string) => any }> = {
  'wav2lip': {
    model: 'devxpy/cog-wav2lip',
    buildInput: (face, audio) => ({
      face,
      audio,
      pads: '0 10 0 0',
      smooth: true,
      fps: 25,
    }),
  },
  'sadtalker': {
    model: 'cjwbw/sadtalker',
    buildInput: (face, audio) => ({
      source_image: face,
      driven_audio: audio,
      enhancer: 'gfpgan',
      preprocess: 'crop',
      still_mode: false,
      use_ref_video: false,
      facerender: 'facevid2vid',
      expression_scale: 1.0,
    }),
  },
  'video-retalking': {
    model: 'chenxwh/video-retalking',
    buildInput: (face, audio) => ({
      face,
      input_audio: audio,
    }),
  },
};

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')!;
    const { faceUrl, audioUrl, provider = 'sadtalker' } = await req.json();

    if (!faceUrl || !audioUrl) {
      return NextResponse.json({ error: 'Missing faceUrl or audioUrl' }, { status: 400 });
    }

    const providerConfig = PROVIDERS[provider];
    if (!providerConfig) {
      return NextResponse.json({ error: `Unknown provider: ${provider}. Use: ${Object.keys(PROVIDERS).join(', ')}` }, { status: 400 });
    }

    // ── Try fal.ai first (cheaper), fallback to Replicate ───────
    const falKey = process.env.FAL_KEY;
    const replicateToken = process.env.REPLICATE_API_TOKEN;

    if (!falKey && !replicateToken) {
      return NextResponse.json({ error: 'No AI provider configured (FAL_KEY or REPLICATE_API_TOKEN required)' }, { status: 503 });
    }

    let outputUrl: string;

    if (falKey && provider === 'sadtalker') {
      // fal.ai SadTalker (often faster + cheaper)
      outputUrl = await runFalLipSync(falKey, faceUrl, audioUrl);
    } else if (replicateToken) {
      // Replicate for all providers
      outputUrl = await runReplicateLipSync(replicateToken, providerConfig, faceUrl, audioUrl);
    } else {
      return NextResponse.json({ error: `Provider ${provider} requires REPLICATE_API_TOKEN` }, { status: 503 });
    }

    await logGeneration({
      userId,
      creationType: 'lipsync' as any,
      model: provider,
      result: { url: outputUrl, faceUrl, audioUrl },
      success: true,
    }).catch(() => {});

    return NextResponse.json({
      type: 'lipsync',
      provider,
      url: outputUrl,
      faceUrl,
      audioUrl,
    });

  } catch (err: any) {
    console.error('Lipsync error:', err);
    return NextResponse.json({ error: err.message || 'Lip sync failed' }, { status: 500 });
  }
}

// ── fal.ai SadTalker ────────────────────────────────────────────
async function runFalLipSync(key: string, faceUrl: string, audioUrl: string): Promise<string> {
  const submitRes = await fetch('https://queue.fal.run/fal-ai/sadtalker', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source_image_url: faceUrl,
      driven_audio_url: audioUrl,
      enhancer: 'gfpgan',
      preprocess: 'crop',
    }),
  });

  if (!submitRes.ok) {
    const err = await submitRes.text();
    throw new Error(`fal.ai error: ${err}`);
  }

  const submitData = await submitRes.json();

  // If sync response
  if (submitData.video?.url) return submitData.video.url;

  // Poll for async result
  const requestId = submitData.request_id;
  if (!requestId) throw new Error('fal.ai: No request_id');

  const deadline = Date.now() + 300_000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 3000));

    const statusRes = await fetch(`https://queue.fal.run/fal-ai/sadtalker/requests/${requestId}/status`, {
      headers: { 'Authorization': `Key ${key}` },
    });
    const status = await statusRes.json();

    if (status.status === 'COMPLETED') {
      const resultRes = await fetch(`https://queue.fal.run/fal-ai/sadtalker/requests/${requestId}`, {
        headers: { 'Authorization': `Key ${key}` },
      });
      const result = await resultRes.json();
      return result.video?.url || result.output;
    }
    if (status.status === 'FAILED') {
      throw new Error(`fal.ai lip sync failed: ${status.error || 'Unknown'}`);
    }
  }
  throw new Error('fal.ai lip sync timed out');
}

// ── Replicate (all providers) ───────────────────────────────────
async function runReplicateLipSync(
  token: string,
  config: typeof PROVIDERS[string],
  faceUrl: string,
  audioUrl: string,
): Promise<string> {
  const createRes = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      input: config.buildInput(faceUrl, audioUrl),
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Replicate error: ${err}`);
  }

  let prediction = await createRes.json();

  const deadline = Date.now() + 300_000;
  while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 3000));
    const poll = await fetch(prediction.urls.get, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    prediction = await poll.json();
  }

  if (prediction.status === 'failed') {
    throw new Error(prediction.error || 'Lip sync failed on Replicate');
  }

  const output = typeof prediction.output === 'string' ? prediction.output : prediction.output?.[0];
  if (!output) throw new Error('No output from lip sync model');

  return output;
}
