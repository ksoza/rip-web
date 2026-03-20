// app/layout.tsx
import type { Metadata } from 'next';
import { Bebas_Neue, Instrument_Sans, DM_Mono } from 'next/font/google';
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

export const metadata: Metadata = {
  title:       'RiP — Remix I.P. | AI Fan Studio',
  description: 'Remix any TV show, movie, anime, cartoon or news show with AI. Generate scripts, scenes, alternate endings and more. Powered by $RIP ☽',
  keywords:    ['fan fiction', 'AI', 'remix', 'TV show', 'anime', 'movie', 'crypto', '$RIP'],
  openGraph: {
    title:       'RiP — Remix I.P.',
    description: 'AI Fan Studio — Any IP, Your Vision',
    type:        'website',
    url:         'https://remixip.com',
  },
  twitter: {
    card:    'summary_large_image',
    title:   'RiP — Remix I.P.',
    creator: '@RiPRemixIP',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bebas.variable} ${instrument.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="bg-bg text-white font-body antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
