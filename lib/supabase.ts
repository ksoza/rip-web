// lib/supabase.ts
import { createBrowserClient } from '@supabase/ssr';
import { createClient }        from '@supabase/supabase-js';

// ── Browser client (use in Client Components) ─────────────────────
export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// ── Server/Admin client (use in API Routes + Server Actions) ──────
export function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ── Types ─────────────────────────────────────────────────────────
export type Profile = {
  id:                  string;
  username:            string;
  avatar_url:          string | null;
  tier:                'free' | 'starter' | 'creator' | 'studio';
  generations_used:    number;
  generations_limit:   number;
  referral_code:       string;
  referred_by:         string | null;
  stripe_customer_id:  string | null;
  created_at:          string;
};

export type Creation = {
  id:          string;
  user_id:     string;
  show_title:  string;
  genre:       string;
  type:        string;
  title:       string | null;
  logline:     string | null;
  content:     string | null;
  hashtags:    string | null;
  tools_used:  string[];
  is_public:   boolean;
  likes_count: number;
  remix_count: number;
  created_at:  string;
  profiles?:   { username: string; avatar_url: string | null };
};
