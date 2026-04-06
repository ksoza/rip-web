// middleware.ts
// Next.js middleware — auth gate + rate limiting headers
// Runs on every matched route BEFORE the handler.

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
  '/api/webhook', // Stripe webhook uses its own signature verification
  '/api/email',   // Email subscribe — public for pre-auth capture
  '/api/feed',    // Feed content — public for discovery
  '/api/models',  // Model list — public for UI
];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_API_ROUTES.some(route => pathname.startsWith(route));
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some(route => pathname.startsWith(route));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Only process API routes ────────────────────────────────────
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // ── Skip auth for public routes ────────────────────────────────
  if (isPublicRoute(pathname)) {
    const res = NextResponse.next();
    res.headers.set('X-RateLimit-Policy', 'rip-api-v1');
    if (pathname === '/api/trending' || pathname === '/api/feed') {
      res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    } else {
      res.headers.set('Cache-Control', 'no-store');
    }
    return res;
  }

  // ── Auth check for protected API routes ────────────────────────
  if (isProtectedRoute(pathname)) {
    try {
      const supabaseUrl = getSupabaseUrl();
      const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

      if (!supabaseUrl || !supabaseKey) {
        console.error('[middleware] Missing SUPABASE env vars');
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 },
        );
      }

      const supabase = createServerClient(
        supabaseUrl,
        supabaseKey,
        {
          cookies: {
            get(name: string) {
              return req.cookies.get(name)?.value;
            },
            set(_name: string, _value: string, _options: CookieOptions) {
              // no-op in middleware
            },
            remove(_name: string, _options: CookieOptions) {
              // no-op in middleware
            },
          },
        },
      );

      const { data: { user }, error: authError } = await supabase.auth.getUser();

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

      // Pass verified user ID to downstream API routes via request headers.
      // Routes read req.headers.get('x-user-id') instead of trusting body.
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set('x-user-id', user.id);
      requestHeaders.set('x-user-email', user.email || '');

      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    } catch (err) {
      console.error('[middleware] Unexpected auth error:', err);
      return NextResponse.json(
        { error: 'Authentication failed — please sign in again', code: 'AUTH_ERROR' },
        { status: 401 },
      );
    }
  }

  // ── Default: pass through ──────────────────────────────────────
  const res = NextResponse.next();
  res.headers.set('X-RateLimit-Policy', 'rip-api-v1');
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

// Only run middleware on API routes (not static assets, _next, etc.)
export const config = {
  matcher: ['/api/:path*'],
};
