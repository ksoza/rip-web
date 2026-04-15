// app/api/create/imagine/route.ts
// Scene image generation — show-faithful by default
//
// Fallback chain (lowest cost first):
//   1. Pollinations (FREE, no key needed) — auto-selects model per show category
//   2. fal.ai FLUX (paid fallback)
//   3. HuggingFace Inference (free tier, may be slow)
//
// Injects show-specific visual style + character descriptions from SHOW_PROFILES
// so generated images match the original show's look 1:1.
import { NextRequest, NextResponse } from 'next/server';
import { falGenerate, FAL_IMAGE_MODELS } from '@/lib/fal';
import { SHOW_PROFILES, getStylePrompt, type ArtStyleId } from '@/lib/shows';

export const maxDuration = 60;

// ── Pick the best Pollinations model for the show category ──────
function pollinationsModel(category?: string): string {
  switch (category) {
    case 'Anime':   return 'flux-anime';
    case 'Cartoon': return 'flux';          // default FLUX handles cartoon style prompts best
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
function enrichPrompt(
  basePrompt: string,
  showTitle?: string,
  artStyle?: ArtStyleId,
  characters?: string[],
): string {
  const parts: string[] = [];
  const show = showTitle ? SHOW_PROFILES[showTitle] : undefined;
  const isFullTransform = artStyle && FULL_TRANSFORM_STYLES.includes(artStyle);

  // 1. Show visual style — the 1:1 faithful base
  //    Always included UNLESS it's a full-transform style (claymation, 3D)
  if (!isFullTransform) {
    if (show?.visualStyle) {
      // Known show — use the detailed visual style from SHOW_PROFILES
      parts.push(show.visualStyle);
    } else if (showTitle) {
      // Show not in SHOW_PROFILES — generate a faithful prompt from the title.
      // getStylePrompt('source-faithful') returns a generic faithful description.
      const faithfulPrompt = getStylePrompt(showTitle, 'source-faithful' as ArtStyleId);
      if (faithfulPrompt) parts.push(faithfulPrompt);
    }
  }

  // 2. Art style layer
  if (artStyle && artStyle !== 'source-faithful') {
    const stylePrompt = getStylePrompt(showTitle || '', artStyle);
    if (stylePrompt) {
      if (isFullTransform) {
        // Full transform: style IS the base, but keep show title for context
        parts.push(stylePrompt);
        if (showTitle) parts.push(`based on ${showTitle}`);
      } else {
        // Layered: style applied ON TOP of the 1:1 base
        parts.push(`with ${stylePrompt} applied as visual effect`);
      }
    }
  }

  // 3. Inject character visual descriptions for named characters
  if (show?.characters && characters?.length) {
    const charDescs = characters
      .map(name => show.characters.find(c =>
        c.name.toLowerCase() === name.toLowerCase()
      ))
      .filter(Boolean)
      .map(c => `${c!.name}: ${c!.visualDesc}`)
      .join('. ');
    if (charDescs) parts.push(charDescs);
  }

  // 4. The scene-specific prompt from storyboard
  parts.push(basePrompt);

  // 5. Quality + faithfulness boosters
  if (!isFullTransform && showTitle) {
    const title = show?.title || showTitle;
    parts.push(`exact screenshot from the TV show ${title}, identical to original animation frames, perfectly matching ${title} art direction`);
  }
  parts.push('professional quality');

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
    } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    // Build the enriched prompt with show style + character visuals
    const enhancedPrompt = enrichPrompt(
      prompt,
      showTitle,
      artStyle as ArtStyleId | undefined,
      characters,
    );

    const show = showTitle ? SHOW_PROFILES[showTitle] : undefined;
    const errors: string[] = [];

    // ── 1. Pollinations (FREE — no API key needed) ──────────────
    // Uses the public URL-based API from lib/pollinations.ts
    try {
      const imgWidth = width ? Math.min(Math.max(width, 64), 2048) : 1024;
      const imgHeight = height ? Math.min(Math.max(height, 64), 2048) : 1024;
      const polModel = pollinationsModel(show?.category);

      // Disable Pollinations "enhance" for source-faithful and flat-style shows.
      // "Enhance" rewrites the prompt via AI — this ruins crude/simple styles
      // like South Park, Simpsons, etc. by adding smooth shading and realism.
      const isFaithful = !artStyle || artStyle === 'source-faithful';
      const isFlatShow = !!(showTitle && FLAT_STYLE_SHOWS[showTitle]);
      const shouldEnhance = !(isFaithful && isFlatShow);

      const params = new URLSearchParams({
        model: polModel,
        width: String(imgWidth),
        height: String(imgHeight),
        nologo: 'true',
        enhance: shouldEnhance ? 'true' : 'false',
      });

      // Auto-inject negative prompts for flat-style shows to prevent AI "realism"
      const autoNeg = isFaithful && isFlatShow ? FLAT_STYLE_SHOWS[showTitle!] : '';
      const finalNegative = [negative_prompt, autoNeg].filter(Boolean).join(', ');
      if (finalNegative) params.set('negative', finalNegative);

      const encodedPrompt = encodeURIComponent(enhancedPrompt);
      const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?${params}`;

      console.log(`[imagine] Trying Pollinations (model=${polModel}, $0 cost)...`);
      console.log(`[imagine] Enriched prompt: ${enhancedPrompt.slice(0, 200)}...`);

      // Pollinations requires a browser-like User-Agent header for server-side
      // requests — without it the API returns 403 Forbidden.
      const POL_HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'image/*, */*',
        'Referer': 'https://rip-web.vercel.app/',
      };

      const MAX_POL_RETRIES = 3;
      for (let attempt = 1; attempt <= MAX_POL_RETRIES; attempt++) {
        try {
          const polRes = await fetch(url, {
            headers: POL_HEADERS,
            signal: AbortSignal.timeout(45_000),
          });

          if (polRes.ok) {
            const ct = polRes.headers.get('content-type') || '';
            if (ct.includes('image')) {
              const buffer = await polRes.arrayBuffer();
              if (buffer.byteLength > 500) {
                const contentType = ct.split(';')[0].trim() || 'image/jpeg';
                const base64 = Buffer.from(buffer).toString('base64');
                console.log(`[imagine] ✓ Pollinations success (${polModel}, ${buffer.byteLength} bytes, attempt ${attempt})`);
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
        // Brief pause before retry
        if (attempt < MAX_POL_RETRIES) await new Promise(r => setTimeout(r, 1500));
      }
    } catch (polErr: unknown) {
      const msg = polErr instanceof Error ? polErr.message : String(polErr);
      console.warn('[imagine] Pollinations error:', msg);
      errors.push(`Pollinations: ${msg}`);
    }

    // ── 2. fal.ai (paid fallback) ───────────────────────────────
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
