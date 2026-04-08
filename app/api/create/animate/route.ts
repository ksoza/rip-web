// app/api/create/animate/route.ts
// Video generation — Novita AI primary, fal.ai + Google Veo fallbacks
import { NextRequest, NextResponse } from 'next/server';
import { falGenerate, FAL_VIDEO_MODELS } from '@/lib/fal';

export const maxDuration = 120;

function extractVideoUrl(result: any): string | null {
  if (result?.video?.url) return result.video.url;
  if (result?.output?.video?.url) return result.output.video.url;
  if (result?.data?.video?.url) return result.data.video.url;
  if (typeof result?.video === 'string') return result.video;
  if (typeof result?.output === 'string' && result.output.startsWith('http')) return result.output;
  if (result?.videos?.[0]?.url) return result.videos[0].url;
  if (typeof result?.url === 'string' && result.url.includes('.mp4')) return result.url;
  return null;
}

// ── Novita AI video generation ────────────────────────────────────
// Endpoints: https://api.novita.ai/v3/async/{model}
// Models: minimax-hailuo-2.3-fast-t2v ($0.19/vid), minimax-hailuo-2.3-fast-i2v ($0.19/vid),
//         kling-v3.0-standard-t2v ($0.168/s), kling-v3.0-standard-i2v ($0.168/s),
//         wan-t2v ($0.03/vid)
// Poll: GET https://api.novita.ai/v3/async/task-result?task_id={id}
async function novitaGenerate(opts: {
  prompt: string;
  imageUrl?: string;
  duration?: number;
  novitaKey: string;
}): Promise<{ videoUrl: string; model: string } | null> {
  const { prompt, imageUrl, duration = 6, novitaKey } = opts;
  const headers = {
    'Authorization': `Bearer ${novitaKey.trim()}`,
    'Content-Type': 'application/json',
  };

  // Choose model: image-to-video if image provided, else text-to-video
  // Try Hailuo 2.3 Fast first (cheapest), then Wan (even cheaper for t2v)
  const models = imageUrl
    ? [
        { endpoint: 'minimax-hailuo-2.3-fast-i2v', body: { prompt, image: imageUrl, duration, resolution: '768P', enable_prompt_expansion: true } },
        { endpoint: 'kling-v3.0-standard-i2v', body: { prompt, image_url: imageUrl, duration, mode: 'Standard' } },
      ]
    : [
        { endpoint: 'minimax-hailuo-2.3-fast-t2v', body: { prompt, duration, resolution: '768P', enable_prompt_expansion: true } },
        { endpoint: 'wan-t2v', body: { prompt, width: 832, height: 480, steps: 20, fast_mode: true } },
        { endpoint: 'kling-v3.0-standard-t2v', body: { prompt, duration, mode: 'Standard' } },
      ];

  for (const m of models) {
    try {
      console.log(`[animate] Novita: trying ${m.endpoint}...`);
      const submitRes = await fetch(`https://api.novita.ai/v3/async/${m.endpoint}`, {
        method: 'POST', headers,
        body: JSON.stringify(m.body),
      });

      if (!submitRes.ok) {
        const errText = await submitRes.text();
        console.warn(`[animate] Novita ${m.endpoint}: HTTP ${submitRes.status} — ${errText.slice(0, 200)}`);
        // If insufficient balance, skip all Novita models
        if (errText.includes('NOT_ENOUGH_BALANCE')) {
          console.warn('[animate] Novita: insufficient balance, skipping all Novita models');
          break;
        }
        continue;
      }

      const { task_id } = await submitRes.json();
      if (!task_id) continue;

      // Poll for result (up to 90 seconds)
      const deadline = Date.now() + 90_000;
      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 4000));
        const pollRes = await fetch(
          `https://api.novita.ai/v3/async/task-result?task_id=${task_id}`,
          { headers }
        );
        if (!pollRes.ok) continue;

        const pollData = await pollRes.json();
        const status = pollData?.task?.status;

        if (status === 'TASK_STATUS_SUCCEED') {
          const videoUrl = pollData?.videos?.[0]?.video_url;
          if (videoUrl) {
            return { videoUrl, model: m.endpoint };
          }
          break;
        }
        if (status === 'TASK_STATUS_FAILED') {
          console.warn(`[animate] Novita ${m.endpoint} failed: ${pollData?.task?.reason || 'unknown'}`);
          break;
        }
        // Still processing — continue polling
      }
    } catch (e: any) {
      console.warn(`[animate] Novita ${m.endpoint} error: ${e.message}`);
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const {
      imageUrl,
      imageBase64,
      prompt,
      model = 'wan',
      sceneId,
      duration = '5',
      aspectRatio = '16:9',
    } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const errors: string[] = [];

    // ── 1. Try Novita AI first (cheapest) ───────────────────────
    const novitaKey = process.env.NOVITA_API_KEY || '';
    if (novitaKey) {
      try {
        const imgSrc = imageUrl || (imageBase64 ? imageBase64 : undefined);
        const novResult = await novitaGenerate({
          prompt: `${prompt}, cinematic motion, smooth animation`,
          imageUrl: imgSrc,
          duration: parseInt(duration, 10) || 5,
          novitaKey,
        });
        if (novResult) {
          return NextResponse.json({
            videoUrl: novResult.videoUrl, sceneId,
            model: novResult.model,
            provider: 'novita',
          });
        }
        errors.push('Novita AI: all models failed or timed out');
      } catch (e: any) {
        errors.push(`Novita AI: ${e.message}`);
      }
    } else {
      errors.push('NOVITA_API_KEY not set');
    }

    // ── 2. Try fal.ai ──────────────────────────────────────────
    if (process.env.FAL_KEY) {
      const videoModel = FAL_VIDEO_MODELS[model];
      if (videoModel) {
        try {
          const prompt_full = `${prompt}, cinematic motion, smooth animation, professional quality`;
          const durationNum = parseInt(duration, 10) || 5;
          const falInput: Record<string, any> = { prompt: prompt_full };

          if (imageUrl) falInput.image_url = imageUrl;
          else if (imageBase64) {
            const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
            falInput.image_url = `data:image/png;base64,${base64Data}`;
          }
          falInput.duration = durationNum;
          if (aspectRatio) falInput.aspect_ratio = aspectRatio;

          console.log(`[animate] fal.ai: model=${videoModel.id}`);
          const result = await falGenerate(videoModel.id, falInput as any);
          const videoUrl = extractVideoUrl(result);

          if (videoUrl) {
            return NextResponse.json({
              videoUrl, sceneId,
              model: videoModel.id,
              provider: 'fal.ai',
            });
          }
          errors.push(`fal.ai: no video URL in response`);
        } catch (e: any) {
          errors.push(`fal.ai: ${e.message}`);
        }
      }
    } else {
      errors.push('FAL_KEY not set');
    }

    // ── 3. Try Google Veo ──────────────────────────────────────
    const googleKey = process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY || '';
    if (googleKey) {
      try {
        console.log('[animate] Trying Google Veo 3.1 lite...');
        const veoRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-lite-generate-preview:predictLongRunning?key=${googleKey.trim()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              instances: [{ prompt: `${prompt}, cinematic, professional` }],
              parameters: { sampleCount: 1 },
            }),
          }
        );

        if (veoRes.ok) {
          const veoData = await veoRes.json();
          const opName = veoData.name;
          if (opName) {
            const deadline = Date.now() + 90_000;
            while (Date.now() < deadline) {
              await new Promise(r => setTimeout(r, 5000));
              const pollRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/${opName}?key=${googleKey.trim()}`
              );
              const pollData = await pollRes.json();
              if (pollData.done) {
                const videoUri = pollData.response?.generatedSamples?.[0]?.video?.uri;
                if (videoUri) {
                  return NextResponse.json({
                    videoUrl: videoUri, sceneId,
                    model: 'veo-3.1-lite',
                    provider: 'google',
                  });
                }
                break;
              }
            }
          }
        } else {
          const errBody = await veoRes.text();
          errors.push(`Google Veo: HTTP ${veoRes.status} ${errBody.slice(0, 100)}`);
        }
      } catch (e: any) {
        errors.push(`Google Veo: ${e.message}`);
      }
    }

    // ── All providers failed ────────────────────────────────────
    return NextResponse.json({
      error: `Video generation failed. Tried: ${errors.join(' | ')}`,
      details: 'All video providers exhausted. Check API keys and balances.',
      sceneId,
    }, { status: 500 });

  } catch (error: any) {
    console.error('[animate] Top-level error:', error);
    return NextResponse.json(
      { error: error.message || 'Video generation failed', sceneId: undefined },
      { status: error.status || 500 }
    );
  }
}
