// app/api/referral/route.ts
// Referral system — generate links, track signups, award credits
// Flow: User shares referral link → friend subscribes → both earn rewards

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { logTransaction } from '@/lib/db';

// Referral rewards config
const REFERRAL_REWARDS = {
  referrer_credit_pct: 0.20,  // 20% of first payment as credit
  referee_bonus_gens: 5,       // Bonus generations for new user
  max_referrals: 100,          // Max referrals per user
};

// GET — Get referral stats for a user
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const supabase = createSupabaseAdmin();

    // Get user's referral code
    const { data: profile } = await supabase
      .from('profiles')
      .select('referral_code, username')
      .eq('id', userId)
      .single();

    if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Get referral stats
    const { data: referrals, count } = await supabase
      .from('referrals')
      .select('*, profiles!referrals_referred_id_fkey(username, display_name)', { count: 'exact' })
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    const totalCredits = (referrals || []).reduce((sum, r) => sum + (r.credit_awarded || 0), 0);
    const claimedCredits = (referrals || []).filter(r => r.credit_claimed).reduce((sum, r) => sum + (r.credit_awarded || 0), 0);
    const pendingCredits = totalCredits - claimedCredits;

    return NextResponse.json({
      referralCode: profile.referral_code,
      referralLink: `https://remixip.icu/ref/${profile.referral_code}`,
      stats: {
        totalReferrals: count || 0,
        totalCredits: Math.round(totalCredits * 100) / 100,
        claimedCredits: Math.round(claimedCredits * 100) / 100,
        pendingCredits: Math.round(pendingCredits * 100) / 100,
        maxReferrals: REFERRAL_REWARDS.max_referrals,
      },
      referrals: referrals || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — Process a referral (called internally when someone subscribes with a referral code)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    const supabase = createSupabaseAdmin();

    // Action: claim — user claims their referral credits
    if (action === 'claim') {
      const { userId } = body;
      if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

      // Get unclaimed referral credits
      const { data: unclaimed } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', userId)
        .eq('credit_claimed', false)
        .gt('credit_awarded', 0);

      if (!unclaimed || unclaimed.length === 0) {
        return NextResponse.json({ error: 'No unclaimed credits' }, { status: 400 });
      }

      const totalClaim = unclaimed.reduce((sum, r) => sum + (r.credit_awarded || 0), 0);

      // Mark as claimed
      const ids = unclaimed.map(r => r.id);
      await supabase
        .from('referrals')
        .update({ credit_claimed: true, claimed_at: new Date().toISOString() })
        .in('id', ids);

      // Log the claim transaction
      await logTransaction({
        userId,
        type: 'referral_reward',
        amountUsd: totalClaim,
        metadata: { referralIds: ids, count: unclaimed.length },
      });

      return NextResponse.json({
        success: true,
        claimed: Math.round(totalClaim * 100) / 100,
        referralsProcessed: unclaimed.length,
      });
    }

    // Action: generate_code — generate a new referral code for user
    if (action === 'generate_code') {
      const { userId } = body;
      if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

      // Generate unique code
      const code = `RIP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

      await supabase
        .from('profiles')
        .update({ referral_code: code })
        .eq('id', userId);

      return NextResponse.json({
        success: true,
        referralCode: code,
        referralLink: `https://remixip.icu/ref/${code}`,
      });
    }

    return NextResponse.json({ error: 'Unknown action. Use: claim, generate_code' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
