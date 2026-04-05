'use client';
// components/remixr/RemixrHome.tsx
// ReMixr homepage — 3 carousels: TV Shows, Movies, Community Content
import { useState, useEffect, useRef, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { createSupabaseBrowser } from '@/lib/supabase';
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

// ── Poster cache context ────────────────────────────────────────
// Fetch all posters in one bulk call, then pass the map down
function usePosterMap() {
  const [posterMap, setPosterMap] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tmdb?action=posters')
      .then(r => r.json())
      .then(data => {
        if (data && typeof data === 'object' && !data.error) {
          setPosterMap(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { posterMap, loading };
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
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
            style={{ background: color + '20', border: `1px solid ${color}30` }}
          >
            {icon}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <p className="text-xs text-muted/60">{subtitle}</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted hover:text-white hover:border-white/20 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
          >
            ←
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted hover:text-white hover:border-white/20 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>
      </div>

      {/* Scrollable row */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>
    </section>
  );
}

// ── Media Card (TV Show / Movie) with TMDB poster ───────────────
function MediaCard({
  item,
  posterUrl,
  onClick,
}: {
  item: MediaItem;
  posterUrl: string | null;
  onClick: () => void;
}) {
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
  const { posterMap } = usePosterMap();

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
            posterUrl={posterMap[show.id] || null}
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
            posterUrl={posterMap[movie.id] || null}
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
