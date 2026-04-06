// middleware.ts
// Next.js middleware — session refresh + auth gate
// Runs on EVERY matched route to keep Supabase auth cookies fresh.

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// ── Sanitize URL (env var may have "URL:" prefix) ──────────────────
function getSupabaseUrl(): string {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return rawUrl.replace(/^URL:\s*/i, '').trim();
}

// ── Routes that require authentication ─────────────────────────────
const PROTECTED_API_ROUTES = [
  '/api/comments',
  '/api/likes',
  '/api/staking',
  '/api/payout',
  '/api/nfts',
  '/api/transactions',
  '/api/mint',
  '/api/checkout',
  '/api/generate',
  '/api/create',
  '/api/ghostface',
  '/api/airbyte',
  '/api/n8n',
];

// ── Routes that are public (no auth needed) ────────────────────────
const PUBLIC_API_ROUTES = [
  '/api/search',
  '/api/trending',
  '/api/tmdb',
  '/api/referral',
  '/api/webhook',
  '/api/email',
  '/api/feed',
  '/api/models',
];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_API_ROUTES.some(route => pathname.startsWith(route));
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Create a Supabase server client that can read AND write cookies
 * on the NextResponse. This is critical for session refresh.
 */
function createSupabaseMiddlewareClient(req: NextRequest, res: NextResponse) {
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // Set on the request so downstream code sees fresh values
        req.cookies.set({ name, value });
        // Set on the response so the browser gets the updated cookie
        res.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        req.cookies.set({ name, value: '' });
        res.cookies.set({ name, value: '', ...options });
      },
    },
  });
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── For ALL routes: refresh session cookies ────────────────────
  // This is REQUIRED by Supabase SSR — without it, auth cookies
  // expire and getSession() returns null on page loads.
  const res = NextResponse.next({
    request: { headers: new Headers(req.headers) },
  });

  try {
    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

    if (!supabaseUrl || !supabaseKey) {
      // Can't do auth without config — pass through
      return res;
    }

    const supabase = createSupabaseMiddlewareClient(req, res);

    // getUser() refreshes the session if needed and updates cookies
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // ── Non-API routes: just refresh cookies, no blocking ────────
    if (!pathname.startsWith('/api/')) {
      return res;
    }

    // ── Public API routes: pass through ──────────────────────────
    if (isPublicRoute(pathname)) {
      res.headers.set('X-RateLimit-Policy', 'rip-api-v1');
      if (pathname === '/api/trending' || pathname === '/api/feed') {
        res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
      } else {
        res.headers.set('Cache-Control', 'no-store');
      }
      return res;
    }

    // ── Protected API routes: require authentication ─────────────
    if (isProtectedRoute(pathname)) {
      if (authError) {
        console.error('[middleware] Auth error:', authError.message);
        return NextResponse.json(
          { error: 'Authentication failed — please sign in again', code: 'SESSION_EXPIRED' },
          { status: 401 },
        );
      }

      if (!user) {
        return NextResponse.json(
          { error: 'Please sign in to continue', code: 'NOT_AUTHENTICATED' },
          { status: 401 },
        );
      }

      // Pass verified user ID to downstream API routes
      res.headers.set('x-user-id', user.id);
      res.headers.set('x-user-email', user.email || '');
      return res;
    }

    // ── Default API route: pass through ──────────────────────────
    res.headers.set('X-RateLimit-Policy', 'rip-api-v1');
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (err) {
    console.error('[middleware] Unexpected error:', err);
    // Non-fatal — pass through rather than block
    return res;
  }
}

// Run on ALL routes (pages + API) so session cookies stay fresh
export const config = {
  matcher: [
    // Match all routes EXCEPT static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
