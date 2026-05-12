// app/watch/loading.tsx
export default function WatchLoading() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center">
        <img src="/rip-loading.png" alt="RiP" className="w-20 h-20 mx-auto mb-4 animate-pulse" />
        <p className="text-muted text-sm font-mono tracking-widest">LOADING CREATION…</p>
      </div>
    </div>
  );
}
