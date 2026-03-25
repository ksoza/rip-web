'use client';
// components/AllTabs.tsx — Settings and legacy tab components
import { useState, useEffect, useRef } from 'react';
import type { User } from '@supabase/supabase-js';

// ── Settings Tab ────────────────────────────────────────────────
export function SettingsTab({ user, profile, onSignOut }: {
  user: User;
  profile: { username: string; tier: string; generations_used: number; generations_limit: number } | null;
  onSignOut: () => void;
}) {
  const [copied, setCopied] = useState('');

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  }

  function Row({ label, desc, action, actionLabel, actionKey }: {
    label: string;
    desc?: string;
    action?: () => void;
    actionLabel?: string;
    actionKey?: string;
  }) {
    return (
      <div className="flex items-center bg-bg2 border border-border rounded-xl px-4 py-3 gap-4 mb-2">
        <div className="flex-1">
          <div className="text-sm font-semibold text-white">{label}</div>
          {desc && <div className="text-xs text-muted mt-0.5 break-all">{desc}</div>}
        </div>
        {action && actionLabel && (
          <button
            onClick={action}
            className={`text-xs border rounded-lg px-3 py-1.5 transition-colors shrink-0 ${
              copied === actionKey
                ? 'border-lime text-lime'
                : 'border-bord2 text-muted hover:border-rip hover:text-rip'
            }`}
          >
            {copied === actionKey ? '✓ Copied' : actionLabel}
          </button>
        )}
      </div>
    );
  }

  const genLeft = profile ? profile.generations_limit - profile.generations_used : 0;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-4xl tracking-widest text-white">
          SET<span className="text-rip">TINGS</span>
        </h1>
        <p className="text-muted text-sm mt-1">Account configuration and preferences</p>
      </div>

      {/* Account Info */}
      <div>
        <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Account</div>
        <Row label="Email" desc={user.email || '—'} />
        <Row label="Username" desc={profile?.username || '—'} />
        <Row
          label="Plan"
          desc={`${(profile?.tier || 'free').charAt(0).toUpperCase() + (profile?.tier || 'free').slice(1)} · ${genLeft} generation${genLeft !== 1 ? 's' : ''} remaining`}
        />
        <Row
          label="Referral Link"
          desc={`remixip.icu/ref/${profile?.username || 'you'}`}
          action={() => copy(`https://remixip.icu/ref/${profile?.username || 'you'}`, 'referral')}
          actionLabel="Copy"
          actionKey="referral"
        />
      </div>

      {/* Upgrade CTA */}
      {profile?.tier === 'free' && (
        <div className="bg-gradient-to-r from-[#0d0408] to-[#080410] border border-[#3a0a2a] rounded-xl p-5">
          <h3 className="font-display text-lg tracking-wider text-white mb-2">
            ⚡ UPGRADE FOR MORE
          </h3>
          <p className="text-xs text-muted leading-relaxed mb-3">
            Get 30+ generations, voice TTS, video creation, timeline editor, and NFT minting.
          </p>
          <div className="flex gap-2">
            <div className="flex-1 text-center bg-bg3 rounded-lg py-2 border border-border">
              <div className="font-display text-lg text-white">$1<span className="text-xs text-muted">/wk</span></div>
              <div className="text-[9px] text-muted">Starter</div>
            </div>
            <div className="flex-1 text-center bg-bg3 rounded-lg py-2 border border-rip">
              <div className="font-display text-lg text-rip">$5<span className="text-xs text-muted">/mo</span></div>
              <div className="text-[9px] text-rip">Creator</div>
            </div>
            <div className="flex-1 text-center bg-bg3 rounded-lg py-2 border border-border">
              <div className="font-display text-lg text-white">$10<span className="text-xs text-muted">/mo</span></div>
              <div className="text-[9px] text-muted">Studio</div>
            </div>
          </div>
        </div>
      )}

      {/* Referral Program */}
      <div>
        <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Referral Program</div>
        <div className="bg-bg2 border border-border rounded-xl p-4 mb-2">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-lime/10 flex items-center justify-center text-lg">🎁</div>
            <div>
              <p className="text-sm font-bold text-white">Invite Friends, Earn Rewards</p>
              <p className="text-[10px] text-muted">Get 20% of their first payment as credit</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-bg3 rounded-lg py-2 text-center">
              <div className="font-display text-lg text-white">—</div>
              <div className="text-[8px] text-muted">Referred</div>
            </div>
            <div className="bg-bg3 rounded-lg py-2 text-center">
              <div className="font-display text-lg text-lime">$0</div>
              <div className="text-[8px] text-muted">Earned</div>
            </div>
            <div className="bg-bg3 rounded-lg py-2 text-center">
              <div className="font-display text-lg text-cyan">5</div>
              <div className="text-[8px] text-muted">Bonus Gens</div>
            </div>
          </div>
          <p className="text-[9px] text-muted text-center">
            New users who sign up with your link also get 5 bonus generations!
          </p>
        </div>
      </div>

      {/* Legal */}
      <div>
        <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Legal</div>
        <Row label="Content Policy" desc="All content is fan-made and transformative. Not affiliated with any IP owners." />
        <Row label="App Version" desc="RiP Web v1.0.0 · remixip.icu" />
      </div>

      {/* Sign Out */}
      <button
        onClick={onSignOut}
        className="w-full py-3 rounded-xl text-sm font-bold text-muted border border-border hover:border-rip hover:text-rip transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}
