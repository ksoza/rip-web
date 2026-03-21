'use client';
import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { createSupabaseBrowser } from '@/lib/supabase';
import { StudioTab }    from './studio/StudioTab';
import { DiscoverTab }  from './discover/DiscoverTab';
import { RipLogo }      from './RipLogo';
import { WalletTab, RevenueTab, SettingsTab } from './AllTabs';

// ── Nav Tabs ────────────────────────────────────────────────────
const NAV = [
  { id: 'studio',   icon: '🎬', label: 'Studio',   color: '#ff2d78' },
  { id: 'discover', icon: '🌐', label: 'Discover',  color: '#00d4ff' },
  { id: 'wallet',   icon: '💎', label: 'Wallet',    color: '#8aff00' },
  { id: 'settings', icon: '⚙️', label: 'Settings',  color: '#a855f7' },
];

type Profile = {
  username:         string;
  tier:             string;
  generations_used: number;
  generations_limit:number;
};

export function AppShell({ user }: { user: User }) {
  const [tab, setTab]                   = useState('studio');
  const [profile, setProfile]           = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const supabase = createSupabaseBrowser();

  // ── Load profile ────────────────────────────────────────────
  useEffect(() => {
    async function loadProfile() {
      setProfileLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username,tier,generations_used,generations_limit')
          .eq('id', user.id)
          .single();

        if (data) {
          setProfile(data);
        } else if (error?.code === 'PGRST116') {
          // Profile doesn't exist yet — auth callback should have created it,
          // but create a fallback just in case
          const defaultProfile: Profile = {
            username: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'user',
            tier: 'free',
            generations_used: 0,
            generations_limit: 3,
          };
          setProfile(defaultProfile);

          // Background upsert attempt
          await supabase.from('profiles').upsert({
            id: user.id,
            username: defaultProfile.username,
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
            tier: 'free',
            generations_used: 0,
            generations_limit: 3,
          }, { onConflict: 'id' });
        }
      } catch (err) {
        console.error('Profile load error:', err);
        setProfile({
          username: user.email?.split('@')[0] || 'user',
          tier: 'free',
          generations_used: 0,
          generations_limit: 3,
        });
      } finally {
        setProfileLoading(false);
      }
    }

    loadProfile();
  }, [user.id]);

  const genLeft = profile ? profile.generations_limit - profile.generations_used : 0;

  return (
    <div className="min-h-screen bg-bg flex flex-col">

      {/* ── Top Bar ────────────────────────────────────────────── */}
      <header className="border-b border-border bg-bg/95 backdrop-blur sticky top-0 z-50 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RipLogo size="sm" />
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 ml-6">
            {NAV.map(n => (
              <button key={n.id} onClick={() => setTab(n.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  tab === n.id
                    ? 'text-white'
                    : 'text-muted hover:text-white'
                }`}
                style={tab === n.id ? { backgroundColor: n.color + '15', color: n.color } : {}}>
                <span className="text-sm">{n.icon}</span>
                {n.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Generation counter */}
          <span className="text-xs text-muted hidden sm:block">
            {profileLoading ? '...' : profile?.tier === 'free'
              ? `${genLeft} free gen${genLeft !== 1 ? 's' : ''}`
              : `${profile?.tier} plan`}
          </span>
          {/* Avatar */}
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rip to-purple flex items-center justify-center text-white text-xs font-bold cursor-pointer"
            onClick={() => setTab('settings')}>
            {profile?.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
          </div>
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className={`mx-auto py-6 pb-28 ${tab === 'studio' ? 'max-w-6xl px-4 sm:px-6' : 'max-w-5xl px-4 sm:px-6'}`}>
          {tab === 'studio'   && <StudioTab    user={user} profile={profile} onProfileUpdate={setProfile} />}
          {tab === 'discover' && <DiscoverTab  user={user} profile={profile} />}
          {tab === 'wallet'   && <WalletTab    user={user} />}
          {tab === 'settings' && <SettingsTab  user={user} profile={profile} onSignOut={() => supabase.auth.signOut()} />}
        </div>
      </main>

      {/* ── Mobile Bottom Tab Bar ──────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-bg2/95 backdrop-blur border-t border-border z-50 safe-bottom">
        <div className="flex">
          {NAV.map(n => (
            <button key={n.id} onClick={() => setTab(n.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
                tab === n.id ? '' : 'text-muted'
              }`}
              style={tab === n.id ? { color: n.color } : {}}>
              <span className="text-xl leading-none">{n.icon}</span>
              <span className="text-[9px] font-bold uppercase tracking-wide">{n.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
