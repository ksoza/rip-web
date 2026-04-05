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
        console.warn(`fal.ai generation failed for ${model}, falling back:`, falErr.message);
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
      return NextResponse.json({ error: 'No image generation API available (FAL_KEY and HUGGINGFACE_API_KEY both missing)' }, { status: 500 });
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
      return NextResponse.json({
        loading: true,
        estimated_time: errData.estimated_time || 30,
        sceneId,
      }, { status: 503 });
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

  } catch (error: any) {
    console.error('Image generation error:', error);
    return NextResponse.json({ error: error.message || 'Image generation failed' }, { status: 500 });
  }
}
