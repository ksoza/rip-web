// app/api/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe                        from 'stripe';
import { recordRevenue, grantSubscription } from '@/lib/revenue';
import { createSupabaseAdmin }       from '@/lib/supabase';
import { logTransaction } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(req: NextRequest) {
  const body      = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('Webhook signature failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();

  try {
    switch (event.type) {

      // ── New subscription created ────────────────────────────────
      case 'checkout.session.completed': {
        const session  = event.data.object as Stripe.Checkout.Session;
        const subId    = session.subscription as string;
        const sub      = await stripe.subscriptions.retrieve(subId);
        const meta     = sub.metadata;
        const userId   = meta.user_id;
        const plan     = meta.plan as 'starter' | 'creator' | 'studio';
        const grossUsd = (session.amount_total || 0) / 100;

        // Grant subscription access
        await grantSubscription({
          userId,
          plan,
          stripeSubId: subId,
          periodEnd:   new Date(sub.current_period_end * 1000),
        });

        // Route revenue (13% → founder wallet, 50% → launch fund, etc.)
        await recordRevenue({
          userId,
          plan,
          paymentMethod:    'card',
          grossAmount:      grossUsd,
          stripePaymentId:  session.payment_intent as string,
        });

        // Log to transactions table
        await logTransaction({
          userId,
          type: 'subscription',
          amountUsd: grossUsd,
          stripePaymentId: session.payment_intent as string,
          metadata: { plan, subId, event: 'checkout.session.completed' },
        });

        // Handle first 10K wallet airdrop eligibility
        const { count } = await supabase
          .from('subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        if ((count || 0) <= 10000) {
          const ripAmount = { starter: 500, creator: 3000, studio: 7500 }[plan];
          await supabase.from('rip_airdrops').insert({
            user_id:    userId,
            plan,
            rip_amount: ripAmount,
            apy:        { starter: 420, creator: 690, studio: 1000 }[plan],
            status:     'pending',
          });
        }

        // Handle referral
        if (meta.referral_code) {
          const { data: referrer } = await supabase
            .from('profiles')
            .select('id')
            .eq('referral_code', meta.referral_code)
            .single();
          if (referrer) {
            await supabase.from('referrals').insert({
              referrer_id:    referrer.id,
              referred_id:    userId,
              plan_purchased: plan,
              credit_awarded: grossUsd * 0.20,
            });
          }
        }
        break;
      }

      // ── Monthly renewal ─────────────────────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.billing_reason !== 'subscription_cycle') break;

        const sub     = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const meta    = sub.metadata;
        const userId  = meta.user_id;
        const plan    = meta.plan;
        const gross   = (invoice.amount_paid || 0) / 100;

        // Reset generation counter — Starter is weekly, others monthly
        const planGens = { starter: 30, creator: 150, studio: 999999999 };
        const isStarterWeekly = plan === 'starter';
        // For starter — reset every invoice (weekly)
        // For others — reset every invoice (monthly)
        await supabase.from('profiles').update({
          generations_used: 0,
          generations_limit: planGens[plan as keyof typeof planGens] || 3,
        }).eq('id', userId);

        // Route revenue again
        await recordRevenue({
          userId, plan, paymentMethod: 'card', grossAmount: gross,
          stripePaymentId: invoice.payment_intent as string,
        });

        // Log renewal transaction
        await logTransaction({
          userId,
          type: 'subscription',
          amountUsd: gross,
          stripePaymentId: invoice.payment_intent as string,
          metadata: { plan, event: 'invoice.payment_succeeded', reason: invoice.billing_reason },
        });

        // Extend subscription period
        await supabase.from('subscriptions').update({
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          status: 'active',
        }).eq('stripe_sub_id', sub.id);
        break;
      }

      // ── Cancellation ────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub    = event.data.object as Stripe.Subscription;
        const userId = sub.metadata.user_id;

        await supabase.from('profiles').update({
          tier:              'free',
          generations_limit: 3,
        }).eq('id', userId);

        await supabase.from('subscriptions').update({
          status: 'canceled',
        }).eq('stripe_sub_id', sub.id);
        break;
      }

      // ── Payment failed ──────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const sub     = await stripe.subscriptions.retrieve(invoice.subscription as string);
        await supabase.from('subscriptions').update({
          status: 'past_due',
        }).eq('stripe_sub_id', sub.id);
        break;
      }
    }

    return NextResponse.json({ received: true });

  } catch (err: any) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


