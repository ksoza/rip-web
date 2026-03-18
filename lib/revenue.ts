// lib/revenue.ts
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

export const PLAN_CONFIG = {
  starter: { price: 1,  gens: 30,       rip: 500,  apy: 420  },
  creator: { price: 5,  gens: 150,       rip: 3000, apy: 690  },
  studio:  { price: 10, gens: 999999999, rip: 7500, apy: 1000 },
} as const;

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
    founder_cut:      splits.founder,
    launch_fund_cut:  splits.launch_fund,
    ai_costs_cut:     splits.ai_costs,
    staking_cut:      splits.staking,
    ops_cut:          splits.operations,
    reserve_cut:      splits.reserve,
    tx_hash:          txHash ?? null,
    stripe_payment_id: stripePaymentId ?? null,
  });

  // Queue founder payout (batches weekly → sent as SOL every Monday)
  await supabase.from('founder_payout_queue').insert({
    destination_wallet: FOUNDER_WALLET,
    amount_usd:         splits.founder,
    chain:              'solana',
    source_user:        userId,
    source_plan:        plan,
    status:             'pending',
  });

  // Accumulate launch fund
  await supabase.from('launch_fund_ledger').insert({
    type:        'deposit',
    amount_usd:  splits.launch_fund,
    description: `${plan} subscription — ${paymentMethod}`,
  });

  return splits;
}

export async function grantSubscription({
  userId, plan, stripeSubId, periodEnd,
}: {
  userId:      string;
  plan:        'starter' | 'creator' | 'studio';
  stripeSubId: string;
  periodEnd:   Date;
}) {
  const supabase = createSupabaseAdmin();
  const cfg      = PLAN_CONFIG[plan];

  await supabase.from('profiles').update({
    tier:              plan,
    generations_limit: cfg.gens,
    generations_used:  0,
  }).eq('id', userId);

  await supabase.from('subscriptions').upsert({
    user_id:            userId,
    stripe_sub_id:      stripeSubId,
    plan,
    status:             'active',
    current_period_end: periodEnd.toISOString(),
  }, { onConflict: 'stripe_sub_id' });
}
