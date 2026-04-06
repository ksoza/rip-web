// app/api/email/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

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

    const supabase = createRouteHandlerClient({ cookies });
    const cleanEmail = email.toLowerCase().trim();

    // Check if already subscribed
    const { data: existing, error: selErr } = await supabase
      .from('email_subscribers')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (selErr) {
      return NextResponse.json(
        { error: 'Database error', detail: selErr.message, code: selErr.code },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json({ message: "You're already on the list! 🎉" });
    }

    // Insert new subscriber
    const { error: insErr } = await supabase
      .from('email_subscribers')
      .insert({ email: cleanEmail });

    if (insErr) {
      return NextResponse.json(
        { error: 'Insert failed', detail: insErr.message, code: insErr.code },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "You're on the list! 🎉" });
  } catch (err) {
    return NextResponse.json(
      { error: 'Server error', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
