// app/api/create/imagine/route.ts
// Scene image generation — fal.ai as primary, HuggingFace as fallback
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

    // ── Try fal.ai first (primary) ───────────────────────────────
    const falModel = FAL_IMAGE_MODELS[model];

    if (falModel && process.env.FAL_KEY) {
      try {
        const input: Record<string, unknown> = {
          prompt: enhancedPrompt,
        };

        // Set image size based on width/height
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

          // Fetch the image and convert to base64 for client display
          const imgRes = await fetch(imageUrl);
          if (imgRes.ok) {
            const buffer = await imgRes.arrayBuffer();
            const contentType = imgRes.headers.get('content-type') || 'image/png';
            const base64 = Buffer.from(buffer).toString('base64');

            return NextResponse.json({
              image: `data:${contentType};base64,${base64}`,
              imageUrl, // Also return the URL for video gen
              sceneId,
              model: falModel.id,
              provider: 'fal.ai',
            });
          }
        }
      } catch (falErr: any) {
        console.warn(`fal.ai generation failed for ${model}, falling back to HuggingFace:`, falErr.message);
        // Fall through to HuggingFace
      }
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
        error: 'No image generation API available',
        details: !process.env.FAL_KEY && !apiKey
          ? 'Both FAL_KEY and HUGGINGFACE_API_KEY are missing. Set at least one in your Vercel environment variables.'
          : 'FAL_KEY failed and HUGGINGFACE_API_KEY is not set.',
      }, { status: 500 });
    }

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

    // HuggingFace with retry for cold-start 503s
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
        const estimatedTime = errData.estimated_time || 30;

        // On last attempt, return the 503 to the client with timing info
        if (attempt === MAX_HF_RETRIES) {
          return NextResponse.json({
            loading: true,
            estimated_time: estimatedTime,
            sceneId,
            message: `Model is loading (attempt ${attempt}/${MAX_HF_RETRIES}). Estimated wait: ${Math.ceil(estimatedTime)}s.`,
          }, { status: 503 });
        }

        // Wait before retrying (use the estimated time, capped at 30s)
        const waitMs = Math.min(estimatedTime * 1000, 30000);
        console.log(`HuggingFace 503 (attempt ${attempt}/${MAX_HF_RETRIES}), waiting ${Math.ceil(waitMs / 1000)}s...`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }

      if (!res.ok) {
        const errText = await res.text();
        console.error(`HF image error (${res.status}):`, errText);
        return NextResponse.json({
          error: `Image generation failed: ${res.status}`,
          details: errText.slice(0, 200),
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
        error: 'Unexpected response format',
        details: textResult.slice(0, 200),
      }, { status: 500 });
    }

    // Should not reach here, but just in case
    return NextResponse.json({ error: 'Image generation failed after retries' }, { status: 500 });

  } catch (error: any) {
    console.error('Image generation error:', error);
    return NextResponse.json({ error: error.message || 'Image generation failed' }, { status: 500 });
  }
}
