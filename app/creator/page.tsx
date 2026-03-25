// app/creator/page.tsx
// Creator profile route — /creator?id=<creatorId>
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { CreatorProfile } from '@/components/profile/CreatorProfile';

function CreatorPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const creatorId = searchParams.get('id') || '';

  if (!creatorId) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">☽</div>
          <h1 className="font-display text-2xl text-white mb-2">Creator Not Found</h1>
          <p className="text-muted text-sm mb-4">This creator profile doesn&apos;t exist or the link is broken.</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 rounded-xl font-bold text-sm text-white transition hover:brightness-110"
            style={{ background: 'linear-gradient(90deg,#ff2d78,#a855f7)' }}
          >
            ☽ Back to Discover
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Back navigation */}
      <div className="sticky top-0 z-50 bg-bg/80 backdrop-blur border-b border-border px-4 py-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-white transition"
        >
          ← Back
        </button>
      </div>

      <CreatorProfile creatorId={creatorId} />
    </div>
  );
}

export default function CreatorRoute() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-0.5 bg-gradient-to-r from-rip to-purple mx-auto animate-pulse" />
      </div>
    }>
      <CreatorPageContent />
    </Suspense>
  );
}
