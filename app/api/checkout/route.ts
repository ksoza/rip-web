// app/api/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe                        from 'stripe';
import { createSupabaseAdmin }       from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER!,
  creator: process.env.STRIPE_PRICE_CREATOR!,
  studio:  process.env.STRIPE_PRICE_STUDIO!,
};

const PLAN_RIP: Record<string, number> = { starter: 500, creator: 3000, studio: 7500 };

// Use the actual deployed URL (works for both remixip.icu and remixip.com)
function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://www.remixip.icu';
}

export async function POST(req: NextRequest) {
  try {
    // Use verified user from middleware (x-user-id header)
    const userId = req.headers.get('x-user-id')!;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan, referralCode } = await req.json();

    if (!plan || !PRICE_IDS[plan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    if (!PRICE_IDS[plan] || PRICE_IDS[plan].startsWith('price_xxxxx')) {
      return NextResponse.json({ error: 'Stripe prices not configured yet' }, { status: 500 });
    }

    const supabase = createSupabaseAdmin();

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, username')
      .eq('id', userId)
      .single();

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const { data: { user } } = await supabase.auth.admin.getUserById(userId);
      const customer = await stripe.customers.create({
        email:    user?.email,
        name:     profile?.username,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
    }

    const appUrl = getAppUrl();

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer:   customerId,
      mode:       'subscription',
      line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
      success_url: `${appUrl}/?success=true&plan=${plan}`,
      cancel_url:  `${appUrl}/?canceled=true`,
      subscription_data: {
        metadata: {
          user_id:      userId,
          plan,
          rip_amount:   String(PLAN_RIP[plan] || 0),
          referral_code: referralCode || '',
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });

    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    console.error('Checkout error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
