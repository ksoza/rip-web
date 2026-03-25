// app/ref/[code]/page.tsx
// Referral landing page — /ref/RIP-XXXX
// Stores referral code in localStorage and redirects to sign-up
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function ReferralLanding() {
  const router = useRouter();
  const params = useParams();
  const code = params?.code as string || '';
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (code) {
      // Store referral code for sign-up flow
      localStorage.setItem('rip_referral_code', code);
      localStorage.setItem('rip_referral_ts', Date.now().toString());
      setSaved(true);
    }
  }, [code]);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* RiP Logo */}
        <div className="mb-8">
          <h1 className="font-display text-6xl tracking-widest text-white mb-2">
            R<span className="text-rip">i</span>P
          </h1>
          <p className="text-xs text-muted uppercase tracking-[0.3em]">AI Fan Studio</p>
        </div>

        {/* Referral Card */}
        <div className="bg-bg2 border border-rip/30 rounded-2xl p-6 mb-6">
          <div className="text-4xl mb-3">🎁</div>
          <h2 className="font-display text-2xl text-white mb-2">
            You&apos;ve been invited!
          </h2>
          <p className="text-sm text-muted leading-relaxed mb-4">
            A friend invited you to RiP — the AI Fan Studio where you can create
            remixed episodes, scenes, and content for your favorite shows.
          </p>
          
          <div className="bg-lime/10 border border-lime/30 rounded-xl p-3 mb-4">
            <p className="text-sm font-bold text-lime">🎉 Sign up and get 5 bonus generations!</p>
            <p className="text-[10px] text-lime/60 mt-0.5">Referral code: {code}</p>
          </div>

          {saved && (
            <p className="text-[10px] text-lime mb-4">✓ Referral code saved</p>
          )}
        </div>

        {/* CTA Buttons */}
        <button
          onClick={() => router.push('/')}
          className="w-full py-4 rounded-xl font-bold text-white text-lg transition hover:brightness-110 hover:scale-[1.02] active:scale-95 mb-3"
          style={{ background: 'linear-gradient(90deg, #ff2d78, #a855f7)' }}
        >
          ☽ Start Creating
        </button>
        
        <p className="text-[10px] text-muted mt-3">
          Free to browse • 3 free generations • No credit card needed
        </p>
      </div>
    </div>
  );
}
