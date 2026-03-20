// app/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase';
import { LandingPage }  from '@/components/LandingPage';
import { AppShell }     from '@/components/AppShell';
import type { User }    from '@supabase/supabase-js';

export default function Home() {
  const [user, setUser]     = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = createSupabaseBrowser();
    sb.auth.getUser()
      .then(({ data }) => {
        setUser(data.user);
      })
      .catch((err) => {
        console.error('Auth check failed:', err);
      })
      .finally(() => {
        setLoading(false);
      });
    const { data: { subscription } } = sb.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
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
