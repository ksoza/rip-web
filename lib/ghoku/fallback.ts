// lib/ghoku/fallback.ts
// Self-healing execution with automatic retries and fallbacks

import { registry } from './registry';
import { route } from './router';
import type { ModelCapability, RouteRequest, RouteResult } from './types';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 8000]; // Exponential backoff

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a task with automatic retries and model fallbacks
 *
 * @param request - The route request
 * @param executor - Function that actually calls the API
 * @returns RouteResult with success/failure info
 */
export async function executeWithFallback(
  request: RouteRequest,
  executor: (model: ModelCapability, enhancedPrompt: string) => Promise<{
    data?: unknown;
    url?: string;
    error?: string;
  }>
): Promise<RouteResult> {
  const excludeModels: string[] = [...(request.excludeModels || [])];
  const startTime = Date.now();
  let lastError = '';
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    // Pick best available model (excluding previously failed ones)
    const model = route({ ...request, excludeModels });

    if (!model) {
      return {
        success: false,
        modelId: 'none',
        provider: 'none',
        latencyMs: Date.now() - startTime,
        error: `No available models for ${request.category}. Tried: ${excludeModels.join(', ')}. Last error: ${lastError}`,
      };
    }

    const attemptStart = Date.now();

    try {
      console.log(
        `[ghoku/fallback] Attempt ${attempts + 1}/${MAX_RETRIES}: ` +
        `${model.id} for ${request.category}`
      );

      const result = await executor(model, request.prompt);

      if (result.error) {
        throw new Error(result.error);
      }

      // Success! Update model stats
      const latency = Date.now() - attemptStart;
      registry.updateStats(model.id, {
        lastUsed: Date.now(),
        avgLatencyMs: Math.round((model.avgLatencyMs + latency) / 2),
        successRate: Math.min(1, model.successRate + 0.01),
        lastError: undefined,
      });

      return {
        success: true,
        modelId: model.id,
        provider: model.provider,
        data: result.data,
        url: result.url,
        latencyMs: Date.now() - startTime,
        fallback: attempts > 0,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      lastError = error;
      attempts++;

      console.warn(
        `[ghoku/fallback] ${model.id} failed (attempt ${attempts}): ${error}`
      );

      // Update model failure stats
      registry.updateStats(model.id, {
        lastUsed: Date.now(),
        lastError: error,
        successRate: Math.max(0, model.successRate - 0.1),
      });

      // Determine if we should retry same model or fallback
      const isTransient = isTransientError(error);

      if (isTransient && attempts < MAX_RETRIES) {
        // Retry same model after delay (e.g. 503 model loading)
        const delay = RETRY_DELAYS[Math.min(attempts - 1, RETRY_DELAYS.length - 1)];
        console.log(`[ghoku/fallback] Transient error, retrying in ${delay}ms...`);
        await sleep(delay);
      } else {
        // Permanent failure — exclude this model and try next
        excludeModels.push(model.id);
        console.log(`[ghoku/fallback] Excluding ${model.id}, trying next model...`);
      }
    }
  }

  return {
    success: false,
    modelId: 'none',
    provider: 'none',
    latencyMs: Date.now() - startTime,
    error: `All ${attempts} attempts failed. Last error: ${lastError}`,
  };
}

/**
 * Determine if an error is transient (worth retrying same model)
 */
function isTransientError(error: string): boolean {
  const transientPatterns = [
    'model is currently loading',
    '503',
    '502',
    '429',                // Rate limited
    'rate limit',
    'timeout',
    'ECONNRESET',
    'ETIMEDOUT',
    'socket hang up',
    'network error',
    'fetch failed',
  ];

  const lower = error.toLowerCase();
  return transientPatterns.some(p => lower.includes(p.toLowerCase()));
}

/**
 * Quick health check — try a minimal request to see if a model responds
 */
export async function healthCheck(
  modelId: string,
  pingFn: () => Promise<boolean>
): Promise<boolean> {
  try {
    const ok = await Promise.race([
      pingFn(),
      sleep(10000).then(() => false),
    ]);
    registry.updateStats(modelId, {
      lastUsed: Date.now(),
      lastError: ok ? undefined : 'health check failed',
    });
    return !!ok;
  } catch {
    registry.updateStats(modelId, {
      lastError: 'health check exception',
    });
    return false;
  }
}
