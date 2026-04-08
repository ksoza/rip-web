// app/api/create/imagine/route.ts
// Scene image generation — fal.ai as primary, HuggingFace as fallback
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
    let falError = '';

    // ── Try fal.ai first (primary) ───────────────────────────────
    const falModel = FAL_IMAGE_MODELS[model];

    if (falModel && process.env.FAL_KEY) {
      try {
        const input: Record<string, unknown> = {
          prompt: enhancedPrompt,
          num_images: 1,
        };

        if (width && height) {
          input.image_size = { width: Math.min(width, 1536), height: Math.min(height, 1536) };
        }

        if (negative_prompt) {
          input.negative_prompt = negative_prompt;
        }

        console.log(`[imagine] fal.ai: model=${falModel.id}, prompt="${prompt.slice(0, 60)}..."`);

        const result = await falGenerate(falModel.id, input as Parameters<typeof falGenerate>[1]);

        if (result.images?.[0]?.url) {
          const imageUrl = result.images[0].url;

          // Fetch and convert to base64
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
          } else {
            falError = `fal.ai image fetch failed: ${imgRes.status}`;
            console.warn(`[imagine] ${falError}`);
          }
        } else {
          falError = 'fal.ai returned no images';
          console.warn(`[imagine] ${falError}, result keys: ${Object.keys(result).join(',')}`);
        }
      } catch (falErr: any) {
        falError = `fal.ai: ${falErr.message || String(falErr)}`;
        console.warn(`[imagine] ${falError}`);
      }
    } else if (!process.env.FAL_KEY) {
      falError = 'FAL_KEY not set';
    } else {
      falError = `Model "${model}" not found in FAL_IMAGE_MODELS`;
    }

    // ── Fallback: HuggingFace ────────────────────────────────────
    const HF_MODELS: Record<string, string> = {
      'flux-schnell':  'black-forest-labs/FLUX.1-schnell',
      'flux-dev':      'black-forest-labs/FLUX.1-dev',
      'sdxl':          'stabilityai/stable-diffusion-xl-base-1.0',
    };

    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: `Image generation failed. fal.ai: ${falError}. HuggingFace: HUGGINGFACE_API_KEY not set.`,
        details: 'Set FAL_KEY or HUGGINGFACE_API_KEY in Vercel env vars.',
        sceneId,
      }, { status: 500 });
    }

    const modelId = HF_MODELS[model] || HF_MODELS['flux-schnell'];
    console.log(`[imagine] HuggingFace fallback: model=${modelId}`);

    const body: Record<string, unknown> = { inputs: enhancedPrompt };
    const params: Record<string, unknown> = {};
    if (negative_prompt) params.negative_prompt = negative_prompt;
    if (width && height && !model.startsWith('flux')) {
      params.width = Math.min(width, 1024);
      params.height = Math.min(height, 1024);
    }
    if (Object.keys(params).length > 0) body.parameters = params;

    const MAX_HF_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_HF_RETRIES; attempt++) {
      const res = await fetch(`https://api-inference.huggingface.co/models/${modelId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (res.status === 503) {
        const errData = await res.json().catch(() => ({}));
        const estimatedTime = errData.estimated_time || 30;

        if (attempt === MAX_HF_RETRIES) {
          return NextResponse.json({
            error: `Image generation failed. fal.ai: ${falError}. HuggingFace: model loading (tried ${attempt}x).`,
            loading: true,
            estimated_time: estimatedTime,
            sceneId,
          }, { status: 503 });
        }

        const waitMs = Math.min(estimatedTime * 1000, 30000);
        console.log(`[imagine] HF 503 (attempt ${attempt}/${MAX_HF_RETRIES}), waiting ${Math.ceil(waitMs / 1000)}s...`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[imagine] HF error (${res.status}):`, errText);
        return NextResponse.json({
          error: `Image generation failed. fal.ai: ${falError}. HuggingFace: ${res.status} ${errText.slice(0, 200)}`,
          sceneId,
        }, { status: res.status >= 500 ? 500 : res.status });
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

      return NextResponse.json({
        error: `Image generation failed. fal.ai: ${falError}. HuggingFace: unexpected response format.`,
        details: textResult.slice(0, 200),
        sceneId,
      }, { status: 500 });
    }

    return NextResponse.json({
      error: `Image generation failed after all retries. fal.ai: ${falError}`,
      sceneId,
    }, { status: 500 });

  } catch (error: any) {
    console.error('[imagine] Top-level error:', error);
    return NextResponse.json({
      error: error.message || 'Image generation failed',
      sceneId: undefined,
    }, { status: 500 });
  }
}
