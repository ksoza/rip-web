// lib/fal.ts
// fal.ai — Unified AI media generation gateway (600+ models)
// Handles image & video generation through a single API
// Cost: 30-50% cheaper than direct providers

// ── Model Catalog ─────────────────────────────────────────────

export interface FalModel {
  id: string;             // fal.ai model identifier
  name: string;           // Human-readable name
  type: 'image' | 'video';
  description: string;
  tier: 'free' | 'starter' | 'creator' | 'studio'; // Minimum tier required
  tags: string[];
}

export const FAL_IMAGE_MODELS: Record<string, FalModel> = {
  'flux-schnell': {
    id: 'fal-ai/flux/schnell',
    name: 'Flux Schnell',
    type: 'image',
    description: 'Fast, budget-friendly image generation',
    tier: 'free',
    tags: ['fast', 'budget'],
  },
  'sdxl': {
    id: 'fal-ai/fast-sdxl',
    name: 'Stable Diffusion XL',
    type: 'image',
    description: 'Classic SDXL — great for artistic styles',
    tier: 'free',
    tags: ['classic', 'artistic'],
  },
  'flux-dev': {
    id: 'fal-ai/flux/dev',
    name: 'Flux 2 Dev',
    type: 'image',
    description: 'High-quality balanced image generation',
    tier: 'starter',
    tags: ['quality', 'balanced'],
  },
  'ideogram': {
    id: 'fal-ai/ideogram/v3',
    name: 'Ideogram 3.0',
    type: 'image',
    description: 'Best for images with text rendering',
    tier: 'starter',
    tags: ['text', 'logos'],
  },
  'recraft': {
    id: 'fal-ai/recraft-v3',
    name: 'Recraft V3',
    type: 'image',
    description: 'Professional design — logos, icons, illustrations',
    tier: 'creator',
    tags: ['design', 'professional'],
  },
  'flux-pro': {
    id: 'fal-ai/flux-pro/v1.1',
    name: 'Flux 2 Pro',
    type: 'image',
    description: 'Best photorealism and detail',
    tier: 'creator',
    tags: ['photorealism', 'premium'],
  },
  'seedream': {
    id: 'fal-ai/seedream-3',
    name: 'Seedream 3.0',
    type: 'image',
    description: 'ByteDance Seedream — stylized imagery',
    tier: 'creator',
    tags: ['stylized', 'bytedance'],
  },
};

export const FAL_VIDEO_MODELS: Record<string, FalModel> = {
  'ltx-video': {
    id: 'fal-ai/ltx-video/v0.9.1',
    name: 'LTX Video 2.0',
    type: 'video',
    description: 'Fast open-source video — cheapest option',
    tier: 'starter',
    tags: ['fast', 'budget', 'open-source'],
  },
  'wan': {
    id: 'fal-ai/wan/v2.1/1.3b',
    name: 'Wan 2.6',
    type: 'video',
    description: 'Affordable quality video generation',
    tier: 'starter',
    tags: ['balanced', 'affordable'],
  },
  'seedance': {
    id: 'fal-ai/seedance/video',
    name: 'Seedance 1.5 Pro',
    type: 'video',
    description: 'ByteDance Seedance — superior motion control',
    tier: 'creator',
    tags: ['motion', 'bytedance', 'popular'],
  },
  'kling': {
    id: 'fal-ai/kling-video/v2/master',
    name: 'Kling 2.6 Pro',
    type: 'video',
    description: 'Professional quality video with great detail',
    tier: 'creator',
    tags: ['professional', 'detail'],
  },
  'hailuo': {
    id: 'fal-ai/minimax-video/video-01',
    name: 'Hailuo 2.3',
    type: 'video',
    description: 'Minimax video — realistic motion',
    tier: 'creator',
    tags: ['realistic', 'motion'],
  },
  'seedance-2': {
    id: 'fal-ai/seedance-2/video',
    name: 'Seedance 2',
    type: 'video',
    description: 'ByteDance latest — cinematic with native audio',
    tier: 'creator',
    tags: ['cinematic', 'audio', 'bytedance', 'latest'],
  },
  'kling-3': {
    id: 'fal-ai/kling-video/v3/master',
    name: 'Kling 3.0 Pro',
    type: 'video',
    description: 'Top-tier cinematic video generation',
    tier: 'creator',
    tags: ['cinematic', 'professional', 'latest'],
  },
  'veo': {
    id: 'fal-ai/veo3',
    name: 'Veo 3.1',
    type: 'video',
    description: 'Google Veo — best audio-video sync',
    tier: 'studio',
    tags: ['premium', 'audio', 'google'],
  },
};

// All models combined
export const FAL_MODELS: Record<string, FalModel> = {
  ...FAL_IMAGE_MODELS,
  ...FAL_VIDEO_MODELS,
};

