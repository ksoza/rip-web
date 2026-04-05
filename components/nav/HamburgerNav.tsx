'use client';
// components/nav/HamburgerNav.tsx
// Hamburger slide-out navigation for ReMixr
// Pages: ReMixr, ReMix Studio, RxTV, RxMovies, Wallet, Settings
import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';

export type PageId = 'remixr' | 'studio' | 'rxtv' | 'rxmovies' | 'wallet' | 'settings';

export interface NavPage {
  id: PageId;
  label: string;
  icon: string;
  color: string;
  requiresAuth: boolean;
  description: string;
}

export const PAGES: NavPage[] = [
  { id: 'remixr',    label: 'ReMixr',       icon: '🎬', color: '#ff2d78', requiresAuth: false, description: 'Discover & create remixes' },
  { id: 'studio',    label: 'ReMix Studio',  icon: '🎨', color: '#a855f7', requiresAuth: true,  description: 'Your creation workspace' },
  { id: 'rxtv',      label: 'RxTV',          icon: '📺', color: '#00d4ff', requiresAuth: false, description: 'Remixed TV content' },
  { id: 'rxmovies',  label: 'RxMovies',      icon: '🎥', color: '#facc15', requiresAuth: false, description: 'Remixed movie content' },
  { id: 'wallet',    label: 'Wallet',        icon: '💎', color: '#8aff00', requiresAuth: true,  description: 'NFTs, $RIP & transactions' },
  { id: 'settings',  label: 'Settings',      icon: '⚙️', color: '#888',    requiresAuth: true,  description: 'Profile & preferences' },
];

interface Props {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  user: User | null;
  profile: { username: string; tier: string } | null;
  onSignIn: () => void;
}

export function HamburgerNav({ currentPage, onNavigate, user, profile, onSignIn }: Props) {
  const [open, setOpen] = useState(false);

  // Close on escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  function handleNav(page: PageId) {
    const pageConfig = PAGES.find(p => p.id === page);
    if (pageConfig?.requiresAuth && !user) {
      onSignIn();
    } else {
      onNavigate(page);
    }
    setOpen(false);
  }

  const tierColors: Record<string, string> = {
    free: '#888',
    starter: '#00d4ff',
    creator: '#a855f7',
    studio: '#ff2d78',
  };

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative z-[60] w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-xl hover:bg-white/5 transition-colors"
        aria-label="Menu"
      >
        <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${open ? 'rotate-45 translate-y-[4px]' : ''}`} />
        <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${open ? 'opacity-0 scale-0' : ''}`} />
        <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${open ? '-rotate-45 -translate-y-[4px]' : ''}`} />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-out Menu */}
      <div className={`fixed top-0 left-0 z-[58] h-full w-72 border-r border-border transform transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: '#0a0a0d', backdropFilter: 'blur(20px)' }}
      >
        <div className="flex flex-col h-full">

          {/* Logo area */}
          <div className="px-5 pt-6 pb-4 border-b border-border">
            <div className="font-display text-3xl tracking-widest">
              <span className="text-rip">R</span>
              <span className="text-white/90">e</span>
              <span className="text-cyan">M</span>
              <span className="text-white/90">ix</span>
              <span className="text-purple">r</span>
            </div>
            <p className="text-[10px] text-white/30 mt-1 tracking-wider uppercase">AI Fan Studio</p>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 overflow-y-auto py-3 px-3">
            {PAGES.map((navPage) => {
              const isActive = currentPage === navPage.id;
              const isLocked = navPage.requiresAuth && !user;

              return (
                <button
                  key={navPage.id}
                  onClick={() => handleNav(navPage.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 text-left transition-all group ${
                    isActive
                      ? 'bg-white/10'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-transform group-hover:scale-110 ${
                      isActive ? 'shadow-lg' : ''
                    }`}
                    style={{
                      background: isActive ? navPage.color + '20' : 'rgba(255,255,255,0.05)',
                      border: isActive ? `1px solid ${navPage.color}40` : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {navPage.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-bold ${isActive ? '' : 'text-white/70 group-hover:text-white'}`}
                        style={isActive ? { color: navPage.color } : {}}
                      >
                        {navPage.label}
                      </span>
                      {isLocked && (
                        <span className="text-[10px] text-white/30">🔒</span>
                      )}
                    </div>
                    <p className="text-[10px] text-white/30 truncate">{navPage.description}</p>
                  </div>
                  {isActive && (
                    <div className="w-1 h-6 rounded-full" style={{ background: navPage.color }} />
                  )}
                </button>
              );
            })}
          </nav>

          {/* User section */}
          <div className="px-4 py-4 border-t border-border">
            {user ? (
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ background: `linear-gradient(135deg, ${tierColors[profile?.tier || 'free']}, #a855f7)` }}
                >
                  {profile?.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{profile?.username || 'User'}</p>
                  <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: tierColors[profile?.tier || 'free'] }}>
                    {profile?.tier || 'free'} plan
                  </p>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { onSignIn(); setOpen(false); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #ff2d78, #a855f7)' }}
              >
                <span>🚀</span> Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
