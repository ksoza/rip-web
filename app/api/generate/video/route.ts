// app/api/generate/video/route.ts
// Video generation — fal.ai (primary), with Luma/Runway/Kling legacy fallback
// Supports: Seedance, Kling, Veo, Wan, LTX, Hailuo + legacy Luma, Runway
import { NextRequest, NextResponse } from 'next/server';
import { isNexosConfigured, nexosGenerate } from '@/lib/nexos';
import { falGenerate, FAL_VIDEO_MODELS } from '@/lib/fal';
import { deductCredits, grantDailyCredits } from '@/lib/credits';
import { logGeneration } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')!;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      prompt,
      provider = 'wan',
      model: modelKey,
      imageUrl,
      duration = 5,
      aspectRatio = '16:9',
    } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    // Grant daily free credits if eligible
    await grantDailyCredits(userId).catch(() => {});

    let result: { url: string; id: string; duration: number };
    let creditCost = 0;
    let usedProvider = modelKey || provider;

    // ── fal.ai models (new, primary) ────────────────────────────
    const falModel = FAL_VIDEO_MODELS[modelKey || ''] || FAL_VIDEO_MODELS[provider || ''];
    if (falModel) {
      creditCost = falModel.creditCost;

      // Check & deduct credits
      const { success, error } = await deductCredits(
        userId, creditCost, 'video_generation',
        { model: falModel.id, prompt: prompt.slice(0, 200) },
      );
      if (!success) {
        return NextResponse.json(
          { error: error || 'Insufficient credits', creditsNeeded: creditCost },
          { status: 402 },
        );
      }

      const input: any = {
        prompt,
        aspect_ratio: aspectRatio,
      };
      if (imageUrl) input.image_url = imageUrl;
      if (duration) input.duration = String(duration);

      const falResult = await falGenerate(falModel.id, input);

      result = {
        url: falResult.video?.url || '',
        id: falResult.request_id || '',
        duration,
      };
      usedProvider = modelKey || provider;

    // ── Legacy providers (backward compatibility) ───────────────
    } else {
      switch (provider) {
        case 'luma': {
          creditCost = 15;
          const { success, error } = await deductCredits(userId, creditCost, 'video_generation', { model: 'luma' });
          if (!success) return NextResponse.json({ error: error || 'Insufficient credits', creditsNeeded: creditCost }, { status: 402 });

          const key = process.env.LUMA_API_KEY;
          if (!key) return NextResponse.json({ error: 'LUMA_API_KEY not configured. Add your Luma Dream Machine API key.' }, { status: 500 });

          const body: any = { prompt, aspect_ratio: aspectRatio, loop: false };
          if (imageUrl) body.keyframes = { frame0: { type: 'image', url: imageUrl } };

          const createRes = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          if (!createRes.ok) {
            return NextResponse.json({ error: `Luma error: ${await createRes.text()}` }, { status: 500 });
          }

          let gen = await createRes.json();
          const deadline = Date.now() + 300000;
          while (gen.state !== 'completed' && gen.state !== 'failed' && Date.now() < deadline) {
            await new Promise(r => setTimeout(r, 5000));
            const pollRes = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${gen.id}`, {
              headers: { 'Authorization': `Bearer ${key}` },
            });
            gen = await pollRes.json();
          }
          if (gen.state === 'failed') {
            return NextResponse.json({ error: gen.failure_reason || 'Video generation failed' }, { status: 500 });
          }

          result = { url: gen.assets?.video || gen.video?.url || '', id: gen.id, duration: 5 };
          break;
        }

        case 'runway': {
          creditCost = 20;
          const { success, error } = await deductCredits(userId, creditCost, 'video_generation', { model: 'runway' });
          if (!success) return NextResponse.json({ error: error || 'Insufficient credits', creditsNeeded: creditCost }, { status: 402 });

          const key = process.env.RUNWAY_API_KEY;
          if (!key) return NextResponse.json({ error: 'RUNWAY_API_KEY not configured. Add your Runway ML API key.' }, { status: 500 });

          const body: any = {
            promptText: prompt,
            model: 'gen3a_turbo',
            duration: Math.min(duration, 10),
            watermark: false,
          };
          if (imageUrl) body.promptImage = imageUrl;

          const createRes = await fetch('https://api.dev.runwayml.com/v1/image_to_video', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${key}`,
              'Content-Type': 'application/json',
              'X-Runway-Version': '2024-11-06',
            },
            body: JSON.stringify(body),
          });
          if (!createRes.ok) {
            return NextResponse.json({ error: `Runway error: ${await createRes.text()}` }, { status: 500 });
          }

          let task = await createRes.json();
          const deadline = Date.now() + 300000;
          while (task.status !== 'SUCCEEDED' && task.status !== 'FAILED' && Date.now() < deadline) {
            await new Promise(r => setTimeout(r, 5000));
            const pollRes = await fetch(`https://api.dev.runwayml.com/v1/tasks/${task.id}`, {
              headers: { 'Authorization': `Bearer ${key}`, 'X-Runway-Version': '2024-11-06' },
            });
            task = await pollRes.json();
          }
          if (task.status === 'FAILED') {
            return NextResponse.json({ error: 'Runway generation failed' }, { status: 500 });
          }

          result = { url: task.output?.[0] || '', id: task.id, duration };
          break;
        }

        default:
          return NextResponse.json({
            error: `Unknown provider: ${provider}. Available: seedance, kling, wan, veo, ltx-video, hailuo (fal.ai) or luma, runway (legacy)`,
          }, { status: 400 });
      }
    }

    // Log generation
    await logGeneration({
      userId,
      creationType: 'video',
      model: usedProvider,
      prompt: prompt.slice(0, 500),
      result: { url: result.url, id: result.id },
      success: true,
    }).catch(() => {});

    return NextResponse.json({
      type: 'video',
      provider: usedProvider,
      ...result,
      prompt,
      creditsUsed: creditCost,
    });

  } catch (err: any) {
    console.error('Video generation error:', err);
    return NextResponse.json({ error: 'Video generation failed' }, { status: 500 });
  }
}
