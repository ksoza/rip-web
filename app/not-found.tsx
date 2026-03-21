import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="font-display text-[120px] leading-none tracking-widest text-rip mb-4">
          404
        </div>
        <h1 className="font-display text-2xl tracking-widest text-white mb-3">
          PAGE NOT <span className="text-rip">FOUND</span>
        </h1>
        <p className="text-muted text-sm mb-8">
          This remix doesn&apos;t exist yet. Maybe you should create it.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-rip text-white font-display text-sm tracking-widest px-6 py-3 rounded-lg hover:brightness-110 transition-all"
        >
          ← BACK TO STUDIO
        </Link>
      </div>
    </div>
  );
}
