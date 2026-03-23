'use client';
import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { createSupabaseBrowser } from '@/lib/supabase';
import { StudioTab }    from './studio/StudioTab';
import { DiscoverTab }  from './discover/DiscoverTab';
import { GhokuBrain }   from './ghoku/GhokuBrain';
import { WalletTab }    from './wallet/WalletTab';
import { RipLogo }      from './RipLogo';
import { SettingsTab }  from './AllTabs';
import { CreationWizard } from './create/CreationWizard';
import type { MediaItem } from './create/CreationWizard';

// ── Nav Tabs ────────────────────────────────────────────────────
const NAV = [
  { id: 'studio',   icon: '🎬', label: 'Studio',   color: '#ff2d78' },
  { id: 'discover', icon: '🌐', label: 'Discover',  color: '#00d4ff' },
  { id: 'ghoku',    icon: '🧠', label: 'Gh.O.K.U.', color: '#8aff00' },
  { id: 'wallet',   icon: '💎', label: 'Wallet',    color: '#a855f7' },
  { id: 'settings', icon: '⚙️', label: 'Settings',  color: '#666' },
];

type Profile = {
  username:         string;
  tier:             string;
  generations_used: number;
  generations_limit:number;
};

export function AppShell({ user }: { user: User }) {
  const [tab, setTab]                   = useState('discover');
  const [profile, setProfile]           = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [studioShowName, setStudioShowName] = useState('');
  const [studioCategory, setStudioCategory] = useState('');
  // Creation Wizard state
  const [wizardMedia, setWizardMedia]   = useState<MediaItem | null>(null);
  const [showWizard, setShowWizard]     = useState(false);
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
          const defaultProfile: Profile = {
            username: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'user',
            tier: 'free',
            generations_used: 0,
            generations_limit: 3,
          };
          setProfile(defaultProfile);

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

  // ── Reimagine: opens the Creation Wizard ────────────────────
  function handleReimagine(mediaItem: MediaItem) {
    setWizardMedia(mediaItem);
    setShowWizard(true);
  }

  // ── Navigate from Discover → Studio with pre-selected show ──
  function handleNavigateToStudio(showName: string, category: string) {
    setStudioShowName(showName);
    setStudioCategory(category);
    setTab('studio');
  }

  // ── Open editor from wizard result ──────────────────────────
  function handleOpenEditor(resultData: any) {
    setShowWizard(false);
    setStudioShowName(resultData.media.title);
    setStudioCategory(resultData.media.category);
    setTab('studio');
  }

  const genLeft = profile ? profile.generations_limit - profile.generations_used : 0;

  return (
    <div className="min-h-screen bg-bg flex flex-col">

      {/* ── Creation Wizard Overlay ────────────────────────────── */}
      {showWizard && wizardMedia && (
        <CreationWizard
          user={user}
          selectedMedia={wizardMedia}
          onClose={() => setShowWizard(false)}
          onOpenEditor={handleOpenEditor}
        />
      )}

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
          <span className="text-xs text-muted hidden sm:block">
            {profileLoading ? '...' : profile?.tier === 'free'
              ? `${genLeft} free gen${genLeft !== 1 ? 's' : ''}`
              : `${profile?.tier} plan`}
          </span>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rip to-purple flex items-center justify-center text-white text-xs font-bold cursor-pointer"
            onClick={() => setTab('settings')}>
            {profile?.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
          </div>
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className={`mx-auto py-6 pb-28 ${tab === 'studio' ? 'max-w-6xl px-4 sm:px-6' : 'max-w-5xl px-4 sm:px-6'}`}>
          {tab === 'studio'   && <StudioTab user={user} profile={profile} onProfileUpdate={setProfile} preselectedShow={studioShowName} preselectedCategory={studioCategory} />}
          {tab === 'discover' && <DiscoverTab user={user} profile={profile} onNavigateToStudio={handleNavigateToStudio} onReimagine={handleReimagine} />}
          {tab === 'ghoku'    && <GhokuBrain />}
          {tab === 'wallet'   && <WalletTab />}
          {tab === 'settings' && <SettingsTab user={user} profile={profile} onSignOut={() => supabase.auth.signOut()} />}
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
