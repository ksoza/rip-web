'use client';
import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { createSupabaseBrowser } from '@/lib/supabase';
import { StudioTab }   from './studio/StudioTab';
import { FeedTab, WalletTab, RevenueTab, SettingsTab } from './AllTabs';

const TABS = [
  { id: 'studio',   icon: '🎬', label: 'Studio'  },
  { id: 'feed',     icon: '📡', label: 'Feed'    },
  { id: 'wallet',   icon: '☽',  label: 'Wallet'  },
  { id: 'revenue',  icon: '💰', label: 'Revenue' },
  { id: 'settings', icon: '🔧', label: 'Settings'},
];

type Profile = {
  username:         string;
  tier:             string;
  generations_used: number;
  generations_limit:number;
};

export function AppShell({ user }: { user: User }) {
  const [tab, setTab]         = useState('studio');
  const [profile, setProfile] = useState<Profile | null>(null);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    supabase.from('profiles').select('username,tier,generations_used,generations_limit')
      .eq('id', user.id).single()
      .then(({ data }) => setProfile(data));
  }, [user.id]);

  const genLeft = profile ? profile.generations_limit - profile.generations_used : 0;

  return (
    <div className="min-h-screen bg-bg flex flex-col">

      {/* Top Bar */}
      <header className="border-b border-border bg-bg/95 backdrop-blur sticky top-0 z-50 px-5 py-3 flex items-center justify-between">
        <div className="font-display text-2xl tracking-widest">
          <span className="text-rip">R</span>
          <span className="text-white">i</span>
          <span className="text-cyan">P</span>
          <span className="ml-2 text-[10px] font-body text-muted2 tracking-widest uppercase">Remix I.P.</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted hidden sm:block">
            {profile?.tier === 'free'
              ? `${genLeft} free generation${genLeft !== 1 ? 's' : ''} left`
              : `${profile?.tier} plan`}
          </span>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rip to-purple flex items-center justify-center text-white text-xs font-bold">
            {profile?.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
          </div>
        </div>
      </header>

      {/* Tab Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-28">
          {tab === 'studio'   && <StudioTab   user={user} profile={profile} onProfileUpdate={setProfile} />}
          {tab === 'feed'     && <FeedTab     user={user} />}
          {tab === 'wallet'   && <WalletTab   user={user} />}
          {tab === 'revenue'  && <RevenueTab  user={user} />}
          {tab === 'settings' && <SettingsTab user={user} profile={profile} onSignOut={() => supabase.auth.signOut()} />}
        </div>
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-bg2 border-t border-border z-50">
        <div className="max-w-5xl mx-auto flex">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                tab === t.id ? 'text-rip' : 'text-muted hover:text-white'
              }`}
            >
              <span className="text-xl leading-none">{t.icon}</span>
              <span className={`text-[9px] font-bold uppercase tracking-wide ${tab === t.id ? 'text-rip' : ''}`}>
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
