// app/api/create/animate/route.ts
// Video generation — Novita AI primary, fal.ai + Google Veo fallbacks
// Split submit/poll pattern for Vercel Hobby plan (60s limit)
import { NextRequest, NextResponse } from 'next/server';
import { falGenerate, FAL_VIDEO_MODELS } from '@/lib/fal';

export const maxDuration = 60;

function extractVideoUrl(result: Record<string, unknown>): string | null {
  const r = result as Record<string, unknown>;
  const vid = r?.video as Record<string, unknown> | string | undefined;
  if (typeof vid === 'object' && vid && typeof vid.url === 'string') return vid.url;
  if (typeof vid === 'string') return vid;
  const out = r?.output as Record<string, unknown> | string | undefined;
  if (typeof out === 'object' && out) {
    const ov = out.video as Record<string, unknown> | undefined;
    if (ov && typeof ov.url === 'string') return ov.url;
  }
  if (typeof out === 'string' && out.startsWith('http')) return out;
  const d = r?.data as Record<string, unknown> | undefined;
  if (d) {
    const dv = d.video as Record<string, unknown> | undefined;
    if (dv && typeof dv.url === 'string') return dv.url;
  }
  const videos = r?.videos as Array<Record<string, unknown>> | undefined;
  if (videos?.[0] && typeof videos[0].url === 'string') return videos[0].url;
  if (typeof r?.url === 'string' && (r.url as string).includes('.mp4')) return r.url as string;
  return null;
}

// ── Deep-search for any video URL in a Novita task-result response ──
function findVideoUrlDeep(obj: unknown, depth = 0): string | null {
  if (depth > 5 || !obj) return null;
  if (typeof obj === 'string' && obj.startsWith('http') && (obj.includes('.mp4') || obj.includes('video'))) return obj;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findVideoUrlDeep(item, depth + 1);
      if (found) return found;
    }
  }
  if (typeof obj === 'object' && obj !== null) {
    // Check known fields first
    const o = obj as Record<string, unknown>;
    for (const key of ['video_url', 'videoUrl', 'url', 'download_url', 'video_download_url']) {
      if (typeof o[key] === 'string' && (o[key] as string).startsWith('http')) return o[key] as string;
    }
    // Then recurse
    for (const val of Object.values(o)) {
      const found = findVideoUrlDeep(val, depth + 1);
      if (found) return found;
    }
  }
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
        // Try known field first, then deep-search the entire response
        const videoUrl = pollData?.videos?.[0]?.video_url
          || findVideoUrlDeep(pollData);
        if (videoUrl) {
          return NextResponse.json({ done: true, videoUrl, taskId });
        }
        // Succeeded but couldn't find video URL — return error with raw keys for debugging
        const keys = JSON.stringify(Object.keys(pollData || {}));
        console.error(`[animate-poll] Task ${taskId} SUCCEED but no video URL found. Top keys: ${keys}`);
        return NextResponse.json({
          done: true,
          error: `Video task succeeded but URL not found (keys: ${keys})`,
          taskId,
        });
      }
      if (status === 'TASK_STATUS_FAILED') {
        return NextResponse.json({ done: true, error: `Video failed: ${pollData?.task?.reason || 'unknown'}`, taskId });
      }

      // Still processing
      return NextResponse.json({ done: false, status, progress, taskId });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: `Poll error: ${msg}` }, { status: 500 });
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

  // Only use image-to-video models when we have a real HTTP URL.
  // Base64 data URIs from Pollinations/local providers won't work with Novita i2v endpoints.
  const hasRealImageUrl = imageUrl && imageUrl.startsWith('http');

  const models = hasRealImageUrl
    ? [
        { endpoint: 'minimax-hailuo-02', body: { prompt, image: imageUrl, duration, resolution: '768P', enable_prompt_expansion: true } },
        { endpoint: 'kling-v2.1-i2v-master', body: { prompt, image_url: imageUrl, duration: String(duration), mode: 'Standard' } },
        // Always include Wan as text-to-video fallback even when image URL is available
        { endpoint: 'wan-t2v', body: { prompt, size: '832*480', steps: 20, fast_mode: true } },
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${m.endpoint}: ${msg}`);
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

    // Only use real HTTP URLs for image-to-video.
    // Data URIs / base64 images (e.g. from Pollinations) are not supported by Novita i2v.
    const realImageUrl = imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('http')
      ? imageUrl
      : undefined;

    // ── 1. Try Novita AI (submit + quick poll for 45s) ──────────
    const novitaKey = process.env.NOVITA_API_KEY || '';
    if (novitaKey) {
      const result = await novitaSubmit({
        prompt: `${prompt}, cinematic motion, smooth animation`,
        imageUrl: realImageUrl,
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
              const videoUrl = pollData?.videos?.[0]?.video_url
                || findVideoUrlDeep(pollData);
              if (videoUrl) {
                return NextResponse.json({ videoUrl, sceneId, model: result.model, provider: 'novita' });
              }
              // Succeeded but no URL — break to return pending so client can retry
              console.error(`[animate] Task ${result.taskId} SUCCEED but no video URL. Keys: ${JSON.stringify(Object.keys(pollData || {}))}`);
              break;
            }
            if (status === 'TASK_STATUS_FAILED') {
              errors.push(`Novita ${result.model}: ${pollData?.task?.reason || 'generation failed'}`);
              break;
            }
          } catch { /* poll retry */ }
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
          const falInput: Record<string, unknown> = {
            prompt: `${prompt}, cinematic motion, smooth animation`,
          };
          if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
            falInput.image_url = imageUrl;
          } else if (imageBase64 && typeof imageBase64 === 'string') {
            const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
            falInput.image_url = `data:image/png;base64,${cleanBase64}`;
          }
          falInput.duration = parseInt(duration, 10) || 5;
          if (aspectRatio) falInput.aspect_ratio = aspectRatio;

          const result = await falGenerate(videoModel.id, falInput as Parameters<typeof falGenerate>[1]);
          const videoUrl = extractVideoUrl(result as Record<string, unknown>);
          if (videoUrl) {
            return NextResponse.json({ videoUrl, sceneId, model: videoModel.id, provider: 'fal.ai' });
          }
          errors.push('fal.ai: no video URL in response');
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          errors.push(`fal.ai: ${msg}`);
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
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Google Veo: ${msg}`);
      }
    }

    return NextResponse.json({
      error: `Video generation failed: ${errors.join(' | ')}`,
      sceneId,
    }, { status: 500 });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[animate] Top-level error:', msg);
    return NextResponse.json(
      { error: msg || 'Video generation failed' },
      { status: 500 }
    );
  }
}
