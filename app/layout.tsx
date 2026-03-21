// app/layout.tsx
import type { Metadata } from 'next';
import { Bebas_Neue, Instrument_Sans, DM_Mono, UnifrakturMaguntia } from 'next/font/google';
import './globals.css';

const bebas = Bebas_Neue({
  weight:   ['400'],
  subsets:  ['latin'],
  variable: '--font-bebas',
  display:  'swap',
});

const instrument = Instrument_Sans({
  subsets:  ['latin'],
  variable: '--font-instrument',
  display:  'swap',
});

const mono = DM_Mono({
  weight:   ['400', '500'],
  subsets:  ['latin'],
  variable: '--font-mono',
  display:  'swap',
});

const oldEnglish = UnifrakturMaguntia({
  weight:   ['400'],
  subsets:  ['latin'],
  variable: '--font-oldenglish',
  display:  'swap',
});

export const metadata: Metadata = {
  title:       'RiP — Remix I.P. | AI Fan Studio',
  description: 'The world\'s first AI fan studio. Generate scripts, characters, scenes, video, and audio for any TV show, movie, or anime. Mint as NFTs on Solana & XRPL. Powered by Claude AI, Grok, Luma, Runway, ElevenLabs.',
  keywords:    ['fan fiction', 'AI', 'remix', 'TV show', 'anime', 'movie', 'crypto', '$RIP', 'NFT', 'Solana', 'XRPL', 'video generation', 'AI studio'],
  openGraph: {
    title:       'RiP — Remix I.P. | AI Fan Studio',
    description: 'Any IP. Your Vision. Generate scripts, video, audio — then mint as NFTs. Powered by 10+ AI models.',
    type:        'website',
    url:         'https://www.remixip.icu',
    siteName:    'RiP — Remix I.P.',
  },
  twitter: {
    card:    'summary_large_image',
    title:   'RiP — Remix I.P.',
    description: 'AI Fan Studio — scripts, video, audio, NFTs. Any IP, Your Vision.',
    creator: '@RiPRemixIP',
  },
  metadataBase: new URL('https://www.remixip.icu'),
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover' as const,
  themeColor: '#060608',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bebas.variable} ${instrument.variable} ${mono.variable} ${oldEnglish.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="bg-bg text-white font-body antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
