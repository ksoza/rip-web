'use client';
// components/AppShell.tsx
// Main app shell - hamburger navigation, 6 pages, legal agreement gate
// Updated: wired ReferralBanner, RxTVFeed, RxMoviesFeed, PublishFlow, Phases 3-6
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createSupabaseBrowser } from '@/lib/supabase';

// Navigation
import { HamburgerNav, PAGES } from './nav/HamburgerNav';
import type { PageId } from './nav/HamburgerNav';

// Pages
import { RemixrHome } from './remixr/RemixrHome';
import { StudioTab }    from './studio/StudioTab';
import { WalletTab }    from './wallet/WalletTab';
import { SettingsTab }  from './AllTabs';
import { RipLogo }      from './RipLogo';

// Discover feeds (Phase 3B)
import { RxTVFeed }     from './discover/RxTVFeed';
import { RxMoviesFeed } from './discover/RxMoviesFeed';

// Publish (Phase 3)
import { PublishFlow } from './publish/PublishFlow';

// Referral (Phase 6)
import { ReferralBanner } from './referral/ReferralBanner';

// Creation — wizard now lives at /create, just need the type
import type { MediaItem }  from './create/CreationWizard';

// Legal
import { UserContentAgreement } from './legal/UserContentAgreement';

// -- Types -------------------------------------------------------
type Profile = {
  username:           string;
  tier:               string;
  generations_used:   number;
  generations_limit:  number;
  content_agreement:  boolean;
};

// -- Auth-gated sign-in prompt -----------------------------------
function SignInPrompt({ pageName, onSignIn }: { pageName: string; onSignIn: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rip/20 to-purple/20 border border-rip/30 flex items-center justify-center mb-6">
        <span className="text-4xl"></span>
      </div>
      <h2 className="text-2xl font-bold text-white mb-3">
        Sign in to access {pageName}
      </h2>
      <p className="text-muted text-sm max-w-md mb-8">
        Create remixes, mint NFTs, manage your wallet, and unlock the full power of ReMixr.
        Free to sign up - takes 5 seconds.
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
    </div>
  );
}

