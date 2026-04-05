// app/api/generate/image/route.ts
// Image generation — fal.ai (primary), with DALL·E & nexos.ai fallback
// Supports: Flux 2 Pro/Dev/Schnell, SDXL, Recraft, Ideogram, Seedream + legacy DALL·E
import { NextRequest, NextResponse } from 'next/server';
import { isNexosConfigured, nexosImageGenerate } from '@/lib/nexos';
import { falGenerate, FAL_IMAGE_MODELS, mapSizeToFal, getModelByKey } from '@/lib/fal';
import { deductCredits, getCreditBalance, grantDailyCredits } from '@/lib/credits';
import { logGeneration } from '@/lib/db';

// Legacy DALL·E for backward compatibility (direct OpenAI)
async function generateWithDalle(prompt: string, options: any = {}) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not configured');

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: options.size || '1024x1024',
      quality: options.quality || 'standard',
      style: options.style || 'vivid',
    }),
  });
  if (!res.ok) throw new Error(`DALL·E error: ${await res.text()}`);
  const data = await res.json();
  return { url: data.data[0].url, revised_prompt: data.data[0].revised_prompt };
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')!;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, provider, model: modelKey, style, size, characterRef, options } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    // Grant daily free credits if eligible
    await grantDailyCredits(userId).catch(() => {});

    // Build enhanced prompt for character consistency
    let enhancedPrompt = prompt;
    if (characterRef) {
      enhancedPrompt = `${characterRef.style} style. Character: ${characterRef.name} - ${characterRef.description}. Traits: ${characterRef.traits?.join(', ')}. Scene: ${prompt}`;
    }

    let result: { url: string; revised_prompt?: string };
    let creditCost = 0;
    let usedProvider = provider || modelKey || 'flux-schnell';

    // ── fal.ai models (new, primary) ────────────────────────────
    const falModel = FAL_IMAGE_MODELS[modelKey || ''] || FAL_IMAGE_MODELS[provider || ''];
    if (falModel) {
      creditCost = falModel.creditCost;

      // Check credits
      const { success, error } = await deductCredits(
        userId, creditCost, 'image_generation',
        { model: falModel.id, prompt: enhancedPrompt.slice(0, 200) },
      );
      if (!success) {
        return NextResponse.json(
          { error: error || 'Insufficient credits', creditsNeeded: creditCost },
          { status: 402 },
        );
      }

      const falResult = await falGenerate(falModel.id, {
        prompt: enhancedPrompt,
        image_size: mapSizeToFal(size),
        num_images: 1,
        ...(options || {}),
      });

      result = {
        url: falResult.images?.[0]?.url || '',
        revised_prompt: undefined,
      };
      usedProvider = modelKey || provider || 'fal';

    // ── Legacy providers (backward compatibility) ───────────────
    } else {
      // Legacy: flat 3 credits for non-fal models
      creditCost = 3;

      const selectedProvider = provider || 'dalle';

      const { success, error } = await deductCredits(
        userId, creditCost, 'image_generation',
        { model: selectedProvider, prompt: enhancedPrompt.slice(0, 200) },
      );
      if (!success) {
        return NextResponse.json(
          { error: error || 'Insufficient credits', creditsNeeded: creditCost },
          { status: 402 },
        );
      }

      switch (selectedProvider) {
        case 'dalle':
          if (isNexosConfigured()) {
            result = await nexosImageGenerate(enhancedPrompt, { size, quality: options?.quality });
          } else {
            result = await generateWithDalle(enhancedPrompt, { size, style, ...options });
          }
          break;
        case 'nexos':
          if (!isNexosConfigured()) {
            return NextResponse.json({ error: 'NEXOS_API_KEY not configured' }, { status: 503 });
          }
          result = await nexosImageGenerate(enhancedPrompt, { size, quality: options?.quality });
          break;
        default:
          return NextResponse.json({ error: `Unknown provider: ${selectedProvider}. Use model keys like flux-schnell, flux-pro, sdxl, seedream, etc.` }, { status: 400 });
      }

      usedProvider = selectedProvider;
    }

    // Log generation
    await logGeneration({
      userId,
      creationType: 'image',
      model: usedProvider,
      prompt: enhancedPrompt.slice(0, 500),
      result: { url: result.url },
      success: true,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      url: result.url,
      provider: usedProvider,
      revised_prompt: result.revised_prompt,
      creditsUsed: creditCost,
    });
  } catch (err: any) {
    console.error('Image generation error:', err);
    const msg = err.message || 'Image generation failed';
    const isConfig = msg.includes('not configured');
    return NextResponse.json(
      { error: msg, configError: isConfig },
      { status: isConfig ? 503 : 500 },
    );
  }
}
