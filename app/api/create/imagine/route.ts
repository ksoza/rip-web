// app/api/create/imagine/route.ts
// Scene image generation via HuggingFace Inference API
// Supports aspect ratio, negative prompts, multiple models
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

// Available models on HuggingFace
const MODELS: Record<string, string> = {
  'flux-schnell':  'black-forest-labs/FLUX.1-schnell',
  'flux-dev':      'black-forest-labs/FLUX.1-dev',
  'sdxl':          'stabilityai/stable-diffusion-xl-base-1.0',
  'sd-3':          'stabilityai/stable-diffusion-3-medium-diffusers',
  'playground':    'playgroundai/playground-v2.5-1024px-aesthetic',
};

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

    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'HUGGINGFACE_API_KEY not configured' }, { status: 500 });
    }

    const modelId = MODELS[model] || MODELS['flux-schnell'];

    // The prompt already includes style from the client side
    const enhancedPrompt = `${prompt}, high detail, professional quality, 4k`;

    const body: Record<string, unknown> = {
      inputs: enhancedPrompt,
    };

    // Add parameters (negative prompt, dimensions)
    const params: Record<string, unknown> = {};
    if (negative_prompt) {
      params.negative_prompt = negative_prompt;
    }
    // Only some models support width/height
    if (width && height && !model.startsWith('flux')) {
      params.width = Math.min(width, 1024);
      params.height = Math.min(height, 1024);
    }
    if (Object.keys(params).length > 0) {
      body.parameters = params;
    }

    // Call HuggingFace Inference API
    const res = await fetch(`https://api-inference.huggingface.co/models/${modelId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Handle model loading (503)
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
      });
    }

    // Some models return JSON with image data
    const textResult = await res.text();
    try {
      const jsonResult = JSON.parse(textResult);
      if (jsonResult[0]?.generated_image || jsonResult[0]?.blob) {
        return NextResponse.json({
          image: jsonResult[0].generated_image || jsonResult[0].blob,
          sceneId,
          model: modelId,
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
