// app/api/email/subscribe/route.ts
// Email subscription endpoint — stores emails in Supabase
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy-init: don't create the client at module scope (env vars are empty at build time)
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Check if already subscribed
    const { data: existing } = await supabase
      .from('email_subscribers')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existing) {
      return NextResponse.json({ message: 'You\'re already on the list! 🎉' });
    }

    // Insert new subscriber
    const { error } = await supabase
      .from('email_subscribers')
      .insert({
        email: email.toLowerCase().trim(),
        source: 'website',
        subscribed_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Email subscribe error:', error);
      return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
    }

    return NextResponse.json({ message: 'You\'re on the list! 🎉' });
  } catch (err) {
    console.error('Email subscribe error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
