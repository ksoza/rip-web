// lib/auth.ts
// Server-side auth helpers — validate sessions in API routes
// Instead of trusting client-sent userId, always verify via Supabase session.

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// ── Get authenticated user from request cookies ────────────────────
// Returns the validated user or null. NEVER trust client-sent userId.
export async function getAuthUser(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(_name: string, _value: string, _options: CookieOptions) {
          // Read-only in API routes — no-op
        },
        remove(_name: string, _options: CookieOptions) {
          // Read-only in API routes — no-op
        },
      },
    },
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

// ── Require auth — returns user or 401 response ───────────────────
// Use in API routes:
//   const auth = await requireAuth(req);
//   if (auth instanceof NextResponse) return auth;
//   const userId = auth.id;
export async function requireAuth(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized — please sign in' },
      { status: 401 },
    );
  }
  return user;
}

// ── Validate UUID format ──────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isValidUUID(id: string): boolean {
  return UUID_RE.test(id);
}

// ── Sanitize text input ───────────────────────────────────────────
// Strips control characters and limits length
export function sanitizeInput(input: string, maxLength = 2000): string {
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // strip control chars
    .trim()
    .slice(0, maxLength);
}

// ── Standard error response ───────────────────────────────────────
export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
