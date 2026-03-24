// lib/ghostface/prompts.ts
// Prompt enhancement layer — transforms user prompts for optimal model performance

import type { RouteRequest } from './types';

// ── Style prompt fragments ─────────────────────────────────────
const STYLE_PROMPTS: Record<string, string> = {
  cinematic:
    'cinematic lighting, film grain, shallow depth of field, dramatic shadows, ' +
    'anamorphic lens, color graded, movie still quality',
  anime:
    'anime art style, cel-shaded, vibrant colors, clean linework, ' +
    'manga-inspired composition, detailed eyes, Studio Ghibli quality',
  'comic-book':
    'comic book art style, bold outlines, halftone dots, dynamic composition, ' +
    'vivid colors, speech bubble ready, Marvel/DC quality illustration',
  photorealistic:
    'photorealistic, 8K UHD, ultra-detailed, DSLR quality, ' +
    'natural lighting, shot on Canon EOS R5, RAW photo',
  watercolor:
    'watercolor painting style, soft washes, visible brush strokes, ' +
    'paper texture, delicate color bleeding, artistic composition',
  'film-noir':
    'film noir style, high contrast black and white, dramatic shadows, ' +
    'venetian blind lighting, 1940s aesthetic, moody atmosphere',
  '3d-render':
    '3D rendered, Pixar-quality, subsurface scattering, global illumination, ' +
    'octane render, clean geometry, studio lighting',
  'retro-vhs':
    'VHS aesthetic, retro 80s style, scan lines, chromatic aberration, ' +
    'grainy footage, neon colors, synthwave',
  'pixel-art':
    'pixel art style, 16-bit aesthetic, clean pixels, retro gaming, ' +
    'limited color palette, no anti-aliasing, NES/SNES era',
  'oil-painting':
    'oil painting style, visible brush strokes, rich textures, ' +
    'classical composition, gallery-worthy, Rembrandt lighting',
};

// ── Model-specific prompt formats ──────────────────────────────
const MODEL_FORMATS: Record<string, (prompt: string, style: string, neg: string) => string> = {
  // FLUX models prefer natural language descriptions
  'huggingface:flux-schnell': (prompt, style, _neg) =>
    `${prompt}. ${style}`.trim(),
  'huggingface:flux-dev': (prompt, style, _neg) =>
    `${prompt}. ${style}`.trim(),
  // SDXL works best with keyword-style prompts
  'huggingface:sdxl': (prompt, style, _neg) =>
    `${prompt}, ${style}, masterpiece, best quality, highly detailed`.replace(/\.\s/g, ', '),
  // Playground prefers descriptive but concise
  'huggingface:playground-v2.5': (prompt, style, _neg) =>
    `${prompt}. ${style}. Trending on ArtStation, award-winning`.trim(),
  // DALL-E 3 handles natural language well but has content policy
  'openai:dall-e-3': (prompt, style, _neg) =>
    `Create an image: ${prompt}. Style: ${style}`.trim(),
};

// ── Negative prompt defaults per model ─────────────────────────
const DEFAULT_NEGATIVES: Record<string, string> = {
  'huggingface:sdxl':
    'blurry, low quality, distorted, watermark, text, ugly, deformed, ' +
    'bad anatomy, bad proportions, extra limbs, disfigured, nsfw',
  'huggingface:playground-v2.5':
    'blurry, low quality, distorted, watermark, text, ugly, deformed',
  'huggingface:flux-dev': '',    // FLUX doesn't use negative prompts well
  'huggingface:flux-schnell': '', // Same
  'openai:dall-e-3': '',         // DALL-E ignores negative prompts
};

/**
 * Enhance a user's raw prompt for a specific model
 */
export function enhance(
  prompt: string,
  modelId: string,
  style?: string,
  negativePrompt?: string
): { prompt: string; negativePrompt: string } {
  // Get style fragment
  const styleFragment = style ? (STYLE_PROMPTS[style] || '') : '';

  // Apply model-specific formatting
  const formatter = MODEL_FORMATS[modelId];
  const enhanced = formatter
    ? formatter(prompt, styleFragment, negativePrompt || '')
    : `${prompt}. ${styleFragment}`.trim();

  // Build negative prompt
  const neg = negativePrompt || DEFAULT_NEGATIVES[modelId] || '';

  return { prompt: enhanced, negativePrompt: neg };
}

/**
 * Enhance a text generation prompt (for storyboard)
 */
export function enhanceTextPrompt(
  userPrompt: string,
  context: {
    character?: string;
    show?: string;
    style?: string;
    tone?: string;
  }
): string {
  const parts: string[] = [];

  if (context.character) {
    parts.push(`Character: ${context.character}`);
  }
  if (context.show) {
    parts.push(`Based on: ${context.show}`);
  }

  parts.push(`Scenario: ${userPrompt}`);

  if (context.style) {
    parts.push(`Visual style: ${STYLE_PROMPTS[context.style] || context.style}`);
  }
  if (context.tone) {
    parts.push(`Tone: ${context.tone}`);
  }

  return parts.join('\n');
}

/**
 * Get the style prompt fragment for a given style
 */
export function getStylePrompt(style: string): string {
  return STYLE_PROMPTS[style] || '';
}

/**
 * List all available styles
 */
export function listStyles(): Array<{ id: string; label: string; description: string }> {
  return Object.entries(STYLE_PROMPTS).map(([id, desc]) => ({
    id,
    label: id.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
    description: desc.split(',').slice(0, 3).join(','),
  }));
}
