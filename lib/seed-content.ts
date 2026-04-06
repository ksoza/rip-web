// lib/seed-content.ts
// Demo content for feeds — shows realistic content before real users create
// Used by RemixrHome community carousel and feed pages

export interface SeedRemix {
  id: string;
  title: string;
  creator: string;
  creatorAvatar: string;
  thumbnailUrl: string;
  mediaType: 'video' | 'image';
  sourceIp: string;
  genre: string;
  likes: number;
  views: number;
  createdAt: string;
  duration?: string;
  description?: string;
}

// TMDB poster base for thumbnails
const TMDB = 'https://image.tmdb.org/t/p/w500';

export const SEED_REMIXES: SeedRemix[] = [
  // ── Drama / Crime Remixes ─────────────────────────────────
  {
    id: 'seed-1',
    title: 'Walter White Opens a Bakery',
    creator: 'HeisenbergFan',
    creatorAvatar: '🧪',
    thumbnailUrl: `${TMDB}/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg`,
    mediaType: 'video',
    sourceIp: 'Breaking Bad',
    genre: 'Comedy Remix',
    likes: 2847,
    views: 18420,
    createdAt: '2026-04-04T15:30:00Z',
    duration: '2:34',
    description: 'What if Walter White used his chemistry skills for baking instead?',
  },
  {
    id: 'seed-2',
    title: 'Tyrion\'s Stand-Up Special',
    creator: 'WesterosComedy',
    creatorAvatar: '🍷',
    thumbnailUrl: `${TMDB}/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg`,
    mediaType: 'video',
    sourceIp: 'Game of Thrones',
    genre: 'Comedy',
    likes: 3201,
    views: 24100,
    createdAt: '2026-04-04T12:00:00Z',
    duration: '3:12',
    description: 'Tyrion Lannister performs a full stand-up routine at the Red Keep',
  },
  {
    id: 'seed-3',
    title: 'Tony Soprano: Life Coach',
    creator: 'NJCreative',
    creatorAvatar: '🎭',
    thumbnailUrl: `${TMDB}/rTc7ZXdroqjkKivFPvCPX0Ru7uw.jpg`,
    mediaType: 'video',
    sourceIp: 'The Sopranos',
    genre: 'Comedy Remix',
    likes: 1956,
    views: 12800,
    createdAt: '2026-04-03T20:00:00Z',
    duration: '1:48',
    description: 'Tony starts a motivational YouTube channel from the Bada Bing',
  },
  // ── Anime Remixes ─────────────────────────────────────────
  {
    id: 'seed-4',
    title: 'Naruto vs Goku: Ramen Battle',
    creator: 'AnimeRemixKing',
    creatorAvatar: '🍜',
    thumbnailUrl: `${TMDB}/Asv6ornwVeMxKUdA5ySLMrgENwy.jpg`,
    mediaType: 'video',
    sourceIp: 'Naruto × Dragon Ball Z',
    genre: 'Crossover',
    likes: 5632,
    views: 41200,
    createdAt: '2026-04-05T08:00:00Z',
    duration: '4:20',
    description: 'The ultimate crossover: Naruto and Goku compete in a ramen eating contest',
  },
  {
    id: 'seed-5',
    title: 'Attack on Titan: Office Edition',
    creator: 'TitanShifter99',
    creatorAvatar: '⚔️',
    thumbnailUrl: `${TMDB}/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg`,
    mediaType: 'video',
    sourceIp: 'Attack on Titan',
    genre: 'Parody',
    likes: 4120,
    views: 32600,
    createdAt: '2026-04-04T18:00:00Z',
    duration: '2:55',
    description: 'The Survey Corps deal with corporate bureaucracy inside the walls',
  },
  {
    id: 'seed-6',
    title: 'Demon Slayer: NYC Subway',
    creator: 'SenpaiStudios',
    creatorAvatar: '🔥',
    thumbnailUrl: `${TMDB}/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg`,
    mediaType: 'video',
    sourceIp: 'Demon Slayer',
    genre: 'Modern AU',
    likes: 3890,
    views: 28900,
    createdAt: '2026-04-05T04:00:00Z',
    duration: '3:40',
    description: 'Tanjiro fights demons on the New York City subway system',
  },
  // ── Sci-Fi Remixes ────────────────────────────────────────
  {
    id: 'seed-7',
    title: 'Eleven\'s Pizza Party',
    creator: 'UpsideDownProd',
    creatorAvatar: '🧇',
    thumbnailUrl: `${TMDB}/uOOtwVbSr4QDjAGIifLDwpb2Pdl.jpg`,
    mediaType: 'video',
    sourceIp: 'Stranger Things',
    genre: 'Slice of Life',
    likes: 2340,
    views: 16700,
    createdAt: '2026-04-03T14:00:00Z',
    duration: '2:10',
    description: 'Eleven uses her powers to throw the most epic pizza party in Hawkins',
  },
  {
    id: 'seed-8',
    title: 'Neo Learns to Cook',
    creator: 'MatrixGlitch',
    creatorAvatar: '💊',
    thumbnailUrl: `${TMDB}/aOIuZAjPaRIE6CMzbazvcHuHXDc.jpg`,
    mediaType: 'video',
    sourceIp: 'The Matrix',
    genre: 'Comedy',
    likes: 1876,
    views: 14300,
    createdAt: '2026-04-02T22:00:00Z',
    duration: '1:55',
    description: 'After taking the red pill, Neo discovers the tastiest recipes in the Matrix',
  },
  // ── Comedy Remixes ────────────────────────────────────────
  {
    id: 'seed-9',
    title: 'Michael Scott at the Met Gala',
    creator: 'DunderMifflinTV',
    creatorAvatar: '👔',
    thumbnailUrl: `${TMDB}/7DJKHzAi83BmQrWLrYYOqcoKfhR.jpg`,
    mediaType: 'video',
    sourceIp: 'The Office',
    genre: 'Celebrity Remix',
    likes: 6210,
    views: 52800,
    createdAt: '2026-04-05T10:00:00Z',
    duration: '3:25',
    description: 'Michael Scott crashes the Met Gala with his own \"fashion line\"',
  },
  {
    id: 'seed-10',
    title: 'Rick Sanchez Fixes the Economy',
    creator: 'PickleRickDAO',
    creatorAvatar: '🥒',
    thumbnailUrl: `${TMDB}/WGRQ8FpjkDTzivQJ43t94bOuY0.jpg`,
    mediaType: 'video',
    sourceIp: 'Rick and Morty',
    genre: 'Satire',
    likes: 4780,
    views: 38200,
    createdAt: '2026-04-04T16:00:00Z',
    duration: '4:05',
    description: 'Rick uses portal technology to arbitrage across dimensions and fix inflation',
  },
  // ── Superhero Remixes ─────────────────────────────────────
  {
    id: 'seed-11',
    title: 'Batman\'s Therapy Session',
    creator: 'GothamNights',
    creatorAvatar: '🦇',
    thumbnailUrl: `${TMDB}/qJ2tW6WMUDux911r6m7haRef0WH.jpg`,
    mediaType: 'video',
    sourceIp: 'The Dark Knight',
    genre: 'Drama Remix',
    likes: 3420,
    views: 26100,
    createdAt: '2026-04-03T08:00:00Z',
    duration: '2:48',
    description: 'Bruce Wayne finally goes to therapy. His therapist is not prepared.',
  },
  {
    id: 'seed-12',
    title: 'Spider-Verse: Bodega Cat',
    creator: 'WebSlinger_NYC',
    creatorAvatar: '🕷️',
    thumbnailUrl: `${TMDB}/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg`,
    mediaType: 'video',
    sourceIp: 'Spider-Man: Into the Spider-Verse',
    genre: 'Short Film',
    likes: 7890,
    views: 64500,
    createdAt: '2026-04-05T12:00:00Z',
    duration: '1:30',
    description: 'Miles Morales teams up with the bodega cat to fight crime in Brooklyn',
  },
];

/** Get shuffled seed remixes (for carousel variety) */
export function getShuffledSeeds(): SeedRemix[] {
  const arr = [...SEED_REMIXES];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Get trending seeds (sorted by views) */
export function getTrendingSeeds(limit = 6): SeedRemix[] {
  return [...SEED_REMIXES].sort((a, b) => b.views - a.views).slice(0, limit);
}

/** Get latest seeds (sorted by date) */
export function getLatestSeeds(limit = 6): SeedRemix[] {
  return [...SEED_REMIXES]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}
