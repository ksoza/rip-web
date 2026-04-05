// lib/credits.ts
// Subscription tier access management
// Flat pricing model — unlimited generations for paid tiers
// Free tier gets limited daily generations

import { createSupabaseAdmin } from './supabase';
import { PLAN_CONFIG, canAccessTier, type PlanTier } from './revenue';

// ── Daily Generation Tracking (free tier only) ──────────────────

const FREE_DAILY_LIMIT = 10;

export async function checkGenerationAccess(
  userId: string,
): Promise<{ allowed: boolean; tier: string; remaining?: number; error?: string }> {
  const supabase = createSupabaseAdmin();

  const { data: profile } = await supabase
    .from('profiles')
    .select('tier, generations_used, generations_limit')
    .eq('id', userId)
    .single();

  if (!profile) {
    return { allowed: false, tier: 'free', error: 'User not found' };
  }

  const tier = profile.tier || 'free';
  const config = PLAN_CONFIG[tier as PlanTier] || PLAN_CONFIG.free;

  // Paid tiers: unlimited generations
  if (config.generations === -1) {
    return { allowed: true, tier };
  }

  // Free tier: check daily limit
  const used = profile.generations_used ?? 0;
  const limit = profile.generations_limit ?? FREE_DAILY_LIMIT;
  const remaining = Math.max(0, limit - used);

  if (remaining <= 0) {
    return {
      allowed: false,
      tier,
      remaining: 0,
      error: `Daily limit reached (${limit} free generations). Upgrade for unlimited access.`,
    };
  }

  return { allowed: true, tier, remaining };
}

export async function recordGeneration(userId: string): Promise<void> {
  const supabase = createSupabaseAdmin();

  // Increment generations_used counter
  const { data: profile } = await supabase
    .from('profiles')
    .select('generations_used')
    .eq('id', userId)
    .single();

  const current = profile?.generations_used ?? 0;
  await supabase
    .from('profiles')
    .update({ generations_used: current + 1 })
    .eq('id', userId);
}

export async function getSubscriptionStatus(userId: string): Promise<{
  tier: string;
  label: string;
  price: number;
  unlimited: boolean;
  generationsUsed?: number;
  generationsLimit?: number;
}> {
  const supabase = createSupabaseAdmin();

  const { data: profile } = await supabase
    .from('profiles')
    .select('tier, generations_used, generations_limit')
    .eq('id', userId)
    .single();

  const tier = profile?.tier || 'free';
  const config = PLAN_CONFIG[tier as PlanTier] || PLAN_CONFIG.free;

  return {
    tier,
    label: config.label,
    price: config.price,
    unlimited: config.generations === -1,
    generationsUsed: profile?.generations_used ?? 0,
    generationsLimit: config.generations === -1 ? undefined : (profile?.generations_limit ?? FREE_DAILY_LIMIT),
  };
}

// Re-export for backward compatibility
export { canAccessTier } from './revenue';
