// app/watch/page.tsx
// Watch page route — /watch?id=<contentId>
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { WatchPage } from '@/components/watch/WatchPage';

function WatchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const contentId = searchParams.get('id') || '';

  if (!contentId) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🎬</div>
          <h1 className="font-display text-2xl text-white mb-2">No Content Selected</h1>
          <p className="text-muted text-sm mb-4">Pick something from the Discover tab to watch.</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 rounded-xl font-bold text-sm text-white transition hover:brightness-110"
            style={{ background: 'linear-gradient(90deg,#ff2d78,#a855f7)' }}
          >
            ☽ Go to Discover
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-6">
      <WatchPage
        contentId={contentId}
        onBack={() => router.back()}
        onCreatorClick={(creatorId) => router.push(`/creator?id=${creatorId}`)}
      />
    </div>
  );
}

export default function WatchRoute() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-0.5 bg-gradient-to-r from-rip to-purple mx-auto animate-pulse" />
      </div>
    }>
      <WatchPageContent />
    </Suspense>
  );
}
