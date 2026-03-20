'use client';

export function RipLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: { img: 32, rip: '2xl', remix: '8px' }, md: { img: 40, rip: '3xl', remix: '9px' }, lg: { img: 56, rip: '5xl', remix: '11px' } };
  const d = dims[size];

  return (
    <div className="flex items-center gap-3">
      {/* Coin logo */}
      <img src="/rip-logo.jpg" alt="RiP" width={d.img} height={d.img} className="rounded-full" />
      {/* Stacked text: R.I.P. in Old English with ReMiX iP overlay */}
      <div className="relative leading-none select-none">
        <span className={`font-oldenglish text-${d.rip} text-white tracking-wider`}
          style={{ lineHeight: 1 }}>
          R.I.P.
        </span>
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap tracking-[0.15em] uppercase text-rip font-bold"
          style={{ fontFamily: "'Times New Roman', 'Georgia', serif", fontSize: d.remix, textShadow: '0 0 8px rgba(255,45,120,0.5)' }}>
          ReMiX iP
        </span>
      </div>
    </div>
  );
}
