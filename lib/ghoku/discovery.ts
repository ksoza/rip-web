// lib/ghoku/discovery.ts
// HuggingFace model scanner — finds new/trending models for the platform

import { registry } from './registry';
import type { ModelCapability, TaskCategory } from './types';

const HF_API = 'https://huggingface.co/api';

type HFModel = {
  id: string;           // e.g. "stabilityai/stable-diffusion-xl-base-1.0"
  modelId: string;
  likes: number;
  downloads: number;
  tags: string[];
  pipeline_tag?: string;
  lastModified: string;
  private: boolean;
};

// Pipeline tags → our categories
const PIPELINE_MAP: Record<string, TaskCategory> = {
  'text-to-image': 'image-gen',
  'image-to-image': 'image-gen',
  'text-to-video': 'video-gen',
  'text-to-audio': 'audio-gen',
  'text-to-speech': 'tts',
  'text-generation': 'text-gen',
};

// Models we already know about (skip during discovery)
const KNOWN_MODELS = new Set([
  'black-forest-labs/FLUX.1-schnell',
  'black-forest-labs/FLUX.1-dev',
  'stabilityai/stable-diffusion-xl-base-1.0',
  'playgroundai/playground-v2.5-1024px-aesthetic',
  'facebook/mms-tts-eng',
  'facebook/musicgen-small',
]);

/**
 * Scan HuggingFace for trending models in a category
 */
export async function discoverModels(
  category: TaskCategory,
  options: { limit?: number; minLikes?: number } = {}
): Promise<ModelCapability[]> {
  const { limit = 10, minLikes = 50 } = options;
  const hfKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;

  // Map category back to pipeline tags
  const pipelineTags = Object.entries(PIPELINE_MAP)
    .filter(([, cat]) => cat === category)
    .map(([tag]) => tag);

  if (pipelineTags.length === 0) return [];

  const discovered: ModelCapability[] = [];
  const headers: Record<string, string> = {};
  if (hfKey) headers['Authorization'] = `Bearer ${hfKey}`;

  for (const tag of pipelineTags) {
    try {
      const url = `${HF_API}/models?pipeline_tag=${tag}&sort=likes&direction=-1&limit=${limit}`;
      const res = await fetch(url, { headers });

      if (!res.ok) {
        console.warn(`[ghoku/discovery] HF API error for ${tag}: ${res.status}`);
        continue;
      }

      const models: HFModel[] = await res.json();

      for (const m of models) {
        // Skip private, known, and low-quality models
        if (m.private) continue;
        if (KNOWN_MODELS.has(m.id)) continue;
        if (m.likes < minLikes) continue;

        const capability: ModelCapability = {
          id: `huggingface:${m.id.split('/').pop() || m.id}`,
          provider: 'huggingface',
          name: m.id,
          category,
          envKey: 'HUGGINGFACE_API_KEY',
          available: !!hfKey,
          endpoint: m.id,
          strengths: inferStrengths(m),
          weaknesses: ['unverified', 'cold-start'],
          costTier: 'free',
          avgLatencyMs: 15000,
          successRate: 0.7,  // Unknown model — cautious score
          metadata: {
            likes: m.likes,
            downloads: m.downloads,
            tags: m.tags,
            discoveredAt: Date.now(),
          },
        };

        discovered.push(capability);
      }
    } catch (err) {
      console.warn(`[ghoku/discovery] Failed to scan ${tag}:`, err);
    }
  }

  console.log(
    `[ghoku/discovery] Found ${discovered.length} new ${category} models`
  );

  return discovered;
}

/**
 * Run a full discovery scan and update the registry
 */
export async function scan(categories?: TaskCategory[]): Promise<{
  discovered: number;
  registered: number;
}> {
  const cats = categories || ['image-gen', 'video-gen', 'tts', 'audio-gen'];
  let totalDiscovered = 0;
  let totalRegistered = 0;

  for (const cat of cats) {
    const models = await discoverModels(cat, { limit: 5, minLikes: 100 });
    totalDiscovered += models.length;

    for (const model of models) {
      // Only register if not already in registry
      if (!registry.get(model.id)) {
        registry.register(model);
        totalRegistered++;
        console.log(`[ghoku/discovery] Registered new model: ${model.id}`);
      }
    }
  }

  return { discovered: totalDiscovered, registered: totalRegistered };
}

/**
 * Test if a discovered model actually works via inference API
 */
export async function testModel(
  modelId: string,
  category: TaskCategory
): Promise<boolean> {
  const hfKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
  if (!hfKey) return false;

  const model = registry.get(modelId);
  if (!model?.endpoint) return false;

  try {
    const url = `https://api-inference.huggingface.co/models/${model.endpoint}`;

    // Use a minimal test payload
    let body: unknown;
    if (category === 'image-gen') {
      body = { inputs: 'a red circle on white background' };
    } else if (category === 'tts') {
      body = { inputs: 'hello' };
    } else if (category === 'text-gen') {
      body = { inputs: 'Hello', parameters: { max_new_tokens: 5 } };
    } else {
      body = { inputs: 'test' };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hfKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // 200 = works, 503 = loading (might work later)
    const works = res.status === 200 || res.status === 503;

    console.log(
      `[ghoku/discovery] Test ${model.endpoint}: ${res.status} → ${works ? 'OK' : 'FAIL'}`
    );

    return works;
  } catch {
    return false;
  }
}

// ── Helpers ────────────────────────────────────────────────────

function inferStrengths(model: HFModel): string[] {
  const strengths: string[] = [];
  const tags = model.tags.map(t => t.toLowerCase());

  if (model.likes > 1000) strengths.push('popular');
  if (model.likes > 5000) strengths.push('highly-rated');
  if (tags.includes('anime') || model.id.toLowerCase().includes('anime')) strengths.push('anime');
  if (tags.includes('realistic') || model.id.toLowerCase().includes('real')) strengths.push('photorealistic');
  if (tags.includes('fast')) strengths.push('fast');
  if (tags.includes('lora')) strengths.push('fine-tuned');

  return strengths.length > 0 ? strengths : ['general-purpose'];
}
