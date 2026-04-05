'use client';
// components/referral/ReferralDashboard.tsx
// Full referral dashboard — stats, leaderboard, referred users, reward tiers, claim flow
// Accessible from settings / wallet or via the banner's "Dashboard →" link

import { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';

// ── Types ───────────────────────────────────────────────────────
interface ReferralDashboardProps {
  user: User;
  onClose?: () => void;
}

interface ReferralEntry {
  id: string;
  referred_id: string;
  status: 'pending' | 'active' | 'expired';
  credit_awarded: number;
  credit_claimed: boolean;
  claimed_at: string | null;
  created_at: string;
  profiles?: {
    username: string;
    display_name: string;
  };
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
  referrals: ReferralEntry[];
}

// ── Constants ───────────────────────────────────────────────────
const REWARD_TIERS = [
  { count: 5,   reward: 'Bronze ReMiXr',   icon: '🥉', bonus: '+10 free generations',      color: '#CD7F32' },
  { count: 15,  reward: 'Silver ReMiXr',   icon: '🥈', bonus: '+50 free gens + badge',     color: '#C0C0C0' },
  { count: 30,  reward: 'Gold ReMiXr',     icon: '🥇', bonus: '+200 gens + NFT drop',      color: '#FFD700' },
  { count: 50,  reward: 'Platinum ReMiXr', icon: '💎', bonus: '1 month Pro free',           color: '#E5E4E2' },
  { count: 100, reward: 'Diamond ReMiXr',  icon: '👑', bonus: 'Lifetime $RiP rewards',     color: '#B9F2FF' },
];

type TabId = 'overview' | 'referrals' | 'rewards' | 'leaderboard';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview',    label: 'Overview',    icon: '📊' },
  { id: 'referrals',   label: 'My Referrals',icon: '👥' },
  { id: 'rewards',     label: 'Reward Tiers',icon: '🏆' },
  { id: 'leaderboard', label: 'Leaderboard', icon: '🔥' },
];

