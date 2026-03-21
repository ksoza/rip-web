// app/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase';
import { LandingPage }  from '@/components/LandingPage';
import { AppShell }     from '@/components/AppShell';
import type { User }    from '@supabase/supabase-js';

export default function Home() {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = createSupabaseBrowser();

    // First, check URL for auth callback (Google OAuth, email confirm, etc.)
    // Supabase puts tokens in the URL hash after OAuth redirect
    sb.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
      })
      .catch((err) => {
        console.error('Session check failed:', err);
      })
      .finally(() => {
        setLoading(false);
      });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      // If user just signed in, make sure we're not stuck on loading
      if (_event === 'SIGNED_IN') {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="font-display text-6xl tracking-widest mb-3">
            <span className="text-rip">R</span>
            <span className="text-white">i</span>
            <span className="text-cyan">P</span>
          </div>
          <div className="w-8 h-0.5 bg-gradient-to-r from-rip to-purple mx-auto animate-pulse" />
        </div>
      </div>
    );
  }

  return user ? <AppShell user={user} /> : <LandingPage />;
}
