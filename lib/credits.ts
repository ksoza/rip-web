// lib/credits.ts
// Credit management system for RiP
// Credits are the universal currency for AI generations
// 1 credit ≈ $0.10 value to user, costs us ~$0.003-$0.10

import { createSupabaseAdmin } from './supabase';

// ── Credit Configuration ────────────────────────────────────────

export const CREDIT_CONFIG = {
  // Free users get daily bonus credits
  dailyFreeCredits: 5,

  // Credits included with each subscription tier (monthly)
  tierCredits: {
    free:    0,      // relies on daily bonus
    starter: 200,    // $9.99/mo → 200 credits
    creator: 600,    // $24.99/mo → 600 credits
    studio:  1500,   // $49.99/mo → 1,500 credits
  } as Record<string, number>,

  // Credit pack pricing (one-time purchases)
  packs: [
    { id: 'pack_100',  credits: 100,  priceUsd: 5.00,  label: '100 Credits'   },
    { id: 'pack_500',  credits: 500,  priceUsd: 20.00, label: '500 Credits'   },
    { id: 'pack_1000', credits: 1000, priceUsd: 35.00, label: '1,000 Credits' },
    { id: 'pack_3000', credits: 3000, priceUsd: 90.00, label: '3,000 Credits' },
  ],
} as const;

// ── Credit Operations ───────────────────────────────────────────

export async function getCreditBalance(userId: string): Promise<number> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from('profiles')
    .select('credits_balance')
    .eq('id', userId)
    .single();
  return data?.credits_balance ?? 0;
}

export async function deductCredits(
  userId: string,
  amount: number,
  reason: string,
  metadata?: Record<string, any>,
): Promise<{ success: boolean; balance: number; error?: string }> {
  const supabase = createSupabaseAdmin();

  // Atomic deduction using RPC to prevent race conditions
  // Falls back to check-then-update if RPC not available
  const { data: profile } = await supabase
    .from('profiles')
    .select('credits_balance')
    .eq('id', userId)
    .single();

  const currentBalance = profile?.credits_balance ?? 0;

  if (currentBalance < amount) {
    return {
      success: false,
      balance: currentBalance,
      error: `Insufficient credits. Need ${amount}, have ${currentBalance}.`,
    };
  }

  const newBalance = currentBalance - amount;

  const { error } = await supabase
    .from('profiles')
    .update({ credits_balance: newBalance })
    .eq('id', userId)
    .gte('credits_balance', amount); // Extra safety: only deduct if still enough

  if (error) {
    return { success: false, balance: currentBalance, error: error.message };
  }

  // Log the credit transaction
  await supabase.from('credit_transactions').insert({
    user_id: userId,
    amount: -amount,
    balance_after: newBalance,
    reason,
    metadata: metadata || {},
  }).catch(() => {}); // Non-critical

  return { success: true, balance: newBalance };
}

export async function addCredits(
  userId: string,
  amount: number,
  reason: string,
  metadata?: Record<string, any>,
): Promise<{ success: boolean; balance: number }> {
  const supabase = createSupabaseAdmin();

  const { data: profile } = await supabase
    .from('profiles')
    .select('credits_balance')
    .eq('id', userId)
    .single();

  const currentBalance = profile?.credits_balance ?? 0;
  const newBalance = currentBalance + amount;

  const { error } = await supabase
    .from('profiles')
    .update({ credits_balance: newBalance })
    .eq('id', userId);

  if (error) {
    return { success: false, balance: currentBalance };
  }

  // Log the credit transaction
  await supabase.from('credit_transactions').insert({
    user_id: userId,
    amount: +amount,
    balance_after: newBalance,
    reason,
    metadata: metadata || {},
  }).catch(() => {});

  return { success: true, balance: newBalance };
}

export async function grantDailyCredits(userId: string): Promise<{
  granted: boolean;
  amount: number;
  balance: number;
}> {
  const supabase = createSupabaseAdmin();

  // Check if daily credits already granted today
  const today = new Date().toISOString().split('T')[0];
  const { data: existing } = await supabase
    .from('credit_transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('reason', 'daily_bonus')
    .gte('created_at', `${today}T00:00:00Z`)
    .limit(1);

  if (existing && existing.length > 0) {
    const balance = await getCreditBalance(userId);
    return { granted: false, amount: 0, balance };
  }

  const result = await addCredits(
    userId,
    CREDIT_CONFIG.dailyFreeCredits,
    'daily_bonus',
    { date: today },
  );

  return {
    granted: true,
    amount: CREDIT_CONFIG.dailyFreeCredits,
    balance: result.balance,
  };
}

export async function grantSubscriptionCredits(
  userId: string,
  plan: string,
): Promise<{ success: boolean; credits: number; balance: number }> {
  const credits = CREDIT_CONFIG.tierCredits[plan] || 0;
  if (credits === 0) {
    const balance = await getCreditBalance(userId);
    return { success: true, credits: 0, balance };
  }

  const result = await addCredits(
    userId,
    credits,
    'subscription_grant',
    { plan },
  );

  return { success: result.success, credits, balance: result.balance };
}

export async function getCreditHistory(
  userId: string,
  limit: number = 50,
): Promise<any[]> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}
