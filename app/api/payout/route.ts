// app/api/payout/route.ts
// Founder Payout Processing — distributes revenue per the 13% founder split
// Revenue split: 13% founder, 50% launch fund, 15% AI, 10% staking, 7% ops, 5% reserve
//
// GET: Check pending payouts
// POST: Queue a payout (admin only)

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { logTransaction } from '@/lib/db';

const FOUNDER_WALLET = process.env.FOUNDER_SOLANA_WALLET || 'DbnD8vxbNVrG9iL7oi83Zg8RGqxFLATGcW67oq2xD5Nj';

// Revenue split percentages
const REVENUE_SPLIT = {
  founder: 0.13,
  launch_fund: 0.50,
  ai_costs: 0.15,
  staking: 0.10,
  operations: 0.07,
  reserve: 0.05,
} as const;

// GET — List pending payouts from founder_payout_queue
export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';

    const { data, error } = await supabase
      .from('founder_payout_queue')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Also get totals
    const { data: totals } = await supabase
      .from('founder_payout_queue')
      .select('amount_usd, amount_sol, status');

    const summary = {
      pending_usd: (totals || []).filter(t => t.status === 'pending').reduce((s, t) => s + (t.amount_usd || 0), 0),
      pending_sol: (totals || []).filter(t => t.status === 'pending').reduce((s, t) => s + (t.amount_sol || 0), 0),
      paid_usd: (totals || []).filter(t => t.status === 'paid').reduce((s, t) => s + (t.amount_usd || 0), 0),
      paid_sol: (totals || []).filter(t => t.status === 'paid').reduce((s, t) => s + (t.amount_sol || 0), 0),
    };

    return NextResponse.json({ payouts: data, summary, founderWallet: FOUNDER_WALLET });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — Queue a new payout or process revenue event
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    const supabase = createSupabaseAdmin();

    // Action: split — split a revenue event into all buckets
    if (action === 'split') {
      const { totalUsd, sourceType, sourceId, userId } = body;
      if (!totalUsd || totalUsd <= 0) {
        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
      }

      const splits: Record<string, number> = {};
      for (const [bucket, pct] of Object.entries(REVENUE_SPLIT)) {
        splits[bucket] = Math.round(totalUsd * pct * 100) / 100;
      }

      // Record in revenue_events
      const { error: revError } = await supabase
        .from('revenue_events')
        .insert({
          user_id: userId,
          source_type: sourceType || 'subscription',
          source_id: sourceId,
          gross_amount: totalUsd,
          splits: splits,
        });

      if (revError) console.error('Revenue event error:', revError);

      // Queue founder payout
      const { error: payoutError } = await supabase
        .from('founder_payout_queue')
        .insert({
          amount_usd: splits.founder,
          wallet_address: FOUNDER_WALLET,
          source_type: sourceType || 'subscription',
          source_id: sourceId,
          status: 'pending',
        });

      if (payoutError) console.error('Payout queue error:', payoutError);

      // Record in launch_fund_ledger
      const { error: fundError } = await supabase
        .from('launch_fund_ledger')
        .insert({
          amount_usd: splits.launch_fund,
          source_type: sourceType || 'subscription',
          source_id: sourceId,
          category: 'deposit',
        });

      if (fundError) console.error('Launch fund error:', fundError);

      return NextResponse.json({
        success: true,
        splits,
        totalUsd,
        founderPayout: splits.founder,
      });
    }

    // Action: mark_paid — mark a payout as processed
    if (action === 'mark_paid') {
      const { payoutId, txHash } = body;
      if (!payoutId) {
        return NextResponse.json({ error: 'Missing payoutId' }, { status: 400 });
      }

      const { error } = await supabase
        .from('founder_payout_queue')
        .update({
          status: 'paid',
          solana_tx_sig: txHash,
          paid_at: new Date().toISOString(),
        })
        .eq('id', payoutId);

      if (error) throw error;

      // Log the payout transaction
      await logTransaction({
        userId: 'system',
        type: 'founder_payout',
        amountSol: 0,
        solanaTxSig: txHash,
        metadata: { payoutId },
      });

      return NextResponse.json({ success: true, payoutId, txHash });
    }

    return NextResponse.json({ error: 'Unknown action. Use: split, mark_paid' }, { status: 400 });

  } catch (err: any) {
    console.error('Payout API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
