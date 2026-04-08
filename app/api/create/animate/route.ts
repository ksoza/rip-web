// app/api/create/animate/route.ts
// Video generation — fal.ai primary, HuggingFace fallback
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

    let falError = '';

    // ── Try fal.ai first ────────────────────────────────────────
    if (process.env.FAL_KEY) {
      const videoModel = FAL_VIDEO_MODELS[model];
      if (videoModel) {
        try {
          const input: Record<string, any> = {
            prompt: `${prompt}, cinematic motion, smooth animation, professional quality`,
          };

          if (imageUrl) {
            input.image_url = imageUrl;
          } else if (imageBase64) {
            const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
            input.image_url = `data:image/png;base64,${base64Data}`;
          }

          const durationNum = parseInt(duration, 10) || 5;
          input.duration = durationNum;
          if (aspectRatio) input.aspect_ratio = aspectRatio;

          switch (model) {
            case 'ltx-video': input.num_frames = durationNum * 24; break;
            case 'seedance': input.motion_mode = 'normal'; break;
            case 'kling': input.mode = 'pro'; break;
            case 'hailuo': input.prompt_enhancer = true; break;
          }

          console.log(`[animate] fal.ai: model=${videoModel.id}`);
          const result = await falGenerate(videoModel.id, input);
          const videoUrl = extractVideoUrl(result);

          if (videoUrl) {
            return NextResponse.json({
              videoUrl, sceneId,
              model: videoModel.id,
              provider: 'fal.ai',
            });
          }
          falError = `No video URL in fal.ai response (keys: ${Object.keys(result || {}).join(',')})`;
        } catch (e: any) {
          falError = `fal.ai: ${e.message || String(e)}`;
          console.warn(`[animate] ${falError}`);
        }
      } else {
        falError = `Unknown model: ${model}`;
      }
    } else {
      falError = 'FAL_KEY not set';
    }

    // ── Fallback: Google Veo via Gemini API ─────────────────────
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
          // Long-running operation — poll for result
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
          console.warn(`[animate] Google Veo failed: ${veoRes.status} ${errBody.slice(0, 200)}`);
        }
      } catch (e: any) {
        console.warn(`[animate] Google Veo error: ${e.message}`);
      }
    }

    // ── Fallback: HuggingFace image-to-video ────────────────────
    const hfKey = process.env.HUGGINGFACE_API_KEY || '';
    if (hfKey && (imageUrl || imageBase64)) {
      try {
        console.log('[animate] Trying HuggingFace SVD...');

        // For HF image-to-video, we need to send the image
        const imgInput = imageUrl || imageBase64;

        const hfRes = await fetch(
          'https://router.huggingface.co/hf-inference/models/stabilityai/stable-video-diffusion-img2vid-xt',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${hfKey.trim()}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ inputs: imgInput }),
          }
        );

        const ct = hfRes.headers.get('content-type') || '';

        if (hfRes.ok && ct.includes('video')) {
          // HF returns raw video bytes
          const buffer = await hfRes.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          const videoDataUrl = `data:video/mp4;base64,${base64}`;

          return NextResponse.json({
            videoUrl: videoDataUrl,
            sceneId,
            model: 'stable-video-diffusion',
            provider: 'huggingface',
          });
        }

        if (hfRes.status === 503) {
          console.warn('[animate] HuggingFace SVD: model loading (503)');
        } else {
          const errText = await hfRes.text();
          console.warn(`[animate] HuggingFace SVD: ${hfRes.status} ${errText.slice(0, 200)}`);
        }
      } catch (e: any) {
        console.warn(`[animate] HuggingFace SVD error: ${e.message}`);
      }
    }

    // ── All providers failed ────────────────────────────────────
    return NextResponse.json({
      error: `Video generation failed. ${falError}. All fallbacks exhausted.`,
      details: 'fal.ai balance exhausted. Top up at fal.ai/dashboard/billing, or add GOOGLE_AI_KEY for Veo.',
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
