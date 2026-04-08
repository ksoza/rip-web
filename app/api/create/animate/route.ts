// app/api/create/animate/route.ts
// Video generation — Novita AI primary, fal.ai + Google Veo fallbacks
// Split submit/poll pattern for Vercel Hobby plan (60s limit)
import { NextRequest, NextResponse } from 'next/server';
import { falGenerate, FAL_VIDEO_MODELS } from '@/lib/fal';

export const maxDuration = 60;

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

// ── GET: Poll for task status ───────────────────────────────────
export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get('taskId');
  const provider = req.nextUrl.searchParams.get('provider') || 'novita';

  if (!taskId) {
    return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });
  }

  if (provider === 'novita') {
    const novitaKey = process.env.NOVITA_API_KEY || '';
    if (!novitaKey) {
      return NextResponse.json({ error: 'NOVITA_API_KEY not set' }, { status: 500 });
    }

    try {
      const pollRes = await fetch(
        `https://api.novita.ai/v3/async/task-result?task_id=${taskId}`,
        { headers: { 'Authorization': `Bearer ${novitaKey.trim()}`, 'Content-Type': 'application/json' } }
      );

      if (!pollRes.ok) {
        return NextResponse.json({ error: `Novita poll failed: HTTP ${pollRes.status}` }, { status: 500 });
      }

      const pollData = await pollRes.json();
      const status = pollData?.task?.status;
      const progress = pollData?.task?.progress_percent || 0;

      if (status === 'TASK_STATUS_SUCCEED') {
        const videoUrl = pollData?.videos?.[0]?.video_url;
        return NextResponse.json({ done: true, videoUrl, taskId });
      }
      if (status === 'TASK_STATUS_FAILED') {
        return NextResponse.json({ done: true, error: `Video failed: ${pollData?.task?.reason || 'unknown'}`, taskId });
      }

      // Still processing
      return NextResponse.json({ done: false, status, progress, taskId });
    } catch (e: any) {
      return NextResponse.json({ error: `Poll error: ${e.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
}

// ── Novita: Submit task (no polling) ────────────────────────────
async function novitaSubmit(opts: {
  prompt: string;
  imageUrl?: string;
  duration?: number;
  novitaKey: string;
}): Promise<{ taskId: string; model: string } | { error: string }> {
  const { prompt, imageUrl, duration = 6, novitaKey } = opts;
  const headers = {
    'Authorization': `Bearer ${novitaKey.trim()}`,
    'Content-Type': 'application/json',
  };

  const models = imageUrl
    ? [
        { endpoint: 'minimax-hailuo-02', body: { prompt, image: imageUrl, duration, resolution: '768P', enable_prompt_expansion: true } },
        { endpoint: 'kling-v2.1-i2v-master', body: { prompt, image_url: imageUrl, duration: String(duration), mode: 'Standard' } },
      ]
    : [
        { endpoint: 'wan-t2v', body: { prompt, size: '832*480', steps: 20, fast_mode: true } },
        { endpoint: 'minimax-hailuo-02', body: { prompt, duration, resolution: '768P', enable_prompt_expansion: true } },
        { endpoint: 'kling-v2.1-t2v-master', body: { prompt, duration: String(duration), aspect_ratio: '16:9' } },
      ];

  const errors: string[] = [];
  for (const m of models) {
    try {
      console.log(`[animate] Novita: submitting to ${m.endpoint}...`);
      const submitRes = await fetch(`https://api.novita.ai/v3/async/${m.endpoint}`, {
        method: 'POST', headers, body: JSON.stringify(m.body),
      });

      if (!submitRes.ok) {
        const errText = await submitRes.text();
        console.warn(`[animate] Novita ${m.endpoint}: HTTP ${submitRes.status} — ${errText.slice(0, 200)}`);
        if (errText.includes('NOT_ENOUGH_BALANCE')) {
          return { error: 'Novita AI: insufficient balance. Top up at novita.ai/billing' };
        }
        errors.push(`${m.endpoint}: HTTP ${submitRes.status}`);
        continue;
      }

      const { task_id } = await submitRes.json();
      if (task_id) {
        console.log(`[animate] Novita ${m.endpoint}: task ${task_id} submitted`);
        return { taskId: task_id, model: m.endpoint };
      }
    } catch (e: any) {
      errors.push(`${m.endpoint}: ${e.message}`);
    }
  }
  return { error: `Novita: all models failed (${errors.join(', ')})` };
}

