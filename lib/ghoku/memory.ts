// lib/ghoku/memory.ts
// Performance memory — learns what works over time
// Uses Supabase for persistence, in-memory cache for speed

import type { MemoryEntry, TaskCategory } from './types';
import { registry } from './registry';

// In-memory performance cache (survives within a serverless invocation)
const performanceCache: Map<string, {
  totalCalls: number;
  successCount: number;
  totalLatency: number;
  lastSuccess: number;
  lastFailure: number;
}> = new Map();

// Prompt result cache (avoid re-generating identical prompts)
const promptCache: Map<string, { url: string; modelId: string; timestamp: number }> = new Map();
const PROMPT_CACHE_TTL = 3600000; // 1 hour

/**
 * Hash a prompt for cache lookups
 */
function hashPrompt(prompt: string, style?: string): string {
  // Simple hash — good enough for cache key
  const input = `${prompt}|${style || ''}`.toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `p_${Math.abs(hash).toString(36)}`;
}

/**
 * Record a generation result (success or failure)
 */
export function record(entry: {
  modelId: string;
  category: TaskCategory;
  prompt: string;
  style?: string;
  success: boolean;
  latencyMs: number;
  error?: string;
  userId?: string;
  resultUrl?: string;
}): void {
  const { modelId, success, latencyMs, prompt, style, resultUrl } = entry;

  // Update in-memory cache
  const existing = performanceCache.get(modelId) || {
    totalCalls: 0,
    successCount: 0,
    totalLatency: 0,
    lastSuccess: 0,
    lastFailure: 0,
  };

  existing.totalCalls++;
  existing.totalLatency += latencyMs;
  if (success) {
    existing.successCount++;
    existing.lastSuccess = Date.now();
  } else {
    existing.lastFailure = Date.now();
  }

  performanceCache.set(modelId, existing);

  // Update registry with running averages
  const avgLatency = Math.round(existing.totalLatency / existing.totalCalls);
  const successRate = existing.successCount / existing.totalCalls;

  registry.updateStats(modelId, {
    avgLatencyMs: avgLatency,
    successRate,
    lastUsed: Date.now(),
    lastError: success ? undefined : entry.error,
  });

  // Cache successful results for prompt dedup
  if (success && resultUrl) {
    const key = hashPrompt(prompt, style);
    promptCache.set(key, { url: resultUrl, modelId, timestamp: Date.now() });
  }

  // Async: persist to Supabase if available (fire and forget)
  persistToSupabase(entry).catch(() => {
    // Supabase not configured or error — that's OK, in-memory still works
  });
}

/**
 * Check if we have a cached result for this exact prompt
 */
export function getCached(prompt: string, style?: string): { url: string; modelId: string } | null {
  const key = hashPrompt(prompt, style);
  const cached = promptCache.get(key);

  if (cached && Date.now() - cached.timestamp < PROMPT_CACHE_TTL) {
    console.log(`[ghoku/memory] Cache hit for prompt: ${prompt.slice(0, 50)}...`);
    return { url: cached.url, modelId: cached.modelId };
  }

  return null;
}

/**
 * Get performance stats for a model
 */
export function getStats(modelId: string): {
  totalCalls: number;
  successRate: number;
  avgLatency: number;
} | null {
  const cached = performanceCache.get(modelId);
  if (!cached) return null;

  return {
    totalCalls: cached.totalCalls,
    successRate: cached.totalCalls > 0 ? cached.successCount / cached.totalCalls : 1,
    avgLatency: cached.totalCalls > 0 ? Math.round(cached.totalLatency / cached.totalCalls) : 0,
  };
}

/**
 * Get all model stats sorted by success rate
 */
export function leaderboard(category?: TaskCategory): Array<{
  modelId: string;
  totalCalls: number;
  successRate: number;
  avgLatency: number;
}> {
  const entries: Array<{
    modelId: string;
    totalCalls: number;
    successRate: number;
    avgLatency: number;
  }> = [];

  for (const [modelId, stats] of performanceCache.entries()) {
    if (category) {
      const model = registry.get(modelId);
      if (model && model.category !== category) continue;
    }

    entries.push({
      modelId,
      totalCalls: stats.totalCalls,
      successRate: stats.totalCalls > 0 ? stats.successCount / stats.totalCalls : 1,
      avgLatency: stats.totalCalls > 0 ? Math.round(stats.totalLatency / stats.totalCalls) : 0,
    });
  }

  return entries.sort((a, b) => b.successRate - a.successRate);
}

/**
 * Clear performance cache (useful for testing)
 */
export function clearCache(): void {
  performanceCache.clear();
  promptCache.clear();
}

// ── Supabase persistence (optional) ────────────────────────────

async function persistToSupabase(entry: {
  modelId: string;
  category: TaskCategory;
  prompt: string;
  style?: string;
  success: boolean;
  latencyMs: number;
  error?: string;
  userId?: string;
}): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return;

  try {
    await fetch(`${supabaseUrl}/rest/v1/ghoku_memory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        model_id: entry.modelId,
        category: entry.category,
        prompt_hash: hashPrompt(entry.prompt, entry.style),
        style: entry.style,
        success: entry.success,
        latency_ms: entry.latencyMs,
        error: entry.error,
        user_id: entry.userId,
      }),
    });
  } catch {
    // Silent fail — Supabase table might not exist yet
  }
}

/**
 * Load historical stats from Supabase (called on init)
 */
export async function loadFromSupabase(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return;

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/ghoku_memory?select=model_id,success,latency_ms&order=created_at.desc&limit=500`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!res.ok) return;

    const rows: Array<{ model_id: string; success: boolean; latency_ms: number }> =
      await res.json();

    // Rebuild performance cache from history
    for (const row of rows) {
      const existing = performanceCache.get(row.model_id) || {
        totalCalls: 0,
        successCount: 0,
        totalLatency: 0,
        lastSuccess: 0,
        lastFailure: 0,
      };

      existing.totalCalls++;
      existing.totalLatency += row.latency_ms;
      if (row.success) existing.successCount++;

      performanceCache.set(row.model_id, existing);
    }

    console.log(`[ghoku/memory] Loaded ${rows.length} history entries from Supabase`);
  } catch {
    // Silent fail
  }
}
