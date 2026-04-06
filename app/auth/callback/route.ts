// app/auth/callback/route.ts
// Handles OAuth and email confirmation callbacks from Supabase
// Required for PKCE flow (default with @supabase/ssr)
// Also auto-creates profile row if missing (replaces need for DB trigger)
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function getSupabaseUrl(): string {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return rawUrl.replace(/^URL:\s*/i, '').trim();
}

/**
 * Ensures a profile row exists for the given user.
 * Uses service_role key to bypass RLS (like the DB trigger would).
 * Falls back gracefully if service_role key isn't configured.
 */
async function ensureProfile(userId: string, userMeta: Record<string, any>, email: string | undefined) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey || serviceRoleKey === 'your_service_role_key_here') {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set — skipping auto profile creation');
    return;
  }

  try {
    const adminClient = createClient(getSupabaseUrl(), serviceRoleKey);

    // Check if profile already exists
    const { data: existing } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (existing) return;

    const username = userMeta?.name
      || userMeta?.full_name
      || email?.split('@')[0]
      || 'user';

    const avatarUrl = userMeta?.avatar_url || userMeta?.picture || null;

    const { error } = await adminClient
      .from('profiles')
      .insert({
        id: userId,
        username,
        avatar_url: avatarUrl,
      });

    if (error) {
      if (error.code === '23505') return;
      console.error('Failed to create profile:', error);
    } else {
      console.log('Auto-created profile for user:', userId);
    }
  } catch (err) {
    console.error('ensureProfile error:', err);
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get('code');
  const next  = searchParams.get('next') ?? '/';
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle error redirects from Supabase
  if (error) {
    const errorParam = encodeURIComponent(errorDescription || error);
    return NextResponse.redirect(`${origin}/?error=${errorParam}`);
  }

  if (code) {
    const cookieStore = cookies();

    // Build a Supabase server client that writes cookies onto
    // the REDIRECT response (not just the cookie store).
    // This ensures the browser receives the session cookies.
    const redirectUrl = `${origin}${next}`;
    const response = NextResponse.redirect(redirectUrl);

    const supabase = createServerClient(
      getSupabaseUrl(),
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim(),
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            // Write to BOTH the cookie store and the redirect response
            cookieStore.set({ name, value, ...options });
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
            response.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { error: authError } = await supabase.auth.exchangeCodeForSession(code);

    if (!authError) {
      // Get user and auto-create profile if needed
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await ensureProfile(user.id, user.user_metadata || {}, user.email);
      }
      return response;
    }

    console.error('Auth callback error:', authError);
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(authError.message)}`);
  }

  return NextResponse.redirect(`${origin}/`);
}
