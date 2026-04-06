'use client';
// components/remixr/RemixrHome.tsx
// ReMixr homepage — 3 carousels: TV Shows, Movies, Community Content
// Uses static TMDB poster paths (no API key required)
import { useState, useEffect, useRef, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import type { MediaItem } from '@/components/create/CreationWizard';

// ── Types ───────────────────────────────────────────────────────
interface CommunityItem {
  id: string;
  title: string;
  creator: string;
  creatorAvatar?: string;
  thumbnailUrl?: string;
  mediaType: 'video' | 'image';
  sourceIp: string;
  likes: number;
  views: number;
  createdAt: string;
}

interface Props {
  user: User | null;
  onSelectMedia: (media: MediaItem) => void;
  onViewContent: (item: CommunityItem) => void;
}

// ── Carousel data ───────────────────────────────────────────────
import { TV_SHOWS, MOVIES } from '@/components/discover/MediaCarousel';
import { EmailCapture } from '@/components/shared/EmailCapture';
import { SEED_REMIXES } from '@/lib/seed-content';

// ── Static TMDB poster paths (scraped from TMDB, no API key needed) ──
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w342';
const POSTER_PATHS: Record<string, string> = {
  // TV Shows: Drama / Crime
  'breaking-bad': '/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg',
  'game-of-thrones': '/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg',
  'the-sopranos': '/rTc7ZXdroqjkKivFPvCPX0Ru7uw.jpg',
  'the-wire': '/4lbclFySvugI51fwsyxBTOm4DqK.jpg',
  'peaky-blinders': '/vUUqzWa2LnHIVqkaKVlVGkVcZIW.jpg',
  'better-call-saul': '/zjg4jpK1Wp2kiRvtt5ND0kznako.jpg',
  'ozark': '/pCGyPVrI9Fzw6rE1Pvi4BIXF6ET.jpg',
  'succession': '/z0XiwdrCQ9yVIr4O0pxzaAYRxdW.jpg',
  // TV Shows: Sci-Fi / Fantasy / Horror
  'stranger-things': '/uOOtwVbSr4QDjAGIifLDwpb2Pdl.jpg',
  'the-last-of-us': '/dmo6TYuuJgaYinXBPjrgG9mB5od.jpg',
  'the-mandalorian': '/sWgBv7LV2PRoQgkxwlibdGXKz1S.jpg',
  'wednesday': '/36xXlhEpQqVVPuiZhfoQuaY4OlA.jpg',
  'the-walking-dead': '/s3OIDrCErUjthsnPPreY7XktQXB.jpg',
  'black-mirror': '/seN6rRfN0I6n8iDXjlSMk1QjNcq.jpg',
  'westworld': '/8MfgyFHf7XEboZJPZXCIDqqiz6e.jpg',
  'the-witcher': '/AoGsDM02UVt0npBA8OvpDcZbaMi.jpg',
  'house-of-dragon': '/7QMsOTMUswlwxJP0rTTZfmz2tX2.jpg',
  // TV Shows: Comedy
  'the-office': '/7DJKHzAi83BmQrWLrYYOqcoKfhR.jpg',
  'friends': '/2koX1xLkpTQM4IZebYvKysFW1Nh.jpg',
  'seinfeld': '/aCw8ONfyz3AhngVQa1E2Ss4KSUQ.jpg',
  'its-always-sunny': '/o0tMMK33JqmtpcWw0H41cEr9xQB.jpg',
  'malcolm-middle': '/uftxEWbn3OSykTy4DX4BrdVeiuv.jpg',
  'arrested-dev': '/p4r4RD7RsNcJVoz0H6z3dBoTBtW.jpg',
  'the-simpsons': '/uWpG7GqfKGQqX4YMAo3nv5OrglV.jpg',
  'south-park': '/1CGwZCFX2qerXaXQJJUB3qUvxq7.jpg',
  'rick-and-morty': '/WGRQ8FpjkDTzivQJ43t94bOuY0.jpg',
  'family-guy': '/3PFsEuAiyLkWsP4GG6dIV37Q6gu.jpg',
  'archer': '/vhnrkTGYPqcB63ALcSJm0WoaKHT.jpg',
  'bobs-burgers': '/iIHsQe3Qjs3NH62HdamyQEPeqTR.jpg',
  'parks-and-rec': '/5IOj62y2Eb2ngyYmEn1IJ7bFhzH.jpg',
  'american-dad': '/eb9sH2am9IUSQ8GhXTNAVoujk8W.jpg',
  // TV Shows: Anime
  'naruto': '/Asv6ornwVeMxKUdA5ySLMrgENwy.jpg',
  'one-piece': '/uiIB9ctqZFbfRXXimtpmZb5dusi.jpg',
  'attack-on-titan': '/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg',
  'demon-slayer': '/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg',
  'death-note': '/tCZFfYTIwrR7n94J6G14Y4hAFU6.jpg',
  'dragon-ball-z': '/yfyToia25GnvjY7FPAGaCm3lKRc.jpg',
  'my-hero-academia': '/phuYuzqWW9ru8EA3HVjE9W2Rr3M.jpg',
  'fullmetal-alchemist': '/5ZFUEOULaVml7pQuXxhpR2SmVUw.jpg',
  'jujutsu-kaisen': '/fHpKWq9ayzSk8nSwqRuaAUemRKh.jpg',
  'cowboy-bebop-anime': '/xDiXDfZwC6XYC6fxHI1jl3A3Ill.jpg',
  // Movies: Superhero
  'the-dark-knight': '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
  'avengers-endgame': '/ulzhLuWrPK07P1YkdWQLZnQh1JL.jpg',
  'spider-verse': '/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
  'black-panther': '/uxzzxijgPIY7slzFvMotPv8wjKA.jpg',
  'logan': '/fnbjcRDYn6YviCcePDnGdyAkYsB.jpg',
  'john-wick': '/wXqWR7dHncNRbxoEGybEy7QTe9h.jpg',
  // Movies: Sci-Fi / Mind-Bending
  'inception': '/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg',
  'the-matrix': '/aOIuZAjPaRIE6CMzbazvcHuHXDc.jpg',
  'interstellar': '/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg',
  'blade-runner-2049': '/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
  'dune-2021': '/gDzOcq0pfeCeqMBwKIJlSmQpjkZ.jpg',
  // Movies: Classic
  'pulp-fiction': '/vQWk5YBFWF4bZaofAbv0tShwBvQ.jpg',
  'the-godfather': '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
  'fight-club': '/jSziioSwPVrOy9Yow3XhWIBDjq1.jpg',
  'goodfellas': '/9OkCLM73MIU2CrKZbqiT8Ln1wY2.jpg',
  'the-shawshank': '/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg',
  'forrest-gump': '/saHP97rTPS5eLmrLQEcANmKrsFl.jpg',
  'jurassic-park': '/maFjKnJ62hDQ9E66dKqDZgbUy0H.jpg',
  'star-wars-4': '/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg',
  'back-to-future': '/vN5B5WgYscRGcQpVhHl6p9DDTP0.jpg',
  'the-lion-king': '/sKCr78MXSLixwmZ8DyJLrpMsd15.jpg',
  'titanic': '/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg',
  'gladiator': '/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg',
  'django-unchained': '/7oWY8VDWW7thTzWh3OKYRkWUlD5.jpg',
  'mad-max-fury': '/hA2ple9q4qnwxp3hKVNhroipsir.jpg',
  // Movies: Modern
  'everything-everywhere': '/u68AjlvlutfEIcpmbYpKcdi09ut.jpg',
  'oppenheimer': '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
  // Movies: Anime
  'spirited-away': '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg',
  'your-name': '/q719jXXEzOoYaps6babgKnONONX.jpg',
  'akira': '/neZ0ykEsPqxamsX6o5QNUFILQrz.jpg',
  // Movies: Horror
  'get-out': '/mE24wUCfjK8AoBBjaMjho7Rczr7.jpg',
};

function getPosterUrl(id: string): string | null {
  const path = POSTER_PATHS[id];
  return path ? `${TMDB_IMAGE_BASE}${path}` : null;
}

// ── Horizontal Carousel Component ───────────────────────────────
function Carousel({
  title,
  subtitle,
  icon,
  color,
  children,
}: {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  children: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    return () => el.removeEventListener('scroll', checkScroll);
  }, [checkScroll]);

  function scroll(dir: 'left' | 'right') {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' });
  }

  return (
    <section className="mb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 px-1">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
          style={{ background: color + '20', border: `1px solid ${color}30` }}
        >
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <p className="text-xs text-white/30">{subtitle}</p>
        </div>
      </div>

      {/* Scrollable row with Netflix-style arrows */}
      <div className="relative group/carousel">
        {/* Left arrow — centered vertically on left edge */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-0 bottom-8 z-10 w-10 sm:w-12 flex items-center justify-center bg-gradient-to-r from-black/80 via-black/50 to-transparent opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 cursor-pointer"
            aria-label="Scroll left"
          >
            <svg className="w-7 h-7 text-white drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Right arrow — centered vertically on right edge */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-0 bottom-8 z-10 w-10 sm:w-12 flex items-center justify-center bg-gradient-to-l from-black/80 via-black/50 to-transparent opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 cursor-pointer"
            aria-label="Scroll right"
          >
            <svg className="w-7 h-7 text-white drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory px-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

// ── Media Card (TV Show / Movie) with TMDB poster ───────────────
function MediaCard({
  item,
  onClick,
}: {
  item: MediaItem;
  onClick: () => void;
}) {
  const posterUrl = getPosterUrl(item.id);
  const [loaded, setLoaded] = useState(false);

  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 snap-start group relative w-[140px] sm:w-[160px] rounded-xl overflow-hidden transition-all hover:scale-105 hover:z-10 active:scale-95"
    >
      {/* Poster / Gradient fallback */}
      <div className="aspect-[2/3] relative">
        {posterUrl ? (
          <>
            {!loaded && (
              <div
                className="absolute inset-0 animate-pulse"
                style={{ background: item.gradient }}
              />
            )}
            <img
              src={posterUrl}
              alt={item.title}
              className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setLoaded(true)}
              onError={(e) => {
                // Fallback to gradient on image load error
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </>
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center p-3"
            style={{ background: item.gradient }}
          >
            <span className="text-4xl mb-2">{item.emoji}</span>
            <span className="text-xs font-bold text-white/90 text-center leading-tight">{item.title}</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
          <span className="text-white text-xs font-bold leading-tight mb-1">{item.title}</span>
          <span className="text-white/60 text-[10px]">{item.year} • {item.genre}</span>
          <div className="mt-2 px-2 py-1 rounded-md bg-rip/90 text-white text-[10px] font-bold text-center">
            ReMix This →
          </div>
        </div>
      </div>

      {/* Title below (always visible) */}
      <div className="px-1 py-2">
        <p className="text-xs font-semibold text-white/80 truncate">{item.title}</p>
        <p className="text-[10px] text-muted/50">{item.genre}</p>
      </div>
    </button>
  );
}

// ── Community Content Card ──────────────────────────────────────
function CommunityCard({
  item,
  onClick,
}: {
  item: CommunityItem;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 snap-start group w-[200px] sm:w-[240px] rounded-xl overflow-hidden border border-border hover:border-rip/30 transition-all hover:scale-[1.03] active:scale-[0.97]"
    >
      {/* Thumbnail */}
      <div className="aspect-video relative bg-bg">
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rip/10 to-purple/10">
            <span className="text-3xl">{item.mediaType === 'video' ? '🎬' : '🖼️'}</span>
          </div>
        )}
        {item.mediaType === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <span className="text-white text-lg ml-0.5">▶</span>
            </div>
          </div>
        )}
        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-white font-bold">
          {item.mediaType === 'video' ? '🎬 Video' : '🖼️ Image'}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 text-left">
        <p className="text-xs font-bold text-white/90 truncate mb-1">{item.title}</p>
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-rip to-purple flex items-center justify-center text-[8px] text-white font-bold">
            {item.creator[0]?.toUpperCase()}
          </div>
          <span className="text-[10px] text-muted truncate">{item.creator}</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted/50">
          <span>❤️ {item.likes}</span>
          <span>👁️ {item.views}</span>
          <span className="ml-auto">{item.createdAt}</span>
        </div>
      </div>
    </button>
  );
}

// ── Sample community content (until Supabase feed is wired) ─────
const SAMPLE_COMMUNITY: CommunityItem[] = [
  { id: 'c1', title: 'Walter White Opens a Bakery', creator: 'heisenberg_fan', mediaType: 'video', sourceIp: 'Breaking Bad', likes: 2847, views: 15200, createdAt: '2h ago' },
  { id: 'c2', title: 'Naruto vs Goku — The Crossover', creator: 'anime_remixer', mediaType: 'video', sourceIp: 'Naruto x DBZ', likes: 5100, views: 42000, createdAt: '4h ago' },
  { id: 'c3', title: 'The Office But Everyone Is a Dog', creator: 'paws_and_paper', mediaType: 'video', sourceIp: 'The Office', likes: 8900, views: 89000, createdAt: '8h ago' },
  { id: 'c4', title: 'Stranger Things: Tokyo Edition', creator: 'neon_remixer', mediaType: 'video', sourceIp: 'Stranger Things', likes: 3200, views: 21000, createdAt: '12h ago' },
  { id: 'c5', title: 'Rick Sanchez Invents Bitcoin', creator: 'schwifty_ai', mediaType: 'video', sourceIp: 'Rick and Morty', likes: 6700, views: 55000, createdAt: '1d ago' },
  { id: 'c6', title: 'Avengers But They Work at Walmart', creator: 'retail_hero', mediaType: 'video', sourceIp: 'Marvel', likes: 12400, views: 130000, createdAt: '1d ago' },
  { id: 'c7', title: 'Game of Thrones Season 9 Trailer', creator: 'westeros_ai', mediaType: 'video', sourceIp: 'Game of Thrones', likes: 18000, views: 210000, createdAt: '2d ago' },
  { id: 'c8', title: 'SpongeBob Goes to College', creator: 'bikini_remix', mediaType: 'video', sourceIp: 'SpongeBob', likes: 4500, views: 38000, createdAt: '2d ago' },
];

// ── Main Component ──────────────────────────────────────────────
export function RemixrHome({ user, onSelectMedia, onViewContent }: Props) {
  const [communityFeed] = useState<CommunityItem[]>(SAMPLE_COMMUNITY);

  return (
    <div className="space-y-2">
      {/* Hero */}
      <div className="text-center py-6 mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          What do you want to <span className="text-rip">ReMix</span> today?
        </h1>
        <p className="text-sm text-muted/70 max-w-lg mx-auto">
          Pick a show or movie below, add your creative spin, and let AI bring your remix to life
        </p>
      </div>

      {/* Email Capture Banner */}
      <div className="px-4 mb-6">
        <EmailCapture variant="banner" />
      </div>

      {/* Carousel 1: TV Shows */}
      <Carousel
        title="TV Shows"
        subtitle="Select a show to remix"
        icon="📺"
        color="#00d4ff"
      >
        {TV_SHOWS.map((show) => (
          <MediaCard
            key={show.id}
            item={show}
            onClick={() => onSelectMedia(show)}
          />
        ))}
      </Carousel>

      {/* Carousel 2: Movies */}
      <Carousel
        title="Movies"
        subtitle="Select a movie to remix"
        icon="🎥"
        color="#facc15"
      >
        {MOVIES.map((movie) => (
          <MediaCard
            key={movie.id}
            item={movie}
            onClick={() => onSelectMedia(movie)}
          />
        ))}
      </Carousel>

      {/* Carousel 3: Community Content */}
      <Carousel
        title="Fresh Remixes"
        subtitle="Latest from the community"
        icon="🔥"
        color="#ff2d78"
      >
        {communityFeed.map((item) => (
          <CommunityCard
            key={item.id}
            item={item}
            onClick={() => onViewContent(item)}
          />
        ))}
      </Carousel>
    </div>
  );
}
