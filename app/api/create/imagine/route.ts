// app/api/create/imagine/route.ts
// Scene image generation — Pollinations primary, Novita AI fallback 1, fal.ai + HuggingFace fallbacks
// Supports multiple models, aspect ratios, negative prompts
import { NextRequest, NextResponse } from 'next/server';
import { falGenerate, FAL_IMAGE_MODELS } from '@/lib/fal';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const {
      prompt,
      model = 'flux-schnell',
      sceneId,
      negative_prompt,
      width,
      height,
    } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const enhancedPrompt = `${prompt}, high detail, professional quality, 4k`;
    const errors: string[] = [];

    // ── 1. Try Pollinations.ai FLUX (primary — cheapest) ────────
    const pollinationsKey = process.env.POLLINATIONS_API_KEY || '';
    if (pollinationsKey) {
      try {
        const imgWidth = width ? Math.min(Math.max(width, 64), 2048) : 1024;
        const imgHeight = height ? Math.min(Math.max(height, 64), 2048) : 1024;

        const encodedPrompt = encodeURIComponent(enhancedPrompt);
        const params = new URLSearchParams({
          model: 'flux',
          width: String(imgWidth),
          height: String(imgHeight),
          nologo: 'true',
          quality: 'medium',
        });
        if (negative_prompt) params.set('negative_prompt', negative_prompt);

        const url = `https://gen.pollinations.ai/image/${encodedPrompt}?${params}`;
        console.log('[imagine] Trying Pollinations.ai FLUX...');

        const polRes = await fetch(url, {
          headers: { 'Authorization': `Bearer ${pollinationsKey.trim()}` },
        });

        if (polRes.ok) {
          const ct = polRes.headers.get('content-type') || '';
          if (ct.includes('image')) {
            const buffer = await polRes.arrayBuffer();
            if (buffer.byteLength > 500) {
              const contentType = ct.split(';')[0].trim() || 'image/jpeg';
              const base64 = Buffer.from(buffer).toString('base64');
              return NextResponse.json({
                image: `data:${contentType};base64,${base64}`,
                sceneId,
                model: 'pollinations-flux',
                provider: 'pollinations',
              });
            }
            errors.push('Pollinations: image too small / empty');
          } else {
            const text = await polRes.text();
            errors.push(`Pollinations: unexpected content-type ${ct} — ${text.slice(0, 100)}`);
          }
        } else {
          const errText = await polRes.text();
          console.warn(`[imagine] Pollinations failed (HTTP ${polRes.status}): ${errText.slice(0, 200)}`);
          errors.push(`Pollinations: HTTP ${polRes.status}`);
        }
      } catch (polErr: unknown) {
        const msg = polErr instanceof Error ? polErr.message : String(polErr);
        console.warn('[imagine] Pollinations error:', msg);
        errors.push(`Pollinations: ${msg}`);
      }
    }

    // ── 2. Try Novita AI FLUX Schnell (fallback 1) ──────────────
    const novitaKey = process.env.NOVITA_API_KEY || '';
    if (novitaKey) {
      try {
        const novitaWidth = width ? Math.min(Math.max(width, 64), 2048) : 1024;
        const novitaHeight = height ? Math.min(Math.max(height, 64), 2048) : 1024;

        const novitaBody: Record<string, unknown> = {
          prompt: enhancedPrompt,
          width: novitaWidth,
          height: novitaHeight,
          steps: 4,
          image_num: 1,
        };

        console.log('[imagine] Trying Novita AI FLUX Schnell...');
        const novitaRes = await fetch('https://api.novita.ai/v3beta/flux-1-schnell', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${novitaKey.trim()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(novitaBody),
        });

        if (novitaRes.ok) {
          const novitaData = await novitaRes.json();

          // FLUX Schnell returns images directly (sync endpoint)
          let imageUrl: string | undefined = novitaData?.images?.[0]?.image_url;

          // Fallback: if only task_id returned, poll for result
          if (!imageUrl && novitaData?.task?.task_id) {
            const taskId = novitaData.task.task_id;
            console.log(`[imagine] Novita: polling task ${taskId}...`);
            const deadline = Date.now() + 45_000;
            while (Date.now() < deadline) {
              await new Promise(r => setTimeout(r, 2000));
              const pollRes = await fetch(
                `https://api.novita.ai/v3/async/task-result?task_id=${taskId}`,
                { headers: { 'Authorization': `Bearer ${novitaKey.trim()}` } }
              );
              if (!pollRes.ok) continue;
              const pollData = await pollRes.json();
              const status = pollData?.task?.status;
              if (status === 'TASK_STATUS_SUCCEED') {
                imageUrl = pollData?.images?.[0]?.image_url;
                break;
              }
              if (status === 'TASK_STATUS_FAILED') {
                throw new Error(`Novita task failed: ${pollData?.task?.reason || 'unknown'}`);
              }
            }
          }

          if (imageUrl) {
            const imgRes = await fetch(imageUrl);
            if (imgRes.ok) {
              const buffer = await imgRes.arrayBuffer();
              const contentType = imgRes.headers.get('content-type') || 'image/png';
              const base64 = Buffer.from(buffer).toString('base64');

              return NextResponse.json({
                image: `data:${contentType};base64,${base64}`,
                imageUrl,
                sceneId,
                model: 'novita-flux-schnell',
                provider: 'novita',
              });
            }
          }
          errors.push('Novita: no image URL in response');
        } else {
          const errText = await novitaRes.text();
          console.warn(`[imagine] Novita AI failed (HTTP ${novitaRes.status}): ${errText.slice(0, 200)}`);
          if (errText.includes('NOT_ENOUGH_BALANCE')) {
            errors.push('Novita: insufficient balance — top up at novita.ai/billing');
          } else {
            errors.push(`Novita: HTTP ${novitaRes.status}`);
          }
        }
      } catch (novitaErr: unknown) {
        const msg = novitaErr instanceof Error ? novitaErr.message : String(novitaErr);
        console.warn('[imagine] Novita AI error:', msg);
        errors.push(`Novita: ${msg}`);
      }
    }

    // ── 3. Try fal.ai (fallback 2) ──────────────────────────────
    const falModel = FAL_IMAGE_MODELS[model];

    if (falModel && process.env.FAL_KEY) {
      try {
        const input: Record<string, unknown> = {
          prompt: enhancedPrompt,
        };

        if (width && height) {
          input.image_size = { width: Math.min(width, 1536), height: Math.min(height, 1536) };
        }

        if (negative_prompt) {
          input.negative_prompt = negative_prompt;
        }

        input.num_images = 1;

        const result = await falGenerate(falModel.id, input as Parameters<typeof falGenerate>[1]);

        if (result.images?.[0]?.url) {
          const imageUrl = result.images[0].url;

          const imgRes = await fetch(imageUrl);
          if (imgRes.ok) {
            const buffer = await imgRes.arrayBuffer();
            const contentType = imgRes.headers.get('content-type') || 'image/png';
            const base64 = Buffer.from(buffer).toString('base64');

            return NextResponse.json({
              image: `data:${contentType};base64,${base64}`,
              imageUrl,
              sceneId,
              model: falModel.id,
              provider: 'fal.ai',
            });
          }
        }
        errors.push('fal.ai: no image in response');
      } catch (falErr: unknown) {
        const msg = falErr instanceof Error ? falErr.message : String(falErr);
        console.warn(`[imagine] fal.ai failed for ${model}:`, msg);
        errors.push(`fal.ai: ${msg}`);
      }
    }

    // ── 4. Fallback: HuggingFace ────────────────────────────────
    const HF_MODELS: Record<string, string> = {
      'flux-schnell':  'black-forest-labs/FLUX.1-schnell',
      'flux-dev':      'black-forest-labs/FLUX.1-dev',
      'sdxl':          'stabilityai/stable-diffusion-xl-base-1.0',
    };

    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (apiKey) {
      try {
        const modelId = HF_MODELS[model] || HF_MODELS['flux-schnell'];

        const body: Record<string, unknown> = {
          inputs: enhancedPrompt,
        };

        const params: Record<string, unknown> = {};
        if (negative_prompt) params.negative_prompt = negative_prompt;
        if (width && height && !model.startsWith('flux')) {
          params.width = Math.min(width, 1024);
          params.height = Math.min(height, 1024);
        }
        if (Object.keys(params).length > 0) body.parameters = params;

        const MAX_HF_RETRIES = 3;
        for (let attempt = 1; attempt <= MAX_HF_RETRIES; attempt++) {
          const res = await fetch(`https://router.huggingface.co/hf-inference/models/${modelId}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          });

          if (res.status === 503) {
            const errData = await res.json().catch(() => ({}));
            const estimatedTime = (errData as Record<string, number>).estimated_time || 30;

            if (attempt === MAX_HF_RETRIES) {
              return NextResponse.json({
                loading: true,
                estimated_time: estimatedTime,
                sceneId,
                message: `Model is loading (attempt ${attempt}/${MAX_HF_RETRIES}). Estimated wait: ${Math.ceil(estimatedTime)}s.`,
              }, { status: 503 });
            }

            const waitMs = Math.min(estimatedTime * 1000, 30000);
            console.log(`HuggingFace 503 (attempt ${attempt}/${MAX_HF_RETRIES}), waiting ${Math.ceil(waitMs / 1000)}s...`);
            await new Promise(r => setTimeout(r, waitMs));
            continue;
          }

          if (!res.ok) {
            const errText = await res.text();
            console.error(`HF image error (${res.status}):`, errText);
            errors.push(`HuggingFace: HTTP ${res.status}`);
            break;
          }

          const contentType = res.headers.get('content-type') || '';

          if (contentType.includes('image')) {
            const buffer = await res.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            return NextResponse.json({
              image: `data:${contentType};base64,${base64}`,
              sceneId,
              model: modelId,
              provider: 'huggingface',
            });
          }

          const textResult = await res.text();
          try {
            const jsonResult = JSON.parse(textResult);
            if (jsonResult[0]?.generated_image || jsonResult[0]?.blob) {
              return NextResponse.json({
                image: jsonResult[0].generated_image || jsonResult[0].blob,
                sceneId,
                model: modelId,
                provider: 'huggingface',
              });
            }
          } catch {
            // Not JSON
          }

          errors.push('HuggingFace: unexpected response format');
          break;
        }
      } catch (hfErr: unknown) {
        const msg = hfErr instanceof Error ? hfErr.message : String(hfErr);
        errors.push(`HuggingFace: ${msg}`);
      }
    }

    // All providers failed
    return NextResponse.json({
      error: 'Image generation failed — all providers exhausted',
      details: errors.join(' | '),
      sceneId,
    }, { status: 500 });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Image generation error:', msg);
    return NextResponse.json({ error: msg || 'Image generation failed' }, { status: 500 });
  }
}
