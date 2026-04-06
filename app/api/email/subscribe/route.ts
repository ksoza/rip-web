// app/api/email/subscribe/route.ts
// Email subscription endpoint — stores emails in Supabase
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy-init: don't create the client at module scope (env vars are empty at build time)
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase env vars');
  }
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const supabase = getSupabase();
    const cleanEmail = email.toLowerCase().trim();

    // Check if already subscribed
    const { data: existing, error: selectError } = await supabase
      .from('email_subscribers')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (selectError) {
      console.error('Email select error:', selectError);
      return NextResponse.json(
        { error: 'Database error', detail: selectError.message },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json({ message: "You're already on the list! 🎉" });
    }

    // Insert new subscriber
    const { error: insertError } = await supabase
      .from('email_subscribers')
      .insert({
        email: cleanEmail,
        source: 'website',
        subscribed_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Email insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to subscribe', detail: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "You're on the list! 🎉" });
  } catch (err) {
    console.error('Email subscribe catch:', err);
    return NextResponse.json(
      { error: 'Server error', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
