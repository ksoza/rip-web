// app/api/create/imagine/route.ts
// Scene image generation — show-faithful by default
//
// Fallback chain (lowest cost first):
//   1. Pollinations (FREE, no key needed) — auto-selects model per show category
//   2. HuggingFace FLUX.1-schnell (free with HF_TOKEN)
//   3. fal.ai FLUX (paid fallback)
//   3. HuggingFace Inference (free tier, may be slow)
//
// Injects show-specific visual style + character descriptions from SHOW_PROFILES
// so generated images match the original show's look 1:1.
import { NextRequest, NextResponse } from 'next/server';
import { falGenerate, FAL_IMAGE_MODELS } from '@/lib/fal';
import { SHOW_PROFILES, getStylePrompt, type ArtStyleId } from '@/lib/shows';

export const maxDuration = 60;

// Simple string hash for deterministic seed generation
function hashCode(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const chr = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// ── Pick the best Pollinations model for the show category ──────
function pollinationsModel(category?: string, isFlatShow?: boolean): string {
  switch (category) {
    case 'Anime':   return 'flux-anime';
    case 'Cartoon': return isFlatShow ? 'turbo' : 'flux';  // turbo avoids over-detailing flat styles
    case 'Movie':   return 'flux-realism';
    case 'TV Show': return 'flux-realism';
    default:        return 'flux';
  }
}

// ── Styles that FULLY REPLACE the show's look (not layered) ─────
const FULL_TRANSFORM_STYLES: ArtStyleId[] = ['claymation', '3d_render'];

// ── Shows with FLAT / SIMPLE art that must NOT be "enhanced" or smoothed ──
// These need negative prompts to stop AI from adding realism, shading, gradients
const FLAT_STYLE_SHOWS: Record<string, string> = {
  'South Park': 'realistic, smooth lines, shading, gradients, 3D rendering, detailed faces, realistic proportions, complex lighting, shadows, photorealistic',
  'The Simpsons': 'realistic, photorealistic, 3D, complex shading, realistic proportions, live action',
  "Bob's Burgers": 'realistic, photorealistic, 3D, complex shading, realistic proportions, live action, anime style',
  'Adventure Time': 'realistic, photorealistic, 3D, complex shading, realistic proportions, live action',
  'SpongeBob SquarePants': 'realistic, photorealistic, 3D, complex shading, realistic proportions, live action',
  'Family Guy': 'realistic, photorealistic, 3D, complex shading, realistic proportions, live action',
  'Futurama': 'realistic, photorealistic, 3D, complex shading, realistic proportions, live action',
  'Rick and Morty': 'realistic, photorealistic, 3D, complex shading, realistic proportions, live action',
};

// ── Enrich prompt with show style + character visuals ───────────
// Design rule:
//   - Default (source-faithful): 1:1 recreation of the original show
//   - Most styles: 1:1 show look AS THE BASE + art style layered ON TOP
//   - claymation & 3d_render: FULL transformation (replaces original look)
//
// Prompt structure for flat-style shows (South Park, Bob's Burgers, etc.):
//   INSTRUCTION → STYLE ATTRIBUTES → CHARACTER DETAILS → SCENE → ANTI-DRIFT
// This front-loads the visual constraints so FLUX prioritizes them.
function enrichPrompt(
  basePrompt: string,
  showTitle?: string,
  artStyle?: ArtStyleId,
  characters?: string[],
  characterRefDescriptions?: Record<string, string>,
): string {
  const show = showTitle ? SHOW_PROFILES[showTitle] : undefined;
  const isFullTransform = artStyle && FULL_TRANSFORM_STYLES.includes(artStyle);
  const isFaithful = !artStyle || artStyle === 'source-faithful';
  const isFlatShow = !!(showTitle && FLAT_STYLE_SHOWS[showTitle]);

  // ── Flat-style shows in source-faithful mode get a specialized prompt ──
  // Standard comma-separated prompts dilute the style. Instead we use
  // a structured instruction that FLUX models follow more reliably.
  if (isFaithful && isFlatShow && show?.visualStyle) {
    const parts: string[] = [];

    // 1. Lead with an explicit drawing instruction
    parts.push(`Draw this scene in the EXACT art style of the TV show ${show.title}`);

    // 2. Visual attributes as constraints (not suggestions)
    parts.push(show.visualStyle);

    // 3. Character descriptions with ref anchors
    if (show.characters && characters?.length) {
      const charDescs = characters
        .map(name => {
          const c = show.characters.find(ch =>
            ch.name.toLowerCase() === name.toLowerCase()
          );
          if (!c) return null;
          // Use pre-generated reference description if available
          const ref = characterRefDescriptions?.[name];
          return ref
            ? `${c.name} (${c.visualDesc}, ${ref})`
            : `${c.name}: ${c.visualDesc}`;
        })
        .filter(Boolean)
        .join('. ');
      if (charDescs) parts.push(charDescs);
    }

    // 4. Scene description
    parts.push(basePrompt);

    // 5. Anti-drift: remind the model what NOT to do
    parts.push(`2D cartoon, flat colors, simple lines, NOT photorealistic, NOT 3D, NOT anime`);

    return parts.join('. ');
  }

  // ── Standard prompt path (non-flat shows, or non-faithful styles) ──
  const parts: string[] = [];

  // 1. Show visual style — the 1:1 faithful base
  if (!isFullTransform) {
    if (show?.visualStyle) {
      parts.push(show.visualStyle);
    } else if (showTitle) {
      const faithfulPrompt = getStylePrompt(showTitle, 'source-faithful' as ArtStyleId);
      if (faithfulPrompt) parts.push(faithfulPrompt);
    }
  }

  // 2. Art style layer
  if (artStyle && artStyle !== 'source-faithful') {
    const stylePrompt = getStylePrompt(showTitle || '', artStyle);
    if (stylePrompt) {
      if (isFullTransform) {
        parts.push(stylePrompt);
        if (showTitle) parts.push(`based on ${showTitle}`);
      } else {
        parts.push(`with ${stylePrompt} applied as visual effect`);
      }
    }
  }

  // 3. Inject character visual descriptions (with optional ref anchors)
  if (show?.characters && characters?.length) {
    const charDescs = characters
      .map(name => {
        const c = show.characters.find(ch =>
          ch.name.toLowerCase() === name.toLowerCase()
        );
        if (!c) return null;
        const ref = characterRefDescriptions?.[name];
        return ref
          ? `${c.name} (${c.visualDesc}, ${ref})`
          : `${c.name}: ${c.visualDesc}`;
      })
      .filter(Boolean)
      .join('. ');
    if (charDescs) parts.push(charDescs);
  }

  // 4. Scene description
  parts.push(basePrompt);

  // 5. Quality + faithfulness boosters
  if (!isFullTransform && showTitle) {
    const title = show?.title || showTitle;
    parts.push(`matching ${title} art direction exactly`);
  }
  if (!isFlatShow) {
    parts.push('professional quality');
  }

  return parts.join('. ');
}

export async function POST(req: NextRequest) {
  try {
    const {
      prompt,
      model = 'flux-schnell',
      sceneId,
      negative_prompt,
      width,
      height,
      // New fields for show-accurate generation
      showTitle,
      artStyle,
      characters,
      // Character reference descriptions from pre-generation step
      characterRefDescriptions,
      // Seed for visual consistency across scenes
      seed,
    } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    // ── Time budget — track elapsed to avoid Vercel 60s gateway timeout ──────
    const startTime = Date.now();
    const TIME_BUDGET_MS = 52_000; // bail at 52s, leaving 8s buffer for response
    const timeLeft = () => TIME_BUDGET_MS - (Date.now() - startTime);

    // ── Stagger concurrent scene requests to avoid Pollinations rate-limiting ──
    const sceneNum = parseInt(String(sceneId).replace(/\D/g, '') || '0', 10);
    if (sceneNum > 0) {
      const staggerMs = (sceneNum - 1) * 2000; // 0s, 2s, 4s, 6s, 8s (reduced from 3s)
      if (staggerMs > 0) {
        console.log(`[imagine] Staggering scene ${sceneNum} by ${staggerMs}ms to avoid rate-limiting`);
        await new Promise(r => setTimeout(r, staggerMs));
      }
    }

    // Build the enriched prompt with show style + character visuals
    const enhancedPrompt = enrichPrompt(
      prompt,
      showTitle,
      artStyle as ArtStyleId | undefined,
      characters,
      characterRefDescriptions,
    );

    // Use provided seed or generate a consistent one from show title
    const imageSeed = seed ?? (showTitle ? hashCode(showTitle) : undefined);

    const show = showTitle ? SHOW_PROFILES[showTitle] : undefined;
    const errors: string[] = [];

    // ── 1. Pollinations (FREE — no API key needed) ──────────────
    // Uses the public URL-based API from lib/pollinations.ts
    try {
      const imgWidth = width ? Math.min(Math.max(width, 64), 2048) : 1024;
      const imgHeight = height ? Math.min(Math.max(height, 64), 2048) : 1024;
      const isFaithful = !artStyle || artStyle === 'source-faithful';
      const isFlatShow = !!(showTitle && FLAT_STYLE_SHOWS[showTitle]);
      const polModel = pollinationsModel(show?.category, isFlatShow && isFaithful);

      // Disable Pollinations "enhance" for source-faithful and flat-style shows.
      // "Enhance" rewrites the prompt via AI — this ruins crude/simple styles
      // like South Park, Simpsons, etc. by adding smooth shading and realism.
      const shouldEnhance = !(isFaithful && isFlatShow);

      const params = new URLSearchParams({
        model: polModel,
        width: String(imgWidth),
        height: String(imgHeight),
        nologo: 'true',
        enhance: shouldEnhance ? 'true' : 'false',
      });

      // Seed for visual consistency across all scenes in the same episode
      if (imageSeed !== undefined) params.set('seed', String(imageSeed));

      // Auto-inject negative prompts for flat-style shows to prevent AI "realism"
      const autoNeg = isFaithful && isFlatShow ? FLAT_STYLE_SHOWS[showTitle!] : '';
      const finalNegative = [negative_prompt, autoNeg].filter(Boolean).join(', ');
      if (finalNegative) params.set('negative', finalNegative);

      const encodedPrompt = encodeURIComponent(enhancedPrompt);
      const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?${params}`;

      console.log(`[imagine] Trying Pollinations (model=${polModel}, seed=${imageSeed ?? 'none'}, $0 cost)...`);
      console.log(`[imagine] Enriched prompt: ${enhancedPrompt.slice(0, 300)}...`);

      const POL_HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'image/*, */*',
        'Referer': 'https://rip-web.vercel.app/',
      };

      // Reduced from 4 retries × 90s → 3 retries × 35s with time budget check
      const MAX_POL_RETRIES = 3;
      const POL_TIMEOUT_MS = 35_000;

      for (let attempt = 1; attempt <= MAX_POL_RETRIES; attempt++) {
        // Bail if we're running out of time
        if (timeLeft() < POL_TIMEOUT_MS + 3000) {
          console.warn(`[imagine] Time budget exhausted (${Math.round(timeLeft() / 1000)}s left), skipping Pollinations attempt ${attempt}`);
          errors.push(`Pollinations: time budget exhausted after ${attempt - 1} attempts`);
          break;
        }

        try {
          const polRes = await fetch(url, {
            headers: POL_HEADERS,
            signal: AbortSignal.timeout(POL_TIMEOUT_MS),
          });

          if (polRes.ok) {
            const ct = polRes.headers.get('content-type') || '';
            if (ct.includes('image')) {
              const buffer = await polRes.arrayBuffer();
              if (buffer.byteLength > 500) {
                const contentType = ct.split(';')[0].trim() || 'image/jpeg';
                const base64 = Buffer.from(buffer).toString('base64');
                console.log(`[imagine] ✓ Pollinations success (${polModel}, ${buffer.byteLength} bytes, attempt ${attempt}, seed=${imageSeed ?? 'none'})`);
                return NextResponse.json({
                  image: `data:${contentType};base64,${base64}`,
                  sceneId,
                  model: `pollinations-${polModel}`,
                  provider: 'pollinations',
                });
              }
              if (attempt === MAX_POL_RETRIES) errors.push('Pollinations: image too small / empty');
            } else {
              const text = await polRes.text();
              if (attempt === MAX_POL_RETRIES) errors.push(`Pollinations: unexpected content-type ${ct} — ${text.slice(0, 100)}`);
            }
          } else {
            const errText = await polRes.text().catch(() => '');
            console.warn(`[imagine] Pollinations attempt ${attempt} failed (HTTP ${polRes.status}): ${errText.slice(0, 200)}`);
            if (attempt === MAX_POL_RETRIES) errors.push(`Pollinations: HTTP ${polRes.status}`);
          }
        } catch (retryErr: unknown) {
          const msg = retryErr instanceof Error ? retryErr.message : String(retryErr);
          console.warn(`[imagine] Pollinations attempt ${attempt} error:`, msg);
          if (attempt === MAX_POL_RETRIES) errors.push(`Pollinations: ${msg}`);
        }
        // Shorter retry pauses (1.5s, 3s) to fit within time budget
        if (attempt < MAX_POL_RETRIES) await new Promise(r => setTimeout(r, 1500 * attempt));
      }
    } catch (polErr: unknown) {
      const msg = polErr instanceof Error ? polErr.message : String(polErr);
      console.warn('[imagine] Pollinations error:', msg);
      errors.push(`Pollinations: ${msg}`);
    }

    // ── 2. HuggingFace free image inference ($0 fallback) ────────
    if (process.env.HF_TOKEN && timeLeft() > 15_000) {
      try {
        console.log('[imagine] Trying HuggingFace FLUX.1-schnell (free inference)...');
        const hfRes = await fetch(
          'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.HF_TOKEN}`,
              'Content-Type': 'application/json',
              'Accept': 'image/*',
            },
            body: JSON.stringify({ inputs: enhancedPrompt }),
            signal: AbortSignal.timeout(90_000),
          }
        );
        if (hfRes.ok) {
          const ct = hfRes.headers.get('content-type') || '';
          if (ct.startsWith('image/')) {
            const buffer = await hfRes.arrayBuffer();
            if (buffer.byteLength > 10_000) {
              const base64 = Buffer.from(buffer).toString('base64');
              console.log(`[imagine] ✓ HuggingFace success (${buffer.byteLength} bytes)`);
              return NextResponse.json({
                image: `data:${ct};base64,${base64}`,
                sceneId,
                model: 'flux-schnell',
                provider: 'huggingface',
              });
            }
            errors.push('HuggingFace: image too small');
          } else {
            const text = await hfRes.text();
            errors.push(`HuggingFace: unexpected CT ${ct} — ${text.slice(0, 100)}`);
          }
        } else {
          const errText = await hfRes.text().catch(() => '');
          console.warn(`[imagine] HuggingFace failed (HTTP ${hfRes.status}): ${errText.slice(0, 200)}`);
          errors.push(`HuggingFace: HTTP ${hfRes.status}`);
        }
      } catch (hfErr: unknown) {
        const msg = hfErr instanceof Error ? hfErr.message : String(hfErr);
        console.warn('[imagine] HuggingFace image error:', msg);
        errors.push(`HuggingFace: ${msg}`);
      }
    }

    // ── 3. fal.ai (paid fallback) ───────────────────────────────
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

    // ── 3. HuggingFace Inference (free tier fallback) ───────────
    const HF_MODELS: Record<string, string> = {
      'flux-schnell':  'black-forest-labs/FLUX.1-schnell',
      'flux-dev':      'black-forest-labs/FLUX.1-dev',
      'sdxl':          'stabilityai/stable-diffusion-xl-base-1.0',
    };

    const apiKey = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY;
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
