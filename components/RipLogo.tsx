'use client';

export function RipLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const config = {
    sm:  { img: 32, ripSize: '1.4rem',  remixSize: '0.4rem',  gap: 8  },
    md:  { img: 40, ripSize: '1.8rem',  remixSize: '0.5rem',  gap: 10 },
    lg:  { img: 56, ripSize: '2.8rem',  remixSize: '0.65rem', gap: 12 },
  };
  const c = config[size];

  return (
    <div className="flex items-center" style={{ gap: c.gap }}>
      {/* Coin logo — no white border */}
      <img
        src="/rip-logo.png"
        alt="RiP"
        width={c.img}
        height={c.img}
        className="rounded-full"
        style={{ display: 'block' }}
      />
      {/* Stacked text block */}
      <div className="relative flex flex-col items-center justify-center select-none" style={{ lineHeight: 1 }}>
        {/* R.I.P. in Times New Roman */}
        <span
          className="text-white"
          style={{
            fontFamily: "'Times New Roman', Georgia, serif",
            fontSize: c.ripSize,
            letterSpacing: '0.12em',
            lineHeight: 1,
            fontWeight: 700,
          }}
        >
          R.I.P.
        </span>
        {/* Thin gold divider line */}
        <div
          className="rounded-full"
          style={{
            width: '100%',
            height: 1,
            background: 'linear-gradient(90deg, transparent, #d4a842, transparent)',
            margin: `${size === 'sm' ? 1 : 2}px 0`,
          }}
        />
        {/* ReMiX iP in Times New Roman */}
        <span
          className="text-rip"
          style={{
            fontFamily: "'Times New Roman', Georgia, serif",
            fontSize: c.remixSize,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          ReMiX iP
        </span>
      </div>
    </div>
  );
}
