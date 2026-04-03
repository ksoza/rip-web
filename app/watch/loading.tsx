// app/watch/loading.tsx
export default function WatchLoading() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-pulse text-5xl mb-4">☽</div>
        <p className="text-muted text-sm font-mono tracking-widest">LOADING CREATION…</p>
      </div>
    </div>
  );
}
