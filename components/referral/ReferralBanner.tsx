'use client';
// components/referral/ReferralBanner.tsx
// Referral banner — sits top-middle of homepage & ReMiXr page
// Eye-catching gradient bar with referral link, copy, share, and reward preview
// Ryhme spec: "laced top middle of homepage/ReMiXr page"

import { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';

// ── Types ───────────────────────────────────────────────────────
interface ReferralBannerProps {
  user: User | null;
  onSignIn?: () => void;
  onOpenDashboard?: () => void;
  compact?: boolean;           // Slim version for inner pages
  className?: string;
}

interface ReferralStats {
  referralCode: string;
  referralLink: string;
  stats: {
    totalReferrals: number;
    totalCredits: number;
    pendingCredits: number;
    claimedCredits: number;
    maxReferrals: number;
  };
}

// ── Constants ───────────────────────────────────────────────────
const SHARE_PLATFORMS = [
  { id: 'twitter',   icon: '𝕏',  label: 'X / Twitter', color: '#000000' },
  { id: 'telegram',  icon: '✈️', label: 'Telegram',    color: '#0088cc' },
  { id: 'whatsapp',  icon: '💬', label: 'WhatsApp',    color: '#25D366' },
  { id: 'discord',   icon: '🎮', label: 'Discord',     color: '#5865F2' },
  { id: 'reddit',    icon: '🔴', label: 'Reddit',      color: '#FF4500' },
] as const;

const REWARD_TIERS = [
  { count: 5,   reward: 'Bronze ReMiXr',  icon: '🥉', bonus: '+10 free generations' },
  { count: 15,  reward: 'Silver ReMiXr',  icon: '🥈', bonus: '+50 free gens + badge' },
  { count: 30,  reward: 'Gold ReMiXr',    icon: '🥇', bonus: '+200 gens + NFT drop' },
  { count: 50,  reward: 'Platinum ReMiXr',icon: '💎', bonus: '1 month Pro free' },
  { count: 100, reward: 'Diamond ReMiXr', icon: '👑', bonus: 'Lifetime $RiP rewards' },
];

// ── Component ───────────────────────────────────────────────────
export function ReferralBanner({
  user,
  onSignIn,
  onOpenDashboard,
  compact = false,
  className = '',
}: ReferralBannerProps) {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [animatePulse, setAnimatePulse] = useState(true);

  // Fetch referral stats
  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/referral?userId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {
        // No referral code yet — that's fine
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  // Stop pulse after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setAnimatePulse(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Generate referral code if user doesn't have one
  const generateCode = useCallback(async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_code', userId: user.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setStats(prev => prev ? {
          ...prev,
          referralCode: data.referralCode,
          referralLink: data.referralLink,
        } : {
          referralCode: data.referralCode,
          referralLink: data.referralLink,
          stats: { totalReferrals: 0, totalCredits: 0, pendingCredits: 0, claimedCredits: 0, maxReferrals: 100 },
        });
      }
    } catch {} finally {
      setGenerating(false);
    }
  }, [user]);

  // Copy link to clipboard
  const copyLink = useCallback(async () => {
    if (!stats?.referralLink) return;
    try {
      await navigator.clipboard.writeText(stats.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement('textarea');
      el.value = stats.referralLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [stats]);

  // Share link on platform
  const shareOn = useCallback((platformId: string) => {
    if (!stats) return;
    const link = stats.referralLink;
    const text = encodeURIComponent('🎬 Create AI movies, shows & music with ReMiX I.P.! Join free and get bonus generations →');
    const encodedLink = encodeURIComponent(link);

    const urls: Record<string, string> = {
      twitter:  `https://twitter.com/intent/tweet?text=${text}&url=${encodedLink}`,
      telegram: `https://t.me/share/url?url=${encodedLink}&text=${text}`,
      whatsapp: `https://wa.me/?text=${text}%20${encodedLink}`,
      discord:  `https://discord.com/channels/@me`,
      reddit:   `https://reddit.com/submit?url=${encodedLink}&title=${text}`,
    };

    const url = urls[platformId];
    if (url) window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
    setShowShare(false);
  }, [stats]);

  // Calculate next tier
  const currentCount = stats?.stats.totalReferrals || 0;
  const nextTier = REWARD_TIERS.find(t => t.count > currentCount) || REWARD_TIERS[REWARD_TIERS.length - 1];
  const currentTier = [...REWARD_TIERS].reverse().find(t => t.count <= currentCount);
  const progressPct = nextTier ? Math.min(100, (currentCount / nextTier.count) * 100) : 100;

  if (dismissed) return null;

  // ── Signed-out state ──────────────────────────────────────────
  if (!user) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <div
          className="mx-auto px-4 sm:px-6 py-3 flex items-center justify-center gap-3 cursor-pointer group"
          onClick={onSignIn}
          style={{
            background: 'linear-gradient(135deg, rgba(255,45,120,0.15) 0%, rgba(168,85,247,0.15) 50%, rgba(255,45,120,0.15) 100%)',
            borderBottom: '1px solid rgba(255,45,120,0.2)',
          }}
        >
          <span className="text-lg">🎁</span>
          <span className="text-sm text-white/90 font-medium group-hover:text-white transition-colors">
            <span className="font-bold text-rip">Sign up</span> and earn rewards for every friend you invite!
          </span>
          <span className="text-xs bg-rip/20 text-rip px-2 py-0.5 rounded-full font-bold border border-rip/30">
            20% credit back
          </span>
          <span className="text-white/40 text-xs hidden sm:inline">→</span>
        </div>
      </div>
    );
  }

  // ── Compact banner (for inner pages) ──────────────────────────
  if (compact && stats?.referralCode) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <div
          className="mx-auto px-4 sm:px-6 py-2 flex items-center justify-between"
          style={{
            background: 'linear-gradient(135deg, rgba(255,45,120,0.08) 0%, rgba(168,85,247,0.08) 100%)',
            borderBottom: '1px solid rgba(255,45,120,0.12)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs">🔗</span>
            <code className="text-xs font-mono text-rip/80 bg-rip/10 px-2 py-0.5 rounded">
              {stats.referralCode}
            </code>
            <span className="text-xs text-muted hidden sm:inline">
              {currentCount} referral{currentCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyLink}
              className="text-xs px-2 py-1 rounded bg-rip/10 text-rip hover:bg-rip/20 transition-colors font-medium"
            >
              {copied ? '✓ Copied' : 'Copy Link'}
            </button>
            {onOpenDashboard && (
              <button
                onClick={onOpenDashboard}
                className="text-xs text-muted hover:text-white transition-colors"
              >
                Stats →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Full banner (homepage / ReMiXr page) ──────────────────────
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Background glow */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, rgba(255,45,120,0.12) 0%, rgba(168,85,247,0.12) 40%, rgba(59,130,246,0.08) 100%)',
          borderBottom: '1px solid rgba(255,45,120,0.2)',
        }}
      />

      {/* Animated shimmer */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,45,120,0.15), transparent)',
          animation: animatePulse ? 'shimmer 2s ease-in-out infinite' : 'none',
        }}
      />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 py-4">

        {/* Dismiss button */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-3 text-white/30 hover:text-white/60 transition-colors text-xs z-10"
          aria-label="Dismiss"
        >
          ✕
        </button>

        {/* No code yet — generate prompt */}
        {!stats?.referralCode ? (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rip/30 to-purple/30 flex items-center justify-center text-xl border border-rip/20">
                🎁
              </div>
              <div>
                <p className="text-sm font-bold text-white">Earn $RiP rewards!</p>
                <p className="text-xs text-muted">
                  Get your referral link — earn 20% credit for every friend who subscribes
                </p>
              </div>
            </div>
            <button
              onClick={generateCode}
              disabled={generating}
              className="px-5 py-2 rounded-lg text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg, #ff2d78, #a855f7)' }}
            >
              {generating ? '⏳ Generating...' : '🔗 Get My Link'}
            </button>
          </div>
        ) : (
          /* Has code — show referral bar */
          <div className="space-y-3">

            {/* Row 1: Link + Copy + Share */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Referral icon + label */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rip/30 to-purple/30 flex items-center justify-center text-lg border border-rip/20">
                  {currentTier ? currentTier.icon : '🔗'}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-bold text-white leading-none">
                    {currentTier ? currentTier.reward : 'Refer & Earn'}
                  </p>
                  <p className="text-[10px] text-muted leading-tight mt-0.5">
                    20% credit per sub
                  </p>
                </div>
              </div>

              {/* Link display */}
              <div className="flex-1 min-w-0 flex items-center gap-2 bg-black/30 rounded-lg border border-white/10 px-3 py-2">
                <span className="text-xs text-muted shrink-0 hidden sm:inline">Your link:</span>
                <code className="text-sm font-mono text-rip truncate flex-1">
                  {stats.referralLink}
                </code>
                <button
                  onClick={copyLink}
                  className={`shrink-0 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    copied
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-rip/15 text-rip border border-rip/30 hover:bg-rip/25'
                  }`}
                >
                  {copied ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>

              {/* Share button */}
              <div className="relative">
                <button
                  onClick={() => setShowShare(!showShare)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-all hover:scale-105 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #ff2d78, #a855f7)' }}
                >
                  📤 Share
                </button>

                {/* Share dropdown */}
                {showShare && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowShare(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-xl z-50 py-2 overflow-hidden">
                      {SHARE_PLATFORMS.map(p => (
                        <button
                          key={p.id}
                          onClick={() => shareOn(p.id)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <span className="text-base w-5 text-center">{p.icon}</span>
                          <span className="font-medium">{p.label}</span>
                        </button>
                      ))}
                      <div className="border-t border-border mt-1 pt-1">
                        <button
                          onClick={copyLink}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <span className="text-base w-5 text-center">📋</span>
                          <span className="font-medium">Copy Link</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Row 2: Progress bar + stats (only if has referrals or on homepage) */}
            {!compact && (
              <div className="flex flex-col sm:flex-row items-center gap-3">
                {/* Progress to next tier */}
                <div className="flex-1 min-w-0 w-full sm:w-auto">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-muted">
                      {currentCount} / {nextTier.count} referrals → {nextTier.icon} {nextTier.reward}
                    </span>
                    <span className="text-[10px] text-rip font-bold">{nextTier.bonus}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${progressPct}%`,
                        background: 'linear-gradient(90deg, #ff2d78, #a855f7)',
                      }}
                    />
                  </div>
                </div>

                {/* Quick stats */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-center">
                    <p className="text-sm font-bold text-white">{currentCount}</p>
                    <p className="text-[10px] text-muted">Referrals</p>
                  </div>
                  <div className="w-px h-6 bg-white/10" />
                  <div className="text-center">
                    <p className="text-sm font-bold text-green-400">
                      ${(stats.stats.totalCredits || 0).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-muted">Earned</p>
                  </div>
                  {stats.stats.pendingCredits > 0 && (
                    <>
                      <div className="w-px h-6 bg-white/10" />
                      <div className="text-center">
                        <p className="text-sm font-bold text-amber-400">
                          ${stats.stats.pendingCredits.toFixed(2)}
                        </p>
                        <p className="text-[10px] text-muted">Pending</p>
                      </div>
                    </>
                  )}
                  {onOpenDashboard && (
                    <>
                      <div className="w-px h-6 bg-white/10" />
                      <button
                        onClick={onOpenDashboard}
                        className="text-xs text-rip hover:text-rip/80 font-bold transition-colors"
                      >
                        Dashboard →
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CSS Shimmer animation */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
