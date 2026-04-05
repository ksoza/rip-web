// lib/revenue.ts
// Flat subscription pricing — unlimited generations per tier
import { createSupabaseAdmin } from './supabase';

export const FOUNDER_WALLET = 'DbnD8vxbNVrG9iL7oi83Zg8RGqxFLATGcW67oq2xD5Nj';

export const SPLIT = {
  founder:     0.13,
  launch_fund: 0.50,
  ai_costs:    0.15,
  staking:     0.10,
  operations:  0.07,
  reserve:     0.05,
} as const;

// ── Stripe Price IDs (LIVE) ─────────────────────────────────────
export const STRIPE_PRICES = {
  starter: 'price_1TIlPzDKSKlEg2Cq9w9Y8Jyz',  // $9.99/mo
  creator: 'price_1TIlQ7DKSKlEg2CqtBSVfZqx',  // $24.99/mo
  studio:  'price_1TIlQDDKSKlEg2CqNcIHQMS0',   // $49.99/mo
} as const;

// ── Plan Configuration (flat pricing, unlimited generations) ────
export const PLAN_CONFIG = {
  free: {
    price: 0,
    label: 'Free',
    models: 'basic',       // flux-schnell, sdxl only
    generations: 10,       // 10 free generations per day
    rip: 0,
    apy: 0,
  },
  starter: {
    price: 9.99,
    label: 'Starter',
    models: 'standard',    // + flux-dev, ideogram, ltx-video, wan
    generations: -1,       // unlimited (-1)
    rip: 500,
    apy: 420,
    stripePriceId: STRIPE_PRICES.starter,
  },
  creator: {
    price: 24.99,
    label: 'Creator',
    models: 'all',         // + recraft, flux-pro, seedream, seedance, kling, hailuo
    generations: -1,       // unlimited
    rip: 3000,
    apy: 690,
    stripePriceId: STRIPE_PRICES.creator,
  },
  studio: {
    price: 49.99,
    label: 'Studio',
    models: 'all+priority', // all models + priority queue + commercial license
    generations: -1,         // unlimited
    rip: 7500,
    apy: 1000,
    stripePriceId: STRIPE_PRICES.studio,
    commercial: true,
  },
} as const;

export type PlanTier = keyof typeof PLAN_CONFIG;

// ── Tier Access Check ───────────────────────────────────────────

const TIER_ORDER = ['free', 'starter', 'creator', 'studio'] as const;

export function canAccessTier(userTier: string, requiredTier: string): boolean {
  const userIdx = TIER_ORDER.indexOf(userTier as any);
  const reqIdx = TIER_ORDER.indexOf(requiredTier as any);
  return userIdx >= reqIdx;
}

export function getPlanConfig(tier: string) {
  return PLAN_CONFIG[tier as PlanTier] || PLAN_CONFIG.free;
}

export function getStripePriceId(tier: string): string | null {
  const config = PLAN_CONFIG[tier as PlanTier];
  return (config && 'stripePriceId' in config) ? config.stripePriceId : null;
}

export function getTierFromPriceId(priceId: string): PlanTier {
  for (const [tier, config] of Object.entries(PLAN_CONFIG)) {
    if ('stripePriceId' in config && config.stripePriceId === priceId) {
      return tier as PlanTier;
    }
  }
  return 'free';
}

// ── Revenue Tracking ────────────────────────────────────────────

export function calcSplits(grossUsd: number) {
  return {
    founder:     +(grossUsd * SPLIT.founder).toFixed(4),
    launch_fund: +(grossUsd * SPLIT.launch_fund).toFixed(4),
    ai_costs:    +(grossUsd * SPLIT.ai_costs).toFixed(4),
    staking:     +(grossUsd * SPLIT.staking).toFixed(4),
    operations:  +(grossUsd * SPLIT.operations).toFixed(4),
    reserve:     +(grossUsd * SPLIT.reserve).toFixed(4),
  };
}

export async function recordRevenue({
  userId, plan, paymentMethod, grossAmount, txHash, stripePaymentId,
}: {
  userId:        string;
  plan:          string;
  paymentMethod: string;
  grossAmount:   number;
  txHash?:       string;
  stripePaymentId?: string;
}) {
  const supabase = createSupabaseAdmin();
  const splits   = calcSplits(grossAmount);

  // Log the full event
  await supabase.from('revenue_events').insert({
    user_id:          userId,
    plan,
    payment_method:   paymentMethod,
    gross_amount:     grossAmount,
    founder_amount:   splits.founder,
    launch_fund:      splits.launch_fund,
    ai_costs:         splits.ai_costs,
    staking_pool:     splits.staking,
    operations:       splits.operations,
    reserve:          splits.reserve,
    tx_hash:          txHash       || null,
    stripe_payment_id: stripePaymentId || null,
  });

  // Update user tier
  await supabase.from('profiles').update({ tier: plan }).eq('id', userId);
}
