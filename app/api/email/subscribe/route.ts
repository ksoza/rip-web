// app/api/email/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = 'https://jtoyvnhjwdogpjntcbgq.supabase.co';

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

    const cleanEmail = email.toLowerCase().trim();
    const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
    const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    const apiKey = serviceKey || anonKey;

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 500 });
    }

    // Use raw fetch instead of Supabase client for maximum control
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Prefer': 'return=minimal',
    };

    // Check if already subscribed
    const selectRes = await fetch(
      `${SUPABASE_URL}/rest/v1/email_subscribers?email=eq.${encodeURIComponent(cleanEmail)}&select=id&limit=1`,
      { method: 'GET', headers }
    );

    if (!selectRes.ok) {
      const body = await selectRes.text();
      return NextResponse.json(
        { error: 'Database read error', status: selectRes.status, detail: body },
        { status: 500 }
      );
    }

    const existing = await selectRes.json();
    if (existing && existing.length > 0) {
      return NextResponse.json({ message: "You're already on the list! 🎉" });
    }

    // Insert
    const insertRes = await fetch(
      `${SUPABASE_URL}/rest/v1/email_subscribers`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: cleanEmail }),
      }
    );

    if (!insertRes.ok) {
      const body = await insertRes.text();
      return NextResponse.json(
        { error: 'Insert failed', status: insertRes.status, detail: body },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "You're on the list! 🎉" });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    const cause = err instanceof Error && err.cause ? String(err.cause) : undefined;
    return NextResponse.json(
      { error: 'Server error', detail, cause },
      { status: 500 }
    );
  }
}