// ── fal.ai API Helpers ────────────────────────────────────────

const FAL_API_URL = 'https://queue.fal.run';

function getFalKey(): string {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error('FAL_KEY not configured. Get one at fal.ai/dashboard/keys');
  return key;
}

interface FalImageInput {
  prompt: string;
  image_size?: string | { width: number; height: number };
  num_images?: number;
  seed?: number;
  style?: string;
  negative_prompt?: string;
  [key: string]: any;
}

interface FalVideoInput {
  prompt: string;
  image_url?: string;
  duration?: number | string;
  aspect_ratio?: string;
  seed?: number;
  [key: string]: any;
}

export interface FalResult {
  images?: { url: string; content_type?: string }[];
  video?: { url: string };
  /** Audio output from audio-capable models (Veo 3.1, Seedance 2) */
  audio?: { url: string };
  request_id?: string;
}

// Server-side direct API call (for API routes)
export async function falGenerate(
  modelId: string,
  input: FalImageInput | FalVideoInput,
): Promise<FalResult> {
  const key = getFalKey();

  // Submit to queue
  const submitRes = await fetch(`${FAL_API_URL}/${modelId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!submitRes.ok) {
    const err = await submitRes.text();
    throw new Error(`fal.ai submit error (${submitRes.status}): ${err}`);
  }

  const submitData = await submitRes.json();

  // If result is already available (sync response)
  if (submitData.images || submitData.video) {
    return normalizeResult(submitData);
  }

  // Poll for result (async/queue response)
  const requestId = submitData.request_id;
  if (!requestId) {
    throw new Error('fal.ai: No request_id in response');
  }

  const statusUrl = `https://queue.fal.run/${modelId}/requests/${requestId}/status`;
  const resultUrl = `https://queue.fal.run/${modelId}/requests/${requestId}`;

  const deadline = Date.now() + 300_000; // 5 min timeout
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 3000));

    const statusRes = await fetch(statusUrl, {
      headers: { 'Authorization': `Key ${key}` },
    });
    const status = await statusRes.json();

    if (status.status === 'COMPLETED') {
      const resultRes = await fetch(resultUrl, {
        headers: { 'Authorization': `Key ${key}` },
      });
      if (!resultRes.ok) {
        throw new Error(`fal.ai result fetch error: ${await resultRes.text()}`);
      }
      const raw = await resultRes.json();
      return normalizeResult(raw);
    }

    if (status.status === 'FAILED') {
      throw new Error(`fal.ai generation failed: ${status.error || 'Unknown error'}`);
    }
  }

  throw new Error('fal.ai generation timed out (5 min)');
}

/**
 * Normalize fal.ai response to extract all media outputs.
 * Audio-capable models (Veo 3.1, Seedance 2) may return audio in different fields.
 */
function normalizeResult(raw: any): FalResult {
  const result: FalResult = {
    request_id: raw.request_id,
  };

  // Images
  if (raw.images) {
    result.images = raw.images;
  }

  // Video — check multiple possible response shapes
  if (raw.video?.url) {
    result.video = raw.video;
  } else if (raw.video_url) {
    result.video = { url: raw.video_url };
  } else if (raw.output?.video?.url) {
    result.video = raw.output.video;
  }

  // Audio — audio-capable models may return this alongside video
  if (raw.audio?.url) {
    result.audio = raw.audio;
  } else if (raw.audio_url) {
    result.audio = { url: raw.audio_url };
  } else if (raw.output?.audio?.url) {
    result.audio = raw.output.audio;
  }

  return result;
}

// ── Helpers ─────────────────────────────────────────────────────

export function getModelByKey(key: string): FalModel | null {
  return FAL_MODELS[key] || null;
}

export function getAvailableModels(
  type?: 'image' | 'video',
  userTier: string = 'free',
): FalModel[] {
  const tierOrder = ['free', 'starter', 'creator', 'studio'];
  const userTierIdx = tierOrder.indexOf(userTier);

  return Object.values(FAL_MODELS)
    .filter(m => (!type || m.type === type))
    .filter(m => tierOrder.indexOf(m.tier) <= userTierIdx)
    .sort((a, b) => {
      const tierDiff = tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier);
      return tierDiff !== 0 ? tierDiff : a.name.localeCompare(b.name);
    });
}

/** Check if a model supports native audio generation */
export function modelHasAudio(modelKey: string): boolean {
  const model = FAL_VIDEO_MODELS[modelKey];
  return model?.tags.includes('audio') ?? false;
}

export function mapSizeToFal(size?: string): string | { width: number; height: number } {
  switch (size) {
    case '1792x1024': return { width: 1792, height: 1024 };
    case '1024x1792': return { width: 1024, height: 1792 };
    case '512x512':   return { width: 512, height: 512 };
    default:          return { width: 1024, height: 1024 };
  }
}