// ---------------------------------------------------------------
//  MAIN APP SHELL
// ---------------------------------------------------------------
export function AppShell({ user }: { user: User | null }) {
  const router = useRouter();
  const [page, setPage]                       = useState<PageId>('remixr');
  const [profile, setProfile]                 = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading]   = useState(true);
  const [showAgreement, setShowAgreement]     = useState(false);
  const [pendingMedia, setPendingMedia]       = useState<MediaItem | null>(null);
  // Publish flow (Phase 3)
  const [showPublish, setShowPublish]         = useState(false);
  const [publishData, setPublishData]         = useState<{
    title?: string; description?: string; thumbnail?: string;
    mediaUrl?: string; show?: string; genre?: string;
  } | undefined>(undefined);
  // Studio pre-selection
  const [studioShowName, setStudioShowName]   = useState('');
  const [studioCategory, setStudioCategory]   = useState('');

  const supabase = createSupabaseBrowser();

  // -- Check URL params for returning from /create ---------------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('page') === 'studio') {
      setPage('studio');
      try {
        const result = sessionStorage.getItem('rip_studio_result');
        if (result) {
          const { showName, category } = JSON.parse(result);
          if (showName) setStudioShowName(showName);
          if (category) setStudioCategory(category);
          sessionStorage.removeItem('rip_studio_result');
        }
      } catch { /* ignore */ }
      // Clean URL
      window.history.replaceState({}, '', '/');
    }
    if (params.get('publish') === 'true') {
      try {
        const data = sessionStorage.getItem('rip_publish_data');
        if (data) {
          setPublishData(JSON.parse(data));
          setShowPublish(true);
          sessionStorage.removeItem('rip_publish_data');
        }
      } catch { /* ignore */ }
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // -- Google Sign In ------------------------------------------
  async function handleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  // -- Navigate to Studio from feeds ---------------------------
  // -- Open Publish Flow from Studio ---------------------------
  function handlePublish(data: {
    title?: string; description?: string; thumbnail?: string;
    mediaUrl?: string; show?: string; genre?: string;
  }) {
    setPublishData(data);
    setShowPublish(true);
  }

  function handleNavigateToStudio(showName: string, category: string) {
    setStudioShowName(showName);
    setStudioCategory(category);
    setPage('studio');
  }

  // -- Load profile --------------------------------------------
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
          .select('username,tier,generations_used,generations_limit,content_agreement')
          .eq('id', user!.id)
          .single();

        if (data) {
          setProfile({
            ...data,
            content_agreement: data.content_agreement ?? false,
          });
        } else if (error?.code === 'PGRST116') {
          // New user - create profile
          const defaultProfile: Profile = {
            username: user!.user_metadata?.name || user!.user_metadata?.full_name || user!.email?.split('@')[0] || 'user',
            tier: 'free',
            generations_used: 0,
            generations_limit: 10,
            content_agreement: false,
          };
          setProfile(defaultProfile);

          await supabase.from('profiles').upsert({
            id: user!.id,
            username: defaultProfile.username,
            avatar_url: user!.user_metadata?.avatar_url || user!.user_metadata?.picture || null,
            tier: 'free',
            generations_used: 0,
            generations_limit: 10,
            content_agreement: false,
          }, { onConflict: 'id' });
        }
      } catch (err) {
        console.error('Profile load error:', err);
        setProfile({
          username: user!.email?.split('@')[0] || 'user',
          tier: 'free',
          generations_used: 0,
          generations_limit: 10,
          content_agreement: false,
        });
      } finally {
        setProfileLoading(false);
      }
    }

    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // -- Handle media selection (with legal gate) ----------------
  function handleSelectMedia(media: MediaItem) {
    if (!user) {
      handleSignIn();
      return;
    }

    // Check if user has accepted the content agreement
    if (!profile?.content_agreement) {
      setPendingMedia(media);
      setShowAgreement(true);
      return;
    }

    // Store media in sessionStorage and navigate to /create
    try {
      sessionStorage.setItem('rip_create_media', JSON.stringify(media));
    } catch { /* ignore */ }
    router.push('/create');
  }

  // -- Handle agreement acceptance -----------------------------
  async function handleAcceptAgreement() {
    if (!user) return;

    // Save to Supabase
    await supabase.from('profiles').update({
      content_agreement: true,
      content_agreement_date: new Date().toISOString(),
    }).eq('id', user.id);

    // Update local profile
    setProfile(prev => prev ? { ...prev, content_agreement: true } : prev);
    setShowAgreement(false);

    // Continue to /create if there was a pending media selection
    if (pendingMedia) {
      try {
        sessionStorage.setItem('rip_create_media', JSON.stringify(pendingMedia));
      } catch { /* ignore */ }
      setPendingMedia(null);
      router.push('/create');
    }
  }

  function handleDeclineAgreement() {
    setShowAgreement(false);
    setPendingMedia(null);
  }

  // handleOpenEditor removed — wizard now lives at /create and navigates back via router

  // -- Render current page -------------------------------------
  function renderPage() {
    const pageConfig = PAGES.find(p => p.id === page);

    // Auth-gated pages
    if (pageConfig?.requiresAuth && !user) {
      return <SignInPrompt pageName={pageConfig.label} onSignIn={handleSignIn} />;
    }

    switch (page) {
      case 'remixr':
        return (
          <RemixrHome
            user={user}
            onSelectMedia={handleSelectMedia}
            onViewContent={(item) => {
              // TODO: Navigate to content viewer
              console.log('View content:', item);
            }}
          />
        );
      case 'studio':
        return user ? (
          <StudioTab
            user={user}
            profile={profile}
            onProfileUpdate={setProfile as any}
            preselectedShow={studioShowName}
            preselectedCategory={studioCategory}
            onPublish={handlePublish}
          />
        ) : null;
      case 'rxtv':
        return (
          <RxTVFeed
            user={user}
            onNavigateToStudio={handleNavigateToStudio}
          />
        );
      case 'rxmovies':
        return (
          <RxMoviesFeed
            user={user}
            onNavigateToStudio={handleNavigateToStudio}
          />
        );
      case 'wallet':
        return user ? <WalletTab user={user} /> : null;
      case 'settings':
        return user ? (
          <SettingsTab
            user={user}
            profile={profile}
            onSignOut={() => supabase.auth.signOut()}
          />
        ) : null;
      default:
        return null;
    }
  }

  const genLeft = profile
    ? (profile.generations_limit === -1 ? '\u221E' : Math.max(0, profile.generations_limit - profile.generations_used))
    : 0;

  return (
    <div className="min-h-screen bg-bg flex flex-col">

      {/* -- Legal Agreement Modal ------------------------------ */}
      {showAgreement && (
        <UserContentAgreement
          onAccept={handleAcceptAgreement}
          onDecline={handleDeclineAgreement}
        />
      )}

      {/* -- Creation Wizard now at /create (no longer an overlay) */}

      {/* -- Publish Flow Modal (Phase 3) --------------------- */}
      {showPublish && user && (
        <PublishFlow
          user={user}
          onClose={() => { setShowPublish(false); setPublishData(undefined); }}
          initialData={publishData}
        />
      )}

      {/* -- Top Bar -------------------------------------------- */}
      <header className="border-b border-border bg-bg/95 backdrop-blur sticky top-0 z-50 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HamburgerNav
            currentPage={page}
            onNavigate={setPage}
            user={user}
            profile={profile}
            onSignIn={handleSignIn}
          />
          <RipLogo size="sm" />
          {/* Current page indicator (desktop) */}
          <div className="hidden sm:flex items-center gap-2 ml-3 pl-3 border-l border-border">
            <span className="text-sm">
              {PAGES.find(p => p.id === page)?.icon}
            </span>
            <span
              className="text-xs font-bold"
              style={{ color: PAGES.find(p => p.id === page)?.color }}
            >
              {PAGES.find(p => p.id === page)?.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-xs text-muted hidden sm:block">
                {profileLoading ? '...' : profile?.tier === 'free'
                  ? `${genLeft} free gen${genLeft !== 1 ? 's' : ''}`
                  : `${profile?.tier} \u00B7 unlimited`}
              </span>
              <div
                className="w-7 h-7 rounded-full bg-gradient-to-br from-rip to-purple flex items-center justify-center text-white text-xs font-bold cursor-pointer"
                onClick={() => setPage('settings')}
              >
                {profile?.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
              </div>
            </>
          ) : (
            <button
              onClick={handleSignIn}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #ff2d78, #a855f7)' }}
            >
              <span></span> Sign In
            </button>
          )}
        </div>
      </header>

      {/* -- Referral Banner (top middle, between header & content) */}
      <ReferralBanner
        user={user}
        onSignIn={handleSignIn}
        compact={page !== 'remixr'}
      />

      {/* -- Content -------------------------------------------- */}
      <main className="flex-1 overflow-y-auto">
        <div className={`mx-auto py-6 pb-8 ${page === 'studio' ? 'max-w-6xl px-4 sm:px-6' : 'max-w-5xl px-4 sm:px-6'}`}>
          {renderPage()}
        </div>
      </main>
    </div>
  );
}
