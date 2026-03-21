// app/error.tsx — Global error boundary
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="font-display text-6xl tracking-widest mb-4">
          <span className="text-rip">☽</span>
        </div>

        <h1 className="font-display text-3xl tracking-wider text-white mb-2">
          SOMETHING <span className="text-rip">BROKE</span>
        </h1>

        <p className="text-muted text-sm mb-6 leading-relaxed">
          The remix engine hit a snag. This has been logged.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <pre className="bg-bg2 border border-border rounded-xl p-4 mb-6 text-left text-xs text-red-400 overflow-auto max-h-40">
            {error.message}
          </pre>
        )}

        <button
          onClick={reset}
          className="inline-block px-8 py-3 rounded-xl font-display text-lg tracking-widest transition-all hover:brightness-110"
          style={{
            background: 'linear-gradient(90deg, #ff2d78, #a855f7)',
            color: 'white',
          }}
        >
          ↻ TRY AGAIN
        </button>
      </div>
    </div>
  );
}
