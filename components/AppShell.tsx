'use client';
import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { createSupabaseBrowser } from '@/lib/supabase';
import { StudioTab }   from './studio/StudioTab';
import { RipLogo }     from './RipLogo';
import { FeedTab, SettingsTab } from './AllTabs';

const TABS = [
  { id: 'studio',   icon: '🎬', label: 'Studio'  },
  { id: 'feed',     icon: '📡', label: 'Feed'    },
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
  const [profileLoading, setProfileLoading] = useState(true);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    async function loadProfile() {
      setProfileLoading(true);
      try {
        // Try to fetch profile
        const { data, error } = await supabase
          .from('profiles')
          .select('username,tier,generations_used,generations_limit')
          .eq('id', user.id)
          .single();

        if (data) {
          setProfile(data);
        } else if (error?.code === 'PGRST116') {
          // Profile doesn't exist yet — the database trigger may not have fired yet
          // (can happen if the trigger wasn't set up or there's a race condition)
          // Create a fallback profile client-side
          const defaultProfile: Profile = {
            username: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'user',
            tier: 'free',
            generations_used: 0,
            generations_limit: 3,
          };
          setProfile(defaultProfile);

          // Try to upsert the profile via the API (as a background task)
          // The DB trigger should handle this, but just in case
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
        // Provide fallback profile so the app doesn't break
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

      {/* Top Bar */}
      <header className="border-b border-border bg-bg/95 backdrop-blur sticky top-0 z-50 px-5 py-3 flex items-center justify-between">
        <RipLogo size="sm" />
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted hidden sm:block">
            {profileLoading ? '...' : profile?.tier === 'free'
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