// ── POST: Submit new video generation ───────────────────────────
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

    // ── 1. Try Novita AI (submit + quick poll for 45s) ──────────
    const novitaKey = process.env.NOVITA_API_KEY || '';
    if (novitaKey) {
      const imgSrc = imageUrl || (imageBase64 ? imageBase64 : undefined);
      const result = await novitaSubmit({
        prompt: `${prompt}, cinematic motion, smooth animation`,
        imageUrl: imgSrc,
        duration: parseInt(duration, 10) || 6,
        novitaKey,
      });

      if ('taskId' in result) {
        // Quick poll for up to 45s (fits in 60s function limit)
        const deadline = Date.now() + 45_000;
        while (Date.now() < deadline) {
          await new Promise(r => setTimeout(r, 4000));
          try {
            const pollRes = await fetch(
              `https://api.novita.ai/v3/async/task-result?task_id=${result.taskId}`,
              { headers: { 'Authorization': `Bearer ${novitaKey.trim()}`, 'Content-Type': 'application/json' } }
            );
            if (!pollRes.ok) continue;
            const pollData = await pollRes.json();
            const status = pollData?.task?.status;

            if (status === 'TASK_STATUS_SUCCEED') {
              const videoUrl = pollData?.videos?.[0]?.video_url;
              if (videoUrl) {
                return NextResponse.json({ videoUrl, sceneId, model: result.model, provider: 'novita' });
              }
              break;
            }
            if (status === 'TASK_STATUS_FAILED') {
              errors.push(`Novita ${result.model}: ${pollData?.task?.reason || 'generation failed'}`);
              break;
            }
          } catch {}
        }

        // Not done yet — return taskId for client-side polling
        if (!errors.length) {
          return NextResponse.json({
            pending: true,
            taskId: result.taskId,
            provider: 'novita',
            model: result.model,
            sceneId,
            message: 'Video is generating. Poll GET /api/create/animate?taskId=...&provider=novita',
          });
        }
      } else {
        errors.push(result.error);
      }
    } else {
      errors.push('NOVITA_API_KEY not set');
    }

    // ── 2. Try fal.ai ──────────────────────────────────────────
    if (process.env.FAL_KEY) {
      const videoModel = FAL_VIDEO_MODELS[model];
      if (videoModel) {
        try {
          const falInput: Record<string, any> = {
            prompt: `${prompt}, cinematic motion, smooth animation`,
          };
          if (imageUrl) falInput.image_url = imageUrl;
          else if (imageBase64) {
            falInput.image_url = `data:image/png;base64,${imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')}`;
          }
          falInput.duration = parseInt(duration, 10) || 5;
          if (aspectRatio) falInput.aspect_ratio = aspectRatio;

          const result = await falGenerate(videoModel.id, falInput as any);
          const videoUrl = extractVideoUrl(result);
          if (videoUrl) {
            return NextResponse.json({ videoUrl, sceneId, model: videoModel.id, provider: 'fal.ai' });
          }
          errors.push('fal.ai: no video URL in response');
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
        if (!veoRes.ok) {
          errors.push(`Google Veo: HTTP ${veoRes.status}`);
        }
      } catch (e: any) {
        errors.push(`Google Veo: ${e.message}`);
      }
    }

    return NextResponse.json({
      error: `Video generation failed: ${errors.join(' | ')}`,
      sceneId,
    }, { status: 500 });

  } catch (error: any) {
    console.error('[animate] Top-level error:', error);
    return NextResponse.json(
      { error: error.message || 'Video generation failed' },
      { status: error.status || 500 }
    );
  }
}
