'use client';
import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { createSupabaseBrowser } from '@/lib/supabase';
import { StudioTab }    from './studio/StudioTab';
import { DiscoverTab }  from './discover/DiscoverTab';
import { GhostfaceBrain }   from './ghostface/GhostfaceBrain';
import { WalletTab }    from './wallet/WalletTab';
import { RipLogo }      from './RipLogo';
import { SettingsTab }  from './AllTabs';
import { CreationWizard } from './create/CreationWizard';
import type { MediaItem } from './create/CreationWizard';

// ── Nav Tabs ────────────────────────────────────────────────────
const NAV = [
  { id: 'discover', icon: '🌐', label: 'Discover',  color: '#00d4ff' },
  { id: 'studio',   icon: '🎬', label: 'Studio',   color: '#ff2d78' },
  { id: 'ghostface',    icon: '🧠', label: 'GhOSTface', color: '#8aff00' },
  { id: 'wallet',   icon: '💎', label: 'Wallet',    color: '#a855f7' },
  { id: 'settings', icon: '⚙️', label: 'Settings',  color: '#666' },
];

// Tabs that require authentication
const AUTH_REQUIRED_TABS = new Set(['studio', 'wallet', 'settings']);

type Profile = {
  username:         string;
  tier:             string;
  generations_used: number;
  generations_limit:number;
};

// ── Sign-In Prompt (shown for gated tabs when not logged in) ────
function SignInPrompt({ tabName, onSignIn }: { tabName: string; onSignIn: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rip/20 to-purple/20 border border-rip/30 flex items-center justify-center mb-6">
        <span className="text-4xl">🔐</span>
      </div>
      <h2 className="text-2xl font-bold text-white mb-3">
        Sign in to access {tabName}
      </h2>
      <p className="text-muted text-sm max-w-md mb-8">
        Create remixes, mint NFTs, manage your wallet, and unlock the full power of ReMixIP.
        Free to sign up — takes 5 seconds.
      </p>
      <button
        onClick={onSignIn}
        className="flex items-center gap-3 px-8 py-3.5 rounded-xl font-bold text-white transition-all hover:scale-105 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #ff2d78, #a855f7)' }}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Sign in with Google
      </button>
      <p className="text-muted/50 text-xs mt-4">
        Browse shows and explore freely — sign in when you&apos;re ready to create
      </p>
    </div>
  );
}

export function AppShell({ user }: { user: User | null }) {
  const [tab, setTab]                   = useState('discover');
  const [profile, setProfile]           = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [studioShowName, setStudioShowName] = useState('');
  const [studioCategory, setStudioCategory] = useState('');
  // Creation Wizard state
  const [wizardMedia, setWizardMedia]   = useState<MediaItem | null>(null);
  const [showWizard, setShowWizard]     = useState(false);
  const supabase = createSupabaseBrowser();

  // ── Google Sign In ──────────────────────────────────────────
  async function handleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  }

  // ── Load profile (only when signed in) ──────────────────────
  useEffect(() => {
    if (!user) {
      setProfileLoading(false);
      setProfile(null);
      return;
    }

    async function loadProfile() {
      setProfileLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username,tier,generations_used,generations_limit')
          .eq('id', user!.id)
          .single();

        if (data) {
          setProfile(data);
        } else if (error?.code === 'PGRST116') {
          const defaultProfile: Profile = {
            username: user!.user_metadata?.name || user!.user_metadata?.full_name || user!.email?.split('@')[0] || 'user',
            tier: 'free',
            generations_used: 0,
            generations_limit: 3,
          };
          setProfile(defaultProfile);

          await supabase.from('profiles').upsert({
            id: user!.id,
            username: defaultProfile.username,
            avatar_url: user!.user_metadata?.avatar_url || user!.user_metadata?.picture || null,
            tier: 'free',
            generations_used: 0,
            generations_limit: 3,
          }, { onConflict: 'id' });
        }
      } catch (err) {
        console.error('Profile load error:', err);
        setProfile({
          username: user!.email?.split('@')[0] || 'user',
          tier: 'free',
          generations_used: 0,
          generations_limit: 3,
        });
      } finally {
        setProfileLoading(false);
      }
    }

    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── Reimagine: opens the Creation Wizard (or sign-in) ───────
  function handleReimagine(mediaItem: MediaItem) {
    if (!user) {
      handleSignIn();
      return;
    }
    setWizardMedia(mediaItem);
    setShowWizard(true);
  }

  // ── Navigate from Discover → Studio (or sign-in) ───────────
  function handleNavigateToStudio(showName: string, category: string) {
    if (!user) {
      handleSignIn();
      return;
    }
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

  // ── Render current tab content ──────────────────────────────
  function renderTab() {
    // Auth-gated tabs show sign-in prompt when not logged in
    if (!user && AUTH_REQUIRED_TABS.has(tab)) {
      const tabLabel = NAV.find(n => n.id === tab)?.label || tab;
      return <SignInPrompt tabName={tabLabel} onSignIn={handleSignIn} />;
    }

    switch (tab) {
      case 'discover':
        return <DiscoverTab user={user} profile={profile} onNavigateToStudio={handleNavigateToStudio} onReimagine={handleReimagine} />;
      case 'studio':
        return user ? <StudioTab user={user} profile={profile} onProfileUpdate={setProfile} preselectedShow={studioShowName} preselectedCategory={studioCategory} /> : null;
      case 'ghostface':
        return <GhostfaceBrain />;
      case 'wallet':
        return user ? <WalletTab /> : null;
      case 'settings':
        return user ? <SettingsTab user={user} profile={profile} onSignOut={() => supabase.auth.signOut()} /> : null;
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">

      {/* ── Creation Wizard Overlay ────────────────────────────── */}
      {showWizard && wizardMedia && user && (
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
          {user ? (
            <>
              <span className="text-xs text-muted hidden sm:block">
                {profileLoading ? '...' : profile?.tier === 'free'
                  ? `${genLeft} free gen${genLeft !== 1 ? 's' : ''}`
                  : `${profile?.tier} plan`}
              </span>
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rip to-purple flex items-center justify-center text-white text-xs font-bold cursor-pointer"
                onClick={() => setTab('settings')}>
                {profile?.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
              </div>
            </>
          ) : (
            <button
              onClick={handleSignIn}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #ff2d78, #a855f7)' }}
            >
              <span>🚀</span>
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className={`mx-auto py-6 pb-28 ${tab === 'studio' ? 'max-w-6xl px-4 sm:px-6' : 'max-w-5xl px-4 sm:px-6'}`}>
          {renderTab()}
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
