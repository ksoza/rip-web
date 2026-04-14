// app/api/generate/video/route.ts
// Video generation — FREE-FIRST fallback chain:
//   1. Self-hosted Wan 2.1 (free Colab/Kaggle — if GPU online)
//   2. Pollinations video (free, no key)
//   3. fal.ai (paid, best quality — if FAL_KEY set)
//   4. Luma / Runway (paid legacy — if keys set)
import { NextRequest, NextResponse } from 'next/server';
import {
  isSelfHostedConfigured,
  checkSelfHostedHealth,
  selfHostedGenerateVideo,
  selfHostedDownloadUrl,
} from '@/lib/self-hosted';
import { pollinationsGenerateVideo } from '@/lib/pollinations';
import { falGenerate, FAL_VIDEO_MODELS } from '@/lib/fal';
import { checkGenerationAccess, recordGeneration } from '@/lib/credits';
import { canAccessTier } from '@/lib/revenue';
import { logGeneration } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')!;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      prompt,
      provider = 'auto',
      model: modelKey,
      imageUrl,
      duration = 5,
      aspectRatio = '16:9',
    } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    // Check generation access (tier-based, unlimited for paid)
    const access = await checkGenerationAccess(userId);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error || 'Generation limit reached. Upgrade for unlimited access.' },
        { status: 402 },
      );
    }

    let result: { url: string; id: string; duration: number };
    let usedProvider = modelKey || provider;

    // ── Explicit fal.ai model requested ─────────────────────────
    const falModel = FAL_VIDEO_MODELS[modelKey || ''] || (provider !== 'auto' && provider !== 'self-hosted' && provider !== 'pollinations' ? FAL_VIDEO_MODELS[provider || ''] : null);

    if (falModel) {
      // Explicit paid model — check tier + key
      if (falModel.tier && !canAccessTier(access.tier, falModel.tier)) {
        return NextResponse.json(
          { error: `${falModel.tier} tier required for this model. Upgrade your plan.` },
          { status: 403 },
        );
      }

      const input: any = { prompt, aspect_ratio: aspectRatio };
      if (imageUrl) input.image_url = imageUrl;
      if (duration) input.duration = String(duration);

      const falResult = await falGenerate(falModel.id, input);
      result = {
        url: falResult.video?.url || '',
        id: falResult.request_id || '',
        duration,
      };
      usedProvider = modelKey || provider;

    } else if (provider === 'luma') {
      // Legacy Luma
      const key = process.env.LUMA_API_KEY;
      if (!key) return NextResponse.json({ error: 'LUMA_API_KEY not configured.' }, { status: 500 });

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
      usedProvider = 'luma';

    } else if (provider === 'runway') {
      // Legacy Runway
      const key = process.env.RUNWAY_API_KEY;
      if (!key) return NextResponse.json({ error: 'RUNWAY_API_KEY not configured.' }, { status: 500 });

      const body: any = { promptText: prompt, model: 'gen3a_turbo', duration: Math.min(duration, 10), watermark: false };
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
      usedProvider = 'runway';

    } else {
      // ── FREE-FIRST AUTO FALLBACK ──────────────────────────────
      // 1. Self-hosted Wan 2.1 (if configured + online)
      // 2. Pollinations video (always free)
      // 3. fal.ai Wan (if FAL_KEY set)

      let generated = false;

      // 1. Try self-hosted GPU
      if (isSelfHostedConfigured()) {
        try {
          const health = await checkSelfHostedHealth();
          if (health && health.models.video) {
            const shResult = await selfHostedGenerateVideo({
              prompt,
              width: aspectRatio === '9:16' ? 480 : 848,
              height: aspectRatio === '9:16' ? 848 : 480,
              num_frames: Math.min(duration * 8, 81),
            });
            if (shResult.success && shResult.download_url) {
              result = {
                url: selfHostedDownloadUrl(shResult.download_url),
                id: 'self-hosted',
                duration: shResult.duration_seconds || duration,
              };
              usedProvider = 'self-hosted-wan';
              generated = true;
            }
          }
        } catch (shErr) {
          console.warn('Self-hosted video failed:', shErr);
        }
      }

      // 2. Try Pollinations video (free)
      if (!generated) {
        try {
          const polResult = await pollinationsGenerateVideo(prompt);
          result = { url: polResult.url, id: 'pollinations', duration };
          usedProvider = 'pollinations';
          generated = true;
        } catch (polErr) {
          console.warn('Pollinations video failed:', polErr);
        }
      }

      // 3. Try fal.ai Wan (paid fallback)
      if (!generated && process.env.FAL_KEY) {
        try {
          const wanModel = FAL_VIDEO_MODELS['wan'] || FAL_VIDEO_MODELS['wan-2.1'];
          if (wanModel) {
            const falResult = await falGenerate(wanModel.id, {
              prompt,
              aspect_ratio: aspectRatio,
              duration: String(duration),
            });
            result = {
              url: falResult.video?.url || '',
              id: falResult.request_id || '',
              duration,
            };
            usedProvider = 'fal-wan';
            generated = true;
          }
        } catch (falErr) {
          console.warn('fal.ai video failed:', falErr);
        }
      }

      if (!generated) {
        return NextResponse.json(
          { error: 'All video providers failed. Self-hosted GPU is offline, Pollinations is temporarily unavailable, and no paid API keys are configured (FAL_KEY).' },
          { status: 503 },
        );
      }
    }

    // Record generation (for free tier daily counting)
    await recordGeneration(userId).catch(() => {});

    // Log generation
    await logGeneration({
      userId,
      creationType: 'video',
      model: usedProvider,
      prompt: prompt.slice(0, 500),
      result: { url: result!.url, id: result!.id },
      success: true,
    }).catch(() => {});

    return NextResponse.json({
      type: 'video',
      provider: usedProvider,
      ...result!,
      prompt,
      tier: access.tier,
    });

  } catch (err: any) {
    console.error('Video generation error:', err);
    return NextResponse.json({ error: 'Video generation failed' }, { status: 500 });
  }
}