// ── Component ───────────────────────────────────────────────────
export function ReferralDashboard({ user, onClose }: ReferralDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Fetch data
  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/referral?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Generate code
  const generateCode = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_code', userId: user.id }),
      });
      if (res.ok) await fetchStats();
    } catch {} finally {
      setGenerating(false);
    }
  };

  // Claim credits
  const claimCredits = async () => {
    setClaiming(true);
    setClaimSuccess(false);
    try {
      const res = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim', userId: user.id }),
      });
      if (res.ok) {
        setClaimSuccess(true);
        await fetchStats();
        setTimeout(() => setClaimSuccess(false), 3000);
      }
    } catch {} finally {
      setClaiming(false);
    }
  };

  // Copy link
  const copyLink = async () => {
    if (!stats?.referralLink) return;
    try {
      await navigator.clipboard.writeText(stats.referralLink);
    } catch {
      const el = document.createElement('textarea');
      el.value = stats.referralLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Tier progress
  const totalRefs = stats?.stats.totalReferrals || 0;
  const currentTier = [...REWARD_TIERS].reverse().find(t => t.count <= totalRefs);
  const nextTier = REWARD_TIERS.find(t => t.count > totalRefs) || REWARD_TIERS[REWARD_TIERS.length - 1];
  const progressPct = nextTier ? Math.min(100, (totalRefs / nextTier.count) * 100) : 100;

  // ── Loading state ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto animate-pulse">
        <div className="h-8 w-48 bg-white/5 rounded mb-6" />
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-24 bg-white/5 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-white/5 rounded-xl" />
      </div>
    );
  }

  // ── No code yet ────────────────────────────────────────────────
  if (!stats?.referralCode) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-rip/20 to-purple/20 border border-rip/30 flex items-center justify-center mb-6">
          <span className="text-4xl">🎁</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Start Earning with Referrals</h2>
        <p className="text-muted text-sm mb-2">
          Share ReMiX I.P. with friends and earn <span className="text-rip font-bold">20% credit</span> when they subscribe.
        </p>
        <p className="text-muted text-xs mb-8">
          Plus: unlock tier rewards, exclusive NFT drops, and lifetime $RiP staking bonuses.
        </p>
        <button
          onClick={generateCode}
          disabled={generating}
          className="px-8 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #ff2d78, #a855f7)' }}
        >
          {generating ? '⏳ Generating...' : '🔗 Generate My Referral Link'}
        </button>
      </div>
    );
  }

  // ── Dashboard ──────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rip/30 to-purple/30 flex items-center justify-center text-xl border border-rip/20">
            {currentTier ? currentTier.icon : '🔗'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              Referral Dashboard
            </h2>
            <p className="text-xs text-muted">
              {currentTier ? `${currentTier.reward} • ` : ''}
              {totalRefs} referral{totalRefs !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-muted hover:text-white transition-colors text-lg">✕</button>
        )}
      </div>

      {/* Referral Link Bar */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted mb-1">Your Referral Link</p>
            <div className="flex items-center gap-2 bg-black/40 rounded-lg border border-white/10 px-3 py-2">
              <code className="text-sm font-mono text-rip truncate flex-1">{stats.referralLink}</code>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyLink}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                copied
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-rip/15 text-rip border border-rip/30 hover:bg-rip/25'
              }`}
            >
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
            <button
              onClick={() => setShareModalOpen(!shareModalOpen)}
              className="px-4 py-2.5 rounded-lg text-xs font-bold text-white hover:scale-105 active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #ff2d78, #a855f7)' }}
            >
              📤 Share
            </button>
          </div>
        </div>

        {/* Code display */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
          <span className="text-xs text-muted">Code:</span>
          <code className="text-xs font-mono font-bold text-white bg-white/5 px-2 py-0.5 rounded">{stats.referralCode}</code>
          <span className="text-xs text-muted">•</span>
          <span className="text-xs text-muted">
            {stats.stats.maxReferrals - totalRefs} slots remaining
          </span>
        </div>
      </div>

      {/* Share Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShareModalOpen(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-[360px] max-w-[90vw]"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Share Your Link</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'twitter',  icon: '𝕏',  label: 'X / Twitter' },
                { id: 'telegram', icon: '✈️', label: 'Telegram' },
                { id: 'whatsapp', icon: '💬', label: 'WhatsApp' },
                { id: 'discord',  icon: '🎮', label: 'Discord' },
                { id: 'reddit',   icon: '🔴', label: 'Reddit' },
                { id: 'email',    icon: '📧', label: 'Email' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    const link = stats.referralLink;
                    const text = encodeURIComponent('🎬 Create AI movies & shows with ReMiX I.P.! Join →');
                    const enc = encodeURIComponent(link);
                    const urls: Record<string, string> = {
                      twitter:  `https://twitter.com/intent/tweet?text=${text}&url=${enc}`,
                      telegram: `https://t.me/share/url?url=${enc}&text=${text}`,
                      whatsapp: `https://wa.me/?text=${text}%20${enc}`,
                      discord:  `https://discord.com/channels/@me`,
                      reddit:   `https://reddit.com/submit?url=${enc}&title=${text}`,
                      email:    `mailto:?subject=${text}&body=${enc}`,
                    };
                    window.open(urls[p.id], '_blank');
                    setShareModalOpen(false);
                  }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm text-white"
                >
                  <span className="text-lg">{p.icon}</span>
                  <span className="font-medium">{p.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShareModalOpen(false)}
              className="w-full mt-4 py-2 rounded-lg text-xs text-muted hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === t.id
                ? 'bg-rip/15 text-rip border border-rip/30'
                : 'text-muted hover:text-white'
            }`}
          >
            <span className="hidden sm:inline">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab: Overview ──────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Referrals', value: totalRefs.toString(), sub: `/ ${stats.stats.maxReferrals} max`, icon: '👥', color: '#fff' },
              { label: 'Total Earned',   value: `$${stats.stats.totalCredits.toFixed(2)}`, sub: '$RiP credits', icon: '💰', color: '#4ade80' },
              { label: 'Pending',        value: `$${stats.stats.pendingCredits.toFixed(2)}`, sub: 'unclaimed', icon: '⏳', color: '#fbbf24' },
              { label: 'Claimed',        value: `$${stats.stats.claimedCredits.toFixed(2)}`, sub: 'applied', icon: '✅', color: '#60a5fa' },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
                <span className="text-2xl block mb-1">{s.icon}</span>
                <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] text-muted">{s.label}</p>
                <p className="text-[10px] text-muted/60">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Claim button */}
          {stats.stats.pendingCredits > 0 && (
            <div className="bg-gradient-to-r from-amber-500/10 to-green-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">
                  You have <span className="text-amber-400">${stats.stats.pendingCredits.toFixed(2)}</span> in unclaimed rewards!
                </p>
                <p className="text-xs text-muted">Claim to apply credits to your account balance.</p>
              </div>
              <button
                onClick={claimCredits}
                disabled={claiming}
                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${
                  claimSuccess
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'text-white'
                }`}
                style={!claimSuccess ? { background: 'linear-gradient(135deg, #fbbf24, #22c55e)' } : undefined}
              >
                {claimSuccess ? '✅ Claimed!' : claiming ? '⏳ Claiming...' : '💸 Claim Credits'}
              </button>
            </div>
          )}

          {/* Tier progress */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-white">Tier Progress</p>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold border"
                style={{
                  color: currentTier?.color || '#fff',
                  borderColor: `${currentTier?.color || '#fff'}40`,
                  background: `${currentTier?.color || '#fff'}10`,
                }}>
                {currentTier ? `${currentTier.icon} ${currentTier.reward}` : '🔰 Getting Started'}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-muted mb-1">
                <span>{totalRefs} referrals</span>
                <span>{nextTier.count} for {nextTier.icon} {nextTier.reward}</span>
              </div>
              <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 relative"
                  style={{
                    width: `${progressPct}%`,
                    background: `linear-gradient(90deg, #ff2d78, ${nextTier.color})`,
                  }}
                >
                  <div className="absolute inset-0 opacity-30"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)', animation: 'shimmer 2s ease-in-out infinite' }}
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted mt-1">
                {nextTier.count - totalRefs} more referral{nextTier.count - totalRefs !== 1 ? 's' : ''} to unlock: <span className="text-rip">{nextTier.bonus}</span>
              </p>
            </div>

            {/* Tier milestones */}
            <div className="flex items-center justify-between">
              {REWARD_TIERS.map((tier) => {
                const achieved = totalRefs >= tier.count;
                return (
                  <div key={tier.count} className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all ${
                      achieved
                        ? 'border-green-500/50 bg-green-500/10'
                        : 'border-white/10 bg-white/5 opacity-40'
                    }`}>
                      {tier.icon}
                    </div>
                    <span className={`text-[9px] font-bold ${achieved ? 'text-white' : 'text-muted/50'}`}>
                      {tier.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* How it works */}
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm font-bold text-white mb-3">How Referrals Work</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { step: '1', icon: '🔗', title: 'Share Your Link', desc: 'Send your unique referral link to friends via any platform' },
                { step: '2', icon: '🎬', title: 'Friend Subscribes', desc: 'When they sign up and subscribe, you both get rewards' },
                { step: '3', icon: '💰', title: 'Earn $RiP Credits', desc: '20% of their first payment as credit + bonus generations' },
              ].map(s => (
                <div key={s.step} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-rip/10 border border-rip/20 flex items-center justify-center text-rip text-xs font-bold shrink-0">
                    {s.step}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{s.title}</p>
                    <p className="text-[10px] text-muted mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: My Referrals ──────────────────────────────────── */}
      {tab === 'referrals' && (
        <div>
          {stats.referrals.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-5xl block mb-4">👥</span>
              <p className="text-lg font-bold text-white mb-2">No referrals yet</p>
              <p className="text-sm text-muted mb-6">Share your link to start earning rewards!</p>
              <button
                onClick={copyLink}
                className="px-6 py-2 rounded-lg text-sm font-bold text-white hover:scale-105 active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg, #ff2d78, #a855f7)' }}
              >
                📋 Copy Referral Link
              </button>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-white/5 border-b border-border text-xs font-bold text-muted">
                <div className="col-span-4">User</div>
                <div className="col-span-2 text-center">Status</div>
                <div className="col-span-2 text-right">Credit</div>
                <div className="col-span-2 text-center">Claimed</div>
                <div className="col-span-2 text-right">Date</div>
              </div>
              {/* Rows */}
              {stats.referrals.map(ref => (
                <div key={ref.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-border last:border-0 items-center hover:bg-white/5 transition-colors">
                  <div className="col-span-4 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rip/30 to-purple/30 flex items-center justify-center text-xs font-bold text-white border border-rip/20">
                      {(ref.profiles?.username || ref.profiles?.display_name || '?')[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm text-white truncate">
                      {ref.profiles?.display_name || ref.profiles?.username || 'Anonymous'}
                    </span>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      ref.status === 'active'
                        ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                        : ref.status === 'pending'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-white/5 text-muted border border-white/10'
                    }`}>
                      {ref.status}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-bold text-green-400">
                      ${(ref.credit_awarded || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="col-span-2 text-center">
                    {ref.credit_claimed ? (
                      <span className="text-green-400 text-xs">✅</span>
                    ) : ref.credit_awarded > 0 ? (
                      <span className="text-amber-400 text-xs">⏳</span>
                    ) : (
                      <span className="text-muted text-xs">—</span>
                    )}
                  </div>
                  <div className="col-span-2 text-right text-xs text-muted">
                    {new Date(ref.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Reward Tiers ──────────────────────────────────── */}
      {tab === 'rewards' && (
        <div className="space-y-4">
          {REWARD_TIERS.map((tier, idx) => {
            const achieved = totalRefs >= tier.count;
            const isNext = !achieved && (idx === 0 || totalRefs >= REWARD_TIERS[idx - 1].count);
            return (
              <div
                key={tier.count}
                className={`relative bg-card border rounded-xl p-5 transition-all ${
                  achieved
                    ? 'border-green-500/30 bg-green-500/5'
                    : isNext
                      ? 'border-rip/30 bg-rip/5'
                      : 'border-border opacity-60'
                }`}
              >
                {/* Achieved badge */}
                {achieved && (
                  <div className="absolute top-3 right-3 bg-green-500/15 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-500/30">
                    ✅ Unlocked
                  </div>
                )}
                {isNext && (
                  <div className="absolute top-3 right-3 bg-rip/15 text-rip text-[10px] font-bold px-2 py-0.5 rounded-full border border-rip/30 animate-pulse">
                    🔜 Next Tier
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl border-2 shrink-0"
                    style={{
                      borderColor: `${tier.color}40`,
                      background: `${tier.color}10`,
                    }}
                  >
                    {tier.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold" style={{ color: tier.color }}>
                        {tier.reward}
                      </h3>
                      <span className="text-xs text-muted">• {tier.count} referrals</span>
                    </div>
                    <p className="text-sm text-white/80 mb-2">{tier.bonus}</p>
                    {isNext && (
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-muted mb-1">
                          <span>{totalRefs} / {tier.count}</span>
                          <span>{tier.count - totalRefs} to go</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(totalRefs / tier.count) * 100}%`,
                              background: `linear-gradient(90deg, #ff2d78, ${tier.color})`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Bonus info */}
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted text-center">
              💡 <span className="text-white font-medium">Pro tip:</span> Share on social media for maximum reach.
              Each friend who subscribes earns you <span className="text-rip font-bold">20% of their first payment</span> as $RiP credits.
              Credits stack with tier bonuses!
            </p>
          </div>
        </div>
      )}

      {/* ── Tab: Leaderboard ───────────────────────────────────── */}
      {tab === 'leaderboard' && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="text-center py-8">
            <span className="text-5xl block mb-4">🏆</span>
            <h3 className="text-lg font-bold text-white mb-2">Referral Leaderboard</h3>
            <p className="text-sm text-muted mb-6">
              Top referrers earn exclusive rewards, featured placement, and bonus $RiP tokens.
            </p>

            {/* Placeholder leaderboard */}
            <div className="max-w-sm mx-auto space-y-2 mb-6">
              {[
                { rank: '🥇', name: 'Coming Soon', refs: '—', reward: '$RiP Bonus' },
                { rank: '🥈', name: 'Coming Soon', refs: '—', reward: 'NFT Drop' },
                { rank: '🥉', name: 'Coming Soon', refs: '—', reward: 'Pro Month' },
              ].map((entry, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-3">
                  <span className="text-xl">{entry.rank}</span>
                  <span className="flex-1 text-left text-sm text-white/50">{entry.name}</span>
                  <span className="text-xs text-muted">{entry.refs}</span>
                  <span className="text-xs text-rip font-bold">{entry.reward}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted">
              Leaderboard activates when the community reaches 50+ total referrals.
              <br />Keep sharing to climb the ranks! 🚀
            </p>
          </div>
        </div>
      )}

      {/* Shimmer animation */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
