// app/create/page.tsx
// Dedicated creation page — wizard runs here, NOT as an overlay on the landing page.
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase';
import { CreationWizard } from '@/components/create/CreationWizard';
import type { MediaItem } from '@/components/create/CreationWizard';
import type { User } from '@supabase/supabase-js';

export default function CreatePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = createSupabaseBrowser();

    // Get session
    sb.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          // Not signed in — bounce to home
          router.replace('/');
          return;
        }
      })
      .catch(() => {
        router.replace('/');
      })
      .finally(() => {
        setLoading(false);
      });

    // Listen for auth changes
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (_event === 'SIGNED_OUT') {
        router.replace('/');
      }
    });

    // Read media selection from sessionStorage
    try {
      const stored = sessionStorage.getItem('rip_create_media');
      if (stored) {
        setMedia(JSON.parse(stored));
        // Clear after reading so refreshing doesn't replay stale data
        sessionStorage.removeItem('rip_create_media');
      }
    } catch {
      // Ignore parse errors
    }

    return () => subscription.unsubscribe();
  }, [router]);

  // Handle wizard close → go back to landing page
  function handleClose() {
    router.push('/');
  }

  // Handle wizard complete → go to studio
  function handleOpenEditor(resultData: any) {
    // Store result for studio to pick up
    try {
      sessionStorage.setItem('rip_studio_result', JSON.stringify({
        showName: resultData.media?.title || '',
        category: resultData.media?.category || '',
      }));
    } catch {
      // Ignore
    }
    router.push('/?page=studio');
  }

  // Handle publish from wizard
  function handlePublish(data: {
    title?: string; description?: string; thumbnail?: string;
    mediaUrl?: string; show?: string; genre?: string;
  }) {
    try {
      sessionStorage.setItem('rip_publish_data', JSON.stringify(data));
    } catch {
      // Ignore
    }
    router.push('/?publish=true');
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="font-display text-6xl tracking-widest mb-3">
            <span className="text-rip">R</span>
            <span className="text-white">i</span>
            <span className="text-cyan">P</span>
          </div>
          <div className="w-8 h-0.5 bg-gradient-to-r from-rip to-purple mx-auto animate-pulse" />
          <p className="text-muted text-sm mt-4">Loading creator studio...</p>
        </div>
      </div>
    );
  }

  // No user (shouldn't happen - we redirect above, but just in case)
  if (!user) {
    return null;
  }

  // No media selected — show a prompt to go back and pick something
  if (!media) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rip/20 to-purple/20 border border-rip/30 flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🎬</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            Pick something to remix
          </h2>
          <p className="text-muted text-sm mb-8">
            Head back to the home page and select a show, movie, or character to start creating.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3.5 rounded-xl font-bold text-white transition-all hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #ff2d78, #a855f7)' }}
          >
            ← Browse Content
          </button>
        </div>
      </div>
    );
  }

  // Render the wizard full-page
  return (
    <CreationWizard
      user={user}
      selectedMedia={media}
      onClose={handleClose}
      onOpenEditor={handleOpenEditor}
      onPublish={handlePublish}
    />
  );
}
