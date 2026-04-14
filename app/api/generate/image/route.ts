// app/api/generate/image/route.ts
// Image generation — FREE-FIRST fallback chain:
//   1. Pollinations (free, no key, no limits)
//   2. fal.ai (paid, best quality — if FAL_KEY set)
//   3. DALL·E / nexos.ai (paid legacy — if keys set)
import { NextRequest, NextResponse } from 'next/server';
import { pollinationsGenerateImage, isPollinationsAvailable } from '@/lib/pollinations';
import { isNexosConfigured, nexosImageGenerate } from '@/lib/nexos';
import { falGenerate, FAL_IMAGE_MODELS, mapSizeToFal } from '@/lib/fal';
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

// Map size string to Pollinations dimensions
function mapSizeToPollinations(size?: string): { width: number; height: number } {
  switch (size) {
    case '1792x1024': return { width: 1792, height: 1024 };
    case '1024x1792': return { width: 1024, height: 1792 };
    case '512x512': return { width: 512, height: 512 };
    default: return { width: 1024, height: 1024 };
  }
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
    let usedProvider = provider || modelKey || 'pollinations';

    // ── Explicit provider/model requested ───────────────────────
    const falModel = FAL_IMAGE_MODELS[modelKey || ''] || FAL_IMAGE_MODELS[provider || ''];

    if (falModel) {
      // fal.ai model explicitly requested — check tier + key
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

      result = { url: falResult.images?.[0]?.url || '' };
      usedProvider = modelKey || provider || 'fal';

    } else if (provider === 'dalle' || provider === 'nexos') {
      // Explicit paid provider requested
      if (provider === 'nexos' || isNexosConfigured()) {
        if (!isNexosConfigured()) {
          return NextResponse.json({ error: 'NEXOS_API_KEY not configured' }, { status: 503 });
        }
        result = await nexosImageGenerate(enhancedPrompt, { size, quality: options?.quality });
      } else {
        result = await generateWithDalle(enhancedPrompt, { size, style, ...options });
      }
      usedProvider = provider;

    } else {
      // ── FREE-FIRST AUTO FALLBACK ──────────────────────────────
      // 1. Pollinations (always free)
      // 2. fal.ai flux-schnell (if FAL_KEY set)
      // 3. DALL·E (if OPENAI_API_KEY set)

      try {
        const dims = mapSizeToPollinations(size);
        const polResult = await pollinationsGenerateImage(enhancedPrompt, {
          width: dims.width,
          height: dims.height,
          model: 'flux',
          nologo: true,
        });
        result = { url: polResult.url };
        usedProvider = 'pollinations';
      } catch (polErr) {
        console.warn('Pollinations image failed, trying fallbacks:', polErr);

        // Try fal.ai if configured
        if (process.env.FAL_KEY) {
          try {
            const falResult = await falGenerate('fal-ai/flux/schnell', {
              prompt: enhancedPrompt,
              image_size: mapSizeToFal(size),
              num_images: 1,
            });
            result = { url: falResult.images?.[0]?.url || '' };
            usedProvider = 'fal-flux-schnell';
          } catch {
            // Fall through to DALL·E
            if (process.env.OPENAI_API_KEY || isNexosConfigured()) {
              if (isNexosConfigured()) {
                result = await nexosImageGenerate(enhancedPrompt, { size });
              } else {
                result = await generateWithDalle(enhancedPrompt, { size, style });
              }
              usedProvider = 'dalle-fallback';
            } else {
              throw new Error('All image providers failed. Pollinations is temporarily unavailable and no paid API keys are configured.');
            }
          }
        } else if (process.env.OPENAI_API_KEY || isNexosConfigured()) {
          if (isNexosConfigured()) {
            result = await nexosImageGenerate(enhancedPrompt, { size });
          } else {
            result = await generateWithDalle(enhancedPrompt, { size, style });
          }
          usedProvider = 'dalle-fallback';
        } else {
          throw new Error('All image providers failed. Pollinations is temporarily unavailable and no paid API keys are configured.');
        }
      }
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
