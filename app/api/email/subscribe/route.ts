// app/api/email/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) {
    throw new Error('Missing Supabase env vars');
  }
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const supabase = getSupabase();
    const cleanEmail = email.toLowerCase().trim();

    const { data: existing } = await supabase
      .from('email_subscribers')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ message: "You're already on the list! 🎉" });
    }

    const { error } = await supabase
      .from('email_subscribers')
      .insert({
        email: cleanEmail,
        source: 'website',
        subscribed_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Email insert error:', error);
      return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
    }

    return NextResponse.json({ message: "You're on the list! 🎉" });
  } catch (err) {
    console.error('Email subscribe error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
