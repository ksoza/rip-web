// lib/ghostface/router.ts
// Smart model selection — picks the best model for each task

import { registry } from './registry';
import type { ModelCapability, RouteRequest, TaskCategory } from './types';

// Style → model affinity scores (higher = better match)
const STYLE_AFFINITY: Record<string, Record<string, number>> = {
  cinematic: {
    'huggingface:flux-dev': 9,
    'huggingface:flux-schnell': 7,
    'openai:dall-e-3': 8,
    'replicate:flux-1.1-pro': 9,
    'huggingface:sdxl': 5,
    'huggingface:playground-v2.5': 6,
  },
  anime: {
    'huggingface:sdxl': 9,
    'huggingface:playground-v2.5': 8,
    'huggingface:flux-dev': 6,
    'huggingface:flux-schnell': 5,
    'openai:dall-e-3': 4,
  },
  'comic-book': {
    'huggingface:sdxl': 8,
    'huggingface:playground-v2.5': 9,
    'huggingface:flux-dev': 6,
    'huggingface:flux-schnell': 5,
  },
  photorealistic: {
    'huggingface:flux-dev': 10,
    'replicate:flux-1.1-pro': 9,
    'openai:dall-e-3': 8,
    'huggingface:sdxl': 5,
    'huggingface:flux-schnell': 6,
  },
  watercolor: {
    'huggingface:playground-v2.5': 9,
    'huggingface:sdxl': 8,
    'huggingface:flux-dev': 7,
  },
  'film-noir': {
    'huggingface:flux-dev': 9,
    'huggingface:flux-schnell': 7,
    'openai:dall-e-3': 7,
    'huggingface:sdxl': 6,
  },
  '3d-render': {
    'huggingface:flux-dev': 8,
    'replicate:flux-1.1-pro': 8,
    'openai:dall-e-3': 7,
    'huggingface:sdxl': 6,
  },
  'retro-vhs': {
    'huggingface:sdxl': 8,
    'huggingface:playground-v2.5': 7,
    'huggingface:flux-schnell': 6,
  },
  'pixel-art': {
    'huggingface:sdxl': 9,
    'huggingface:playground-v2.5': 7,
    'huggingface:flux-schnell': 5,
  },
  'oil-painting': {
    'huggingface:playground-v2.5': 9,
    'huggingface:sdxl': 8,
    'huggingface:flux-dev': 7,
  },
};

// Priority weights
const PRIORITY_WEIGHTS = {
  speed: { latency: 3, quality: 1, cost: 1 },
  quality: { latency: 0.5, quality: 3, cost: 0.5 },
  cost: { latency: 1, quality: 1, cost: 3 },
};

/**
 * Score a model for a given request
 */
function scoreModel(model: ModelCapability, req: RouteRequest): number {
  let score = 50; // Base score

  // Skip excluded models
  if (req.excludeModels?.includes(model.id)) return -1;

  // Style affinity bonus
  if (req.style && STYLE_AFFINITY[req.style]) {
    const affinity = STYLE_AFFINITY[req.style][model.id];
    if (affinity) {
      score += affinity * 5;
    }
  }

  // Success rate (heavily weighted)
  score += model.successRate * 30;

  // Priority-based scoring
  const weights = PRIORITY_WEIGHTS[req.priority || 'quality'];

  // Latency score (lower = better, normalized to 0-10)
  const latencyScore = Math.max(0, 10 - model.avgLatencyMs / 10000);
  score += latencyScore * weights.latency;

  // Cost score (lower tier = better)
  const costScores: Record<string, number> = { free: 10, cheap: 7, moderate: 4, expensive: 1 };
  score += (costScores[model.costTier] || 5) * weights.cost;

  // Availability bonus (recently used models are warmed up)
  if (model.lastUsed && Date.now() - model.lastUsed < 300000) {
    score += 5; // Warm model bonus
  }

  // Penalty for recent errors
  if (model.lastError) {
    const timeSinceError = Date.now() - (model.lastUsed || 0);
    if (timeSinceError < 60000) score -= 20;     // Error in last minute
    else if (timeSinceError < 300000) score -= 10; // Error in last 5 min
  }

  return score;
}

/**
 * Pick the best model for a task
 */
export function route(req: RouteRequest): ModelCapability | null {
  const available = registry.getAvailable(req.category);

  if (available.length === 0) {
    console.warn(`[ghostface/router] No available models for category: ${req.category}`);
    return null;
  }

  // Score all available models
  const scored = available
    .map(model => ({ model, score: scoreModel(model, req) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;

  const best = scored[0];
  console.log(
    `[ghostface/router] ${req.category} → ${best.model.id} (score: ${best.score.toFixed(1)}) ` +
    `[${scored.map(s => `${s.model.id.split(':')[1]}:${s.score.toFixed(0)}`).join(', ')}]`
  );

  return best.model;
}

/**
 * Get ranked model list for a task (for UI display)
 */
export function rankModels(category: TaskCategory, style?: string): Array<{ model: ModelCapability; score: number }> {
  const req: RouteRequest = { category, prompt: '', style };
  const available = registry.getAvailable(category);

  return available
    .map(model => ({ model, score: scoreModel(model, req) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);
}

/**
 * Auto-select model — convenience wrapper
 */
export function autoSelect(category: TaskCategory, style?: string, priority?: 'speed' | 'quality' | 'cost'): string | null {
  const model = route({ category, prompt: '', style, priority });
  return model?.id || null;
}
