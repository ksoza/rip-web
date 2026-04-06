// app/layout.tsx
import type { Metadata } from 'next';
import { Bebas_Neue, Instrument_Sans, DM_Mono, UnifrakturMaguntia } from 'next/font/google';
import { SolanaWalletProvider } from '@/lib/solana/wallet-provider';
import { Analytics } from '@vercel/analytics/next';
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
  description: 'The world\'s first AI fan studio. Generate scripts, characters, scenes, video, and audio for any TV show, movie, or anime. Mint as NFTs on Solana. Powered by Claude AI, Grok, Luma, Runway, ElevenLabs.',
  keywords:    ['fan fiction', 'AI', 'remix', 'TV show', 'anime', 'movie', 'crypto', '$RIP', 'NFT', 'Solana', 'video generation', 'AI studio', 'AI video', 'fan content', 'ReMiX IP'],
  openGraph: {
    title:       'RiP — Remix I.P. | AI Fan Studio',
    description: 'Any IP. Your Vision. Generate scripts, video, audio — then mint as NFTs. Powered by 10+ AI models.',
    type:        'website',
    url:         'https://www.remixip.icu',
    siteName:    'RiP — Remix I.P.',
    images: [
      {
        url:    'https://www.remixip.icu/og-image.png',
        width:  1200,
        height: 630,
        alt:    'ReMiX IP — AI Fan Studio',
      }
    ],
  },
  twitter: {
    card:    'summary_large_image',
    title:   'RiP — Remix I.P. | AI Fan Studio',
    description: 'AI Fan Studio — scripts, video, audio, NFTs. Any IP, Your Vision.',
    creator: '@RiPRemixIP',
    images:  ['https://www.remixip.icu/og-image.png'],
  },
  metadataBase: new URL('https://www.remixip.icu'),
  alternates: {
    canonical: 'https://www.remixip.icu',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover' as const,
  themeColor: '#060608',
};

// JSON-LD Structured Data
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'ReMiX IP',
  alternateName: 'RiP — Remix I.P.',
  url: 'https://www.remixip.icu',
  description: 'AI-powered fan studio for creating remixes of TV shows, movies, and anime. Generate scripts, video, audio, and mint as NFTs on Solana.',
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free to start — credits for AI generation',
  },
  creator: {
    '@type': 'Organization',
    name: 'ReMiX I.P.',
    url: 'https://www.remixip.icu',
  },
  featureList: [
    'AI Script Generation',
    'AI Video Generation',
    'AI Audio & Voice Cloning',
    'NFT Minting on Solana',
    'Character Lip Sync',
    'Scene Composition Studio',
    '$RiP Token Staking',
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bebas.variable} ${instrument.variable} ${mono.variable} ${oldEnglish.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ReMiX IP" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="manifest" href="/manifest.json" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-bg text-white font-body antialiased overscroll-y-contain" suppressHydrationWarning>
        <SolanaWalletProvider>
          {children}
        </SolanaWalletProvider>
        <Analytics />
      </body>
    </html>
  );
}
