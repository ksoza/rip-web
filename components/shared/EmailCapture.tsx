'use client';
// components/shared/EmailCapture.tsx
// Email capture banner — collects emails for launch list
// Stores in Supabase `email_subscribers` table
import { useState } from 'react';

interface Props {
  variant?: 'banner' | 'inline';
}

export function EmailCapture({ variant = 'banner' }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || status === 'loading') return;

    setStatus('loading');
    try {
      const res = await fetch('/api/email/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setMessage(data.message || 'You\'re on the list! 🎉');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong');
      }
    } catch {
      setStatus('error');
      setMessage('Network error — try again');
    }
  }

  if (status === 'success') {
    return (
      <div className={`${variant === 'banner' ? 'py-4 px-6' : 'py-3 px-4'} bg-gradient-to-r from-emerald-900/40 to-emerald-800/20 border border-emerald-500/30 rounded-xl text-center`}>
        <p className="text-emerald-400 font-semibold text-sm">✅ {message}</p>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 w-full max-w-md">
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setStatus('idle'); }}
          placeholder="your@email.com"
          required
          className="flex-1 px-4 py-2.5 bg-[#0c0c14] border border-[#1c1c28] rounded-lg text-white text-sm placeholder:text-[#333] focus:border-rip/50 focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-5 py-2.5 rounded-lg font-bold text-sm text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 whitespace-nowrap"
          style={{ background: 'linear-gradient(135deg, #ff2d78, #a855f7)' }}
        >
          {status === 'loading' ? '...' : 'Join Waitlist'}
        </button>
        {status === 'error' && (
          <p className="text-red-400 text-xs mt-1 sm:mt-0 sm:self-center">{message}</p>
        )}
      </form>
    );
  }

  // Banner variant
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#1c1c28] bg-gradient-to-br from-[#0a0a14] via-[#0c0c18] to-[#0e0a16]">
      {/* Glow accents */}
      <div className="absolute top-0 left-1/4 w-32 h-32 bg-rip/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-24 h-24 bg-purple/10 rounded-full blur-3xl" />

      <div className="relative p-6 sm:p-8 text-center">
        <div className="text-3xl mb-3">🚀</div>
        <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
          Get Early Access
        </h3>
        <p className="text-muted text-sm mb-5 max-w-sm mx-auto">
          Be first to know when new features drop. AI video, NFT minting, $RiP staking — straight to your inbox.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setStatus('idle'); }}
            placeholder="your@email.com"
            required
            className="flex-1 px-4 py-3 bg-[#0c0c14] border border-[#1c1c28] rounded-xl text-white text-sm placeholder:text-[#333] focus:border-rip/50 focus:outline-none transition-colors min-w-0"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="px-6 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg, #ff2d78, #a855f7)' }}
          >
            {status === 'loading' ? 'Joining...' : 'Join the List'}
          </button>
        </form>

        {status === 'error' && (
          <p className="text-red-400 text-xs mt-2">{message}</p>
        )}

        <p className="text-[#333] text-xs mt-4">
          No spam ever. Unsubscribe anytime.
        </p>
      </div>
    </div>
  );
}
