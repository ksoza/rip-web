// app/api/generate/image/route.ts
// Image generation — fal.ai (primary), with DALL·E & nexos.ai fallback
// Flat pricing: check tier access, no credit deduction
import { NextRequest, NextResponse } from 'next/server';
import { isNexosConfigured, nexosImageGenerate } from '@/lib/nexos';
import { falGenerate, FAL_IMAGE_MODELS, mapSizeToFal, getModelByKey } from '@/lib/fal';
import { checkGenerationAccess, recordGeneration } from '@/lib/credits';
import { canAccessTier } from '@/lib/revenue';
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

    // Check generation access (tier-based, unlimited for paid)
    const access = await checkGenerationAccess(userId);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error || 'Generation limit reached. Upgrade for unlimited access.' },
        { status: 402 },
      );
    }

    // Build enhanced prompt for character consistency
    let enhancedPrompt = prompt;
    if (characterRef) {
      enhancedPrompt = `${characterRef.style} style. Character: ${characterRef.name} - ${characterRef.description}. Traits: ${characterRef.traits?.join(', ')}. Scene: ${prompt}`;
    }

    let result: { url: string; revised_prompt?: string };
    let usedProvider = provider || modelKey || 'flux-schnell';

    // ── fal.ai models (new, primary) ────────────────────────────
    const falModel = FAL_IMAGE_MODELS[modelKey || ''] || FAL_IMAGE_MODELS[provider || ''];
    if (falModel) {
      // Check tier access for this model
      if (falModel.tier && !canAccessTier(access.tier, falModel.tier)) {
        return NextResponse.json(
          { error: `${falModel.tier} tier required for this model. Upgrade your plan.` },
          { status: 403 },
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
      const selectedProvider = provider || 'dalle';

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

    // Record generation (for free tier daily counting)
    await recordGeneration(userId).catch(() => {});

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
      tier: access.tier,
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
