'use client';
// app/creator/error.tsx
export default function CreatorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">🎨</div>
        <h2 className="font-display text-2xl tracking-wider text-white mb-2">
          COULDN&apos;T LOAD <span className="text-rip">CREATOR</span>
        </h2>
        <p className="text-muted text-sm mb-6">
          {process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong loading this profile.'}
        </p>
        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-lg bg-rip text-white font-display text-sm tracking-widest hover:brightness-110 transition-all"
        >
          ↻ RETRY
        </button>
      </div>
    </div>
  );
}
