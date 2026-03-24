// lib/ghoku/registry.ts
// Dynamic tool/model registry — knows what's available and what's configured

import { AI_PROVIDERS } from '../ai-providers';
import type { ModelCapability, TaskCategory } from './types';

// Map ai-providers categories to ghoku categories
const CATEGORY_MAP: Record<string, TaskCategory> = {
  text: 'text-gen',
  image: 'image-gen',
  video: 'video-gen',
  audio: 'audio-gen',
  voice: 'tts',
  music: 'music',
  sprite: 'sprite',
  faceswap: 'faceswap',
  lipsync: 'lipsync',
  motion: 'motion',
  sfx: 'audio-gen',
};

// Extended model definitions with strengths/weaknesses for smart routing
const MODEL_PROFILES: Record<string, Partial<ModelCapability>> = {
  // ── Text ─────────────────────────────
  'anthropic:claude-sonnet': {
    strengths: ['storytelling', 'dialogue', 'creative-writing', 'detailed-scenes'],
    weaknesses: [],
    costTier: 'moderate',
    avgLatencyMs: 3000,
  },
  'anthropic:claude-haiku': {
    strengths: ['fast', 'concise', 'classification'],
    weaknesses: ['less-creative'],
    costTier: 'cheap',
    avgLatencyMs: 1000,
  },
  // ── Image ────────────────────────────
  'huggingface:flux-schnell': {
    endpoint: 'black-forest-labs/FLUX.1-schnell',
    strengths: ['fast', 'natural-language-prompts', 'general-purpose'],
    weaknesses: ['less-detail-than-dev'],
    costTier: 'free',
    avgLatencyMs: 8000,
  },
  'huggingface:flux-dev': {
    endpoint: 'black-forest-labs/FLUX.1-dev',
    strengths: ['high-quality', 'photorealistic', 'natural-language-prompts'],
    weaknesses: ['slower', 'cold-start'],
    costTier: 'free',
    avgLatencyMs: 20000,
  },
  'huggingface:sdxl': {
    endpoint: 'stabilityai/stable-diffusion-xl-base-1.0',
    strengths: ['anime', 'illustration', 'keyword-prompts', 'reliable'],
    weaknesses: ['worse-at-text', 'needs-keyword-style'],
    costTier: 'free',
    avgLatencyMs: 15000,
  },
  'huggingface:playground-v2.5': {
    endpoint: 'playgroundai/playground-v2.5-1024px-aesthetic',
    strengths: ['aesthetic', 'artistic', 'vibrant-colors'],
    weaknesses: ['less-photorealistic'],
    costTier: 'free',
    avgLatencyMs: 18000,
  },
  'openai:dall-e-3': {
    strengths: ['text-rendering', 'complex-compositions', 'photorealistic'],
    weaknesses: ['expensive', 'slower', 'content-policy-strict'],
    costTier: 'expensive',
    avgLatencyMs: 12000,
  },
  'replicate:flux-1.1-pro': {
    strengths: ['high-quality', 'fast', 'professional'],
    weaknesses: ['paid-only'],
    costTier: 'moderate',
    avgLatencyMs: 10000,
  },
  // ── Video ────────────────────────────
  'luma:dream-machine': {
    strengths: ['fast-video', 'image-to-video', 'natural-motion'],
    weaknesses: ['short-clips-only'],
    costTier: 'moderate',
    avgLatencyMs: 60000,
  },
  'runway:gen3-alpha': {
    strengths: ['high-quality-video', 'cinematic', 'text-to-video'],
    weaknesses: ['expensive', 'slow'],
    costTier: 'expensive',
    avgLatencyMs: 120000,
  },
  'kling:v1': {
    strengths: ['long-form-video', 'consistent-motion'],
    weaknesses: ['regional-restrictions'],
    costTier: 'moderate',
    avgLatencyMs: 90000,
  },
  // ── TTS ──────────────────────────────
  'huggingface:mms-tts-eng': {
    endpoint: 'facebook/mms-tts-eng',
    strengths: ['fast', 'free', 'clear-english'],
    weaknesses: ['robotic', 'single-voice'],
    costTier: 'free',
    avgLatencyMs: 3000,
  },
  // ── Music ────────────────────────────
  'huggingface:musicgen-small': {
    endpoint: 'facebook/musicgen-small',
    strengths: ['background-music', 'mood-based'],
    weaknesses: ['short-clips', 'cold-start'],
    costTier: 'free',
    avgLatencyMs: 25000,
  },
};

