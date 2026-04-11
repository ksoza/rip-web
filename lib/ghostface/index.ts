// lib/ghostface/index.ts
// ---------------------------------------------------
// -  GhOSTface - Background AI Agent                -
// -  Generative Heuristic Orchestration System - Transformative Face Engine -
// -                                                  -
// -  Not a page. Not a UI. An invisible brain that   -
// -  routes, enhances, and optimizes every AI call.  -
// ---------------------------------------------------

import { registry } from './registry';
import { route, autoSelect, rankModels } from './router';
import { enhance, enhanceTextPrompt, getStylePrompt, listStyles } from './prompts';
import { executeWithFallback } from './fallback';
import { record, getCached, getStats, leaderboard, loadFromSupabase } from './memory';
import { scan, discoverModels, testModel } from './discovery';
import type { TaskCategory, RouteRequest, RouteResult, ModelCapability } from './types';

// Re-export types
export type { TaskCategory, RouteRequest, RouteResult, ModelCapability };

// -- Initialization ----------------------------------------------
let initialized = false;

async function ensureInit(): Promise<void> {
  if (initialized) return;
  registry.init();
  await loadFromSupabase().catch(() => {});
  initialized = true;
}

// -- Main API ----------------------------------------------------

/**
 * Generate content - the main entry point
 *
 * GhOSTface picks the best model, enhances the prompt, handles retries/fallbacks,
 * and records the result for future optimization.
 *
 * @example
 *   const result = await ghostface.generate('image-gen', {
 *     prompt: 'Homer at a bar',
 *     style: 'anime',
 *     priority: 'quality',
 *   });
 */
async function generate(
  category: TaskCategory,
  params: {
    prompt: string;
    style?: string;
    priority?: 'speed' | 'quality' | 'cost';
    aspectRatio?: string;
    width?: number;
    height?: number;
    negativePrompt?: string;
    userId?: string;
    modelOverride?: string;   // Force a specific model
    executor: (model: ModelCapability, enhancedPrompt: string) => Promise<{
      data?: unknown;
      url?: string;
      error?: string;
    }>;
  }
): Promise<RouteResult> {
  await ensureInit();

  const { prompt, style, executor, modelOverride, userId } = params;

  // Check prompt cache first
  const cached = getCached(prompt, style);
  if (cached) {
    return {
      success: true,
      modelId: cached.modelId,
      provider: cached.modelId.split(':')[0],
      url: cached.url,
      latencyMs: 0,
      enhanced_prompt: prompt,
    };
  }

  // Build route request
  const request: RouteRequest = {
    category,
    prompt,
    style: params.style,
    priority: params.priority,
    aspectRatio: params.aspectRatio,
    width: params.width,
    height: params.height,
    negativePrompt: params.negativePrompt,
    userId,
  };

  // Execute with fallback chain
  const result = await executeWithFallback(
    request,
    async (model, _rawPrompt) => {
      // If user forced a specific model, check if it matches
      if (modelOverride) {
        const override = registry.get(modelOverride);
        if (override) {
          const enhanced = enhance(prompt, override.id, style, params.negativePrompt);
          return executor(override, enhanced.prompt);
        }
      }

      // Enhance prompt for the selected model
      const enhanced = enhance(prompt, model.id, style, params.negativePrompt);

      return executor(model, enhanced.prompt);
    }
  );

  // Record result for memory/learning
  record({
    modelId: result.modelId,
    category,
    prompt,
    style,
    success: result.success,
    latencyMs: result.latencyMs,
    error: result.error,
    userId,
    resultUrl: result.url,
  });

  return result;
}

/**
 * Simple model selection without execution
 * Returns the best model ID for a task
 */
function pickModel(
  category: TaskCategory,
  style?: string,
  priority?: 'speed' | 'quality' | 'cost'
): string | null {
  registry.init();
  return autoSelect(category, style, priority);
}

/**
 * Get ranked models for UI display
 */
function getRankedModels(
  category: TaskCategory,
  style?: string
): Array<{ model: ModelCapability; score: number }> {
  registry.init();
  return rankModels(category, style);
}

/**
 * Enhance a prompt for a specific model
 */
function enhancePrompt(
  prompt: string,
  modelId: string,
  style?: string,
  negativePrompt?: string
): { prompt: string; negativePrompt: string } {
  return enhance(prompt, modelId, style, negativePrompt);
}

/**
 * Run model discovery scan
 */
async function discover(categories?: TaskCategory[]): Promise<{
  discovered: number;
  registered: number;
}> {
  await ensureInit();
  return scan(categories);
}

/**
 * Get system status
 */
function status(): {
  models: { total: number; available: number; categories: string[] };
  memory: Array<{ modelId: string; totalCalls: number; successRate: number; avgLatency: number }>;
} {
  registry.init();
  return {
    models: registry.status(),
    memory: leaderboard(),
  };
}

// -- Export as a single object ----------------------------------

const ghostface = {
  // Core
  generate,
  pickModel,
  getRankedModels,
  enhancePrompt,

  // Discovery
  discover,
  discoverModels,
  testModel,

  // Memory
  getStats,
  leaderboard,
  getCached,

  // Styles
  getStylePrompt,
  listStyles,

  // Text prompts
  enhanceTextPrompt,

  // System
  status,
  registry,

  // Internal (for API routes)
  route,
  executeWithFallback,
  record,
};

export default ghostface;