class Registry {
  private models: Map<string, ModelCapability> = new Map();
  private initialized = false;

  /**
   * Initialize registry by scanning AI_PROVIDERS and env vars
   */
  init(): void {
    if (this.initialized) return;

    // Register models from AI_PROVIDERS
    for (const provider of AI_PROVIDERS) {
      const category = CATEGORY_MAP[provider.category] || 'text-gen';
      const hasKey = !!process.env[provider.envKey];

      // Register each model variant
      const models = provider.models || [provider.id];
      for (const model of models) {
        const profileKey = `${provider.id}:${model.split('/').pop()?.split('-')[0] || model}`;
        const profile = MODEL_PROFILES[profileKey] || {};

        const capability: ModelCapability = {
          id: `${provider.id}:${model}`,
          provider: provider.id,
          name: `${provider.name} - ${model}`,
          category,
          envKey: provider.envKey,
          available: hasKey,
          endpoint: profile.endpoint || provider.baseUrl,
          strengths: profile.strengths || [],
          weaknesses: profile.weaknesses || [],
          costTier: profile.costTier || 'moderate',
          avgLatencyMs: profile.avgLatencyMs || 10000,
          successRate: 1.0,
        };

        this.models.set(capability.id, capability);
      }
    }

    // Register HuggingFace models that aren't in AI_PROVIDERS
    const hfKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
    const hfModels = Object.entries(MODEL_PROFILES).filter(([k]) => k.startsWith('huggingface:'));

    for (const [key, profile] of hfModels) {
      if (!this.models.has(key)) {
        const name = key.split(':')[1];
        this.models.set(key, {
          id: key,
          provider: 'huggingface',
          name: `HuggingFace - ${name}`,
          category: profile.endpoint?.includes('tts') ? 'tts'
            : profile.endpoint?.includes('music') ? 'music'
            : 'image-gen',
          envKey: 'HUGGINGFACE_API_KEY',
          available: !!hfKey,
          endpoint: profile.endpoint,
          strengths: profile.strengths || [],
          weaknesses: profile.weaknesses || [],
          costTier: profile.costTier || 'free',
          avgLatencyMs: profile.avgLatencyMs || 10000,
          successRate: 1.0,
        });
      }
    }

    this.initialized = true;
  }

  /**
   * Get all models for a category
   */
  getByCategory(category: TaskCategory): ModelCapability[] {
    this.init();
    return Array.from(this.models.values()).filter(m => m.category === category);
  }

  /**
   * Get only available (has API key) models for a category
   */
  getAvailable(category: TaskCategory): ModelCapability[] {
    return this.getByCategory(category).filter(m => m.available);
  }

  /**
   * Get a specific model by ID
   */
  get(modelId: string): ModelCapability | undefined {
    this.init();
    return this.models.get(modelId);
  }

  /**
   * Update model stats (called by memory system)
   */
  updateStats(modelId: string, updates: Partial<ModelCapability>): void {
    this.init();
    const model = this.models.get(modelId);
    if (model) {
      Object.assign(model, updates);
    }
  }

  /**
   * Register a new model dynamically (used by discovery)
   */
  register(model: ModelCapability): void {
    this.init();
    this.models.set(model.id, model);
  }

  /**
   * Get full registry snapshot
   */
  snapshot(): Record<string, ModelCapability[]> {
    this.init();
    const grouped: Record<string, ModelCapability[]> = {};
    for (const model of this.models.values()) {
      if (!grouped[model.category]) grouped[model.category] = [];
      grouped[model.category].push(model);
    }
    return grouped;
  }

  /**
   * Get count of available vs total models
   */
  status(): { total: number; available: number; categories: string[] } {
    this.init();
    const all = Array.from(this.models.values());
    return {
      total: all.length,
      available: all.filter(m => m.available).length,
      categories: [...new Set(all.map(m => m.category))],
    };
  }
}

// Singleton
export const registry = new Registry();
