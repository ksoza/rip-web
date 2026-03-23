'use client';
// components/discover/MediaCarousel.tsx
// Horizontal carousel of TV shows and movies for creators to select and reimagine
import { useState, useRef } from 'react';

// ── Types ───────────────────────────────────────────────────────
export type MediaItem = {
  id: string;
  title: string;
  year: string;
  genre: string;
  category: 'TV Show' | 'Movie';
  gradient: string;         // CSS gradient for poster placeholder
  emoji: string;            // Visual accent
  description: string;
  tags: string[];
};

// ── TV Shows Data ───────────────────────────────────────────────
export const TV_SHOWS: MediaItem[] = [
  { id: 'breaking-bad',     title: 'Breaking Bad',       year: '2008–2013', genre: 'Crime Drama',     category: 'TV Show', gradient: 'linear-gradient(135deg, #1a5e1a, #0a2f0a)', emoji: '🧪', description: 'A chemistry teacher turned meth kingpin',        tags: ['drama','crime','heisenberg'] },
  { id: 'stranger-things',  title: 'Stranger Things',    year: '2016–2025', genre: 'Sci-Fi Horror',   category: 'TV Show', gradient: 'linear-gradient(135deg, #8b0000, #2d0a0a)', emoji: '🔦', description: 'Kids vs the Upside Down in 1980s Hawkins',        tags: ['scifi','horror','80s'] },
  { id: 'game-of-thrones',  title: 'Game of Thrones',    year: '2011–2019', genre: 'Epic Fantasy',    category: 'TV Show', gradient: 'linear-gradient(135deg, #1a1a3e, #0d0d1a)', emoji: '⚔️', description: 'Noble families battle for the Iron Throne',       tags: ['fantasy','medieval','dragons'] },
  { id: 'the-office',       title: 'The Office',         year: '2005–2013', genre: 'Comedy',          category: 'TV Show', gradient: 'linear-gradient(135deg, #2d4a2d, #1a2e1a)', emoji: '📎', description: 'Life at Dunder Mifflin Paper Company',            tags: ['comedy','mockumentary','workplace'] },
  { id: 'squid-game',       title: 'Squid Game',         year: '2021–',     genre: 'Thriller',        category: 'TV Show', gradient: 'linear-gradient(135deg, #ff2d78, #3a0a1e)', emoji: '🔺', description: 'Deadly children\'s games for cash prizes',        tags: ['thriller','korean','survival'] },
  { id: 'wednesday',        title: 'Wednesday',          year: '2022–',     genre: 'Mystery Comedy',  category: 'TV Show', gradient: 'linear-gradient(135deg, #1a1a2e, #0a0a14)', emoji: '🖤', description: 'Wednesday Addams at Nevermore Academy',           tags: ['mystery','comedy','gothic'] },
  { id: 'the-last-of-us',   title: 'The Last of Us',     year: '2023–',     genre: 'Post-Apocalyptic',category: 'TV Show', gradient: 'linear-gradient(135deg, #3d5a1f, #1a2a0a)', emoji: '🍄', description: 'Survival in a fungal apocalypse',                 tags: ['drama','survival','adaptation'] },
  { id: 'peaky-blinders',   title: 'Peaky Blinders',     year: '2013–2022', genre: 'Crime Drama',     category: 'TV Show', gradient: 'linear-gradient(135deg, #2a1a0a, #0f0a05)', emoji: '🎩', description: 'Birmingham gang in post-WWI England',             tags: ['crime','period','british'] },
  { id: 'the-mandalorian',  title: 'The Mandalorian',    year: '2019–',     genre: 'Sci-Fi Western',  category: 'TV Show', gradient: 'linear-gradient(135deg, #3a2a0a, #1a1205)', emoji: '🪖', description: 'A lone bounty hunter in the Star Wars galaxy',    tags: ['starwars','scifi','western'] },
  { id: 'attack-on-titan',  title: 'Attack on Titan',    year: '2013–2023', genre: 'Action Anime',    category: 'TV Show', gradient: 'linear-gradient(135deg, #4a1a0a, #200a05)', emoji: '⚡', description: 'Humanity fights giant humanoid Titans',            tags: ['anime','action','dark'] },
  { id: 'naruto',           title: 'Naruto',             year: '2002–2017', genre: 'Shōnen Anime',    category: 'TV Show', gradient: 'linear-gradient(135deg, #cc6600, #3a1e00)', emoji: '🍥', description: 'A young ninja\'s path to becoming Hokage',        tags: ['anime','ninja','shonen'] },
  { id: 'spongebob',        title: 'SpongeBob',          year: '1999–',     genre: 'Cartoon Comedy',  category: 'TV Show', gradient: 'linear-gradient(135deg, #cccc00, #3a3a00)', emoji: '🧽', description: 'Adventures under the sea in Bikini Bottom',       tags: ['cartoon','comedy','kids'] },
];

// ── Movies Data ─────────────────────────────────────────────────
export const MOVIES: MediaItem[] = [
  { id: 'the-dark-knight',   title: 'The Dark Knight',              year: '2008', genre: 'Superhero',       category: 'Movie', gradient: 'linear-gradient(135deg, #0a0a2e, #050514)', emoji: '🦇', description: 'Batman faces the Joker in Gotham City',           tags: ['superhero','action','thriller'] },
  { id: 'inception',         title: 'Inception',                    year: '2010', genre: 'Sci-Fi Thriller', category: 'Movie', gradient: 'linear-gradient(135deg, #1a2a4a, #0a1020)', emoji: '🌀', description: 'Thieves who steal secrets from dreams',            tags: ['scifi','mindbending','heist'] },
  { id: 'avengers-endgame',  title: 'Avengers: Endgame',            year: '2019', genre: 'Superhero',       category: 'Movie', gradient: 'linear-gradient(135deg, #2a0a3e, #140520)', emoji: '🛡️', description: 'The Avengers assemble one final time',            tags: ['marvel','superhero','epic'] },
  { id: 'interstellar',      title: 'Interstellar',                 year: '2014', genre: 'Sci-Fi Drama',    category: 'Movie', gradient: 'linear-gradient(135deg, #0a1a2e, #050d17)', emoji: '🕳️', description: 'A journey through space to save humanity',         tags: ['scifi','space','emotional'] },
  { id: 'the-matrix',        title: 'The Matrix',                   year: '1999', genre: 'Sci-Fi Action',   category: 'Movie', gradient: 'linear-gradient(135deg, #001a00, #000d00)', emoji: '💊', description: 'Reality is not what it seems',                     tags: ['scifi','action','cyberpunk'] },
  { id: 'pulp-fiction',      title: 'Pulp Fiction',                 year: '1994', genre: 'Crime',           category: 'Movie', gradient: 'linear-gradient(135deg, #3a1a0a, #1d0d05)', emoji: '💼', description: 'Intertwining tales of crime in LA',               tags: ['crime','classic','tarantino'] },
  { id: 'joker',             title: 'Joker',                        year: '2019', genre: 'Psychological',   category: 'Movie', gradient: 'linear-gradient(135deg, #1a3a1a, #0d1d0d)', emoji: '🤡', description: 'The origin of Gotham\'s Clown Prince of Crime',  tags: ['drama','psychological','dc'] },
  { id: 'spider-verse',      title: 'Spider-Man: Across the Spider-Verse', year: '2023', genre: 'Animated',  category: 'Movie', gradient: 'linear-gradient(135deg, #3a0a3e, #1d0520)', emoji: '🕷️', description: 'Miles Morales swings across the multiverse',      tags: ['animated','marvel','multiverse'] },
  { id: 'dune',              title: 'Dune',                         year: '2021', genre: 'Sci-Fi Epic',     category: 'Movie', gradient: 'linear-gradient(135deg, #3a2a0a, #1d1505)', emoji: '🏜️', description: 'A hero\'s journey on the desert planet Arrakis',   tags: ['scifi','epic','adaptation'] },
  { id: 'parasite',          title: 'Parasite',                     year: '2019', genre: 'Dark Comedy',     category: 'Movie', gradient: 'linear-gradient(135deg, #2a2a1a, #15150d)', emoji: '🪨', description: 'Two families collide across the class divide',    tags: ['thriller','korean','oscarwinner'] },
  { id: 'oppenheimer',       title: 'Oppenheimer',                  year: '2023', genre: 'Historical',      category: 'Movie', gradient: 'linear-gradient(135deg, #3a1a00, #1d0d00)', emoji: '💥', description: 'The father of the atomic bomb',                   tags: ['historical','drama','nolan'] },
  { id: 'everything-everywhere', title: 'Everything Everywhere All at Once', year: '2022', genre: 'Absurdist Sci-Fi', category: 'Movie', gradient: 'linear-gradient(135deg, #2a0a2e, #150517)', emoji: '🥯', description: 'A multiverse-hopping adventure',          tags: ['scifi','comedy','multiverse'] },
];

// ── Genre Colors ────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  'TV Show': '#00d4ff',
  'Movie': '#ff6b35',
};

// ── Carousel Component ──────────────────────────────────────────
function Carousel({
  title,
  icon,
  items,
  color,
  onSelect,
}: {
  title: string;
  icon: string;
  items: MediaItem[];
  color: string;
  onSelect: (item: MediaItem) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeftArrow(el.scrollLeft > 20);
    setShowRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 20);
  }

  function scroll(direction: 'left' | 'right') {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  }

  return (
    <div className="mb-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <h2 className="font-display text-2xl tracking-wider text-white">{title}</h2>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
            style={{ backgroundColor: color + '20', color }}>
            {items.length} titles
          </span>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => scroll('left')}
            className={`w-8 h-8 rounded-lg border flex items-center justify-center text-sm transition-all ${
              showLeftArrow ? 'border-bord2 text-white hover:bg-bg3' : 'border-border text-muted2 cursor-default'
            }`} disabled={!showLeftArrow}>
            ←
          </button>
          <button onClick={() => scroll('right')}
            className={`w-8 h-8 rounded-lg border flex items-center justify-center text-sm transition-all ${
              showRightArrow ? 'border-bord2 text-white hover:bg-bg3' : 'border-border text-muted2 cursor-default'
            }`} disabled={!showRightArrow}>
            →
          </button>
        </div>
      </div>

      {/* Scrollable Cards */}
      <div ref={scrollRef} onScroll={handleScroll}
        className="flex gap-3 overflow-x-auto pb-3 scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {items.map(item => (
          <MediaCard key={item.id} item={item} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

// ── Media Card ──────────────────────────────────────────────────
function MediaCard({ item, onSelect }: { item: MediaItem; onSelect: (item: MediaItem) => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="shrink-0 w-[180px] group cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(item)}
    >
      {/* Poster */}
      <div className="relative h-[260px] rounded-xl overflow-hidden border border-border transition-all duration-300 group-hover:border-bord2 group-hover:scale-[1.03] group-hover:shadow-lg"
        style={{ background: item.gradient }}>
        {/* Emoji Accent */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-7xl opacity-20 group-hover:opacity-30 group-hover:scale-110 transition-all duration-300">
            {item.emoji}
          </span>
        </div>

        {/* Category Badge */}
        <div className="absolute top-2.5 left-2.5">
          <span className="px-2 py-0.5 rounded-full text-[8px] font-bold text-black"
            style={{ backgroundColor: CATEGORY_COLORS[item.category] }}>
            {item.category}
          </span>
        </div>

        {/* Year Badge */}
        <div className="absolute top-2.5 right-2.5">
          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-black/40 backdrop-blur text-white/70">
            {item.year}
          </span>
        </div>

        {/* Bottom Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
          <h3 className="font-display text-sm tracking-wider text-white leading-tight mb-0.5">
            {item.title.toUpperCase()}
          </h3>
          <p className="text-[9px] text-white/50 uppercase tracking-wide">{item.genre}</p>
        </div>

        {/* Hover Overlay */}
        <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 transition-all duration-200 ${
          hovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          <p className="text-[10px] text-white/70 text-center px-3 leading-relaxed">
            {item.description}
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(item); }}
            className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-all hover:brightness-110 hover:scale-105"
            style={{ background: 'linear-gradient(90deg, #ff2d78, #a855f7)' }}>
            ☽ Reimagine
          </button>
          {/* Tags */}
          <div className="flex flex-wrap gap-1 justify-center px-2">
            {item.tags.slice(0, 2).map(tag => (
              <span key={tag} className="text-[7px] px-1.5 py-0.5 rounded bg-white/10 text-white/50">#{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Title Below Card */}
      <div className="mt-2 px-0.5">
        <h4 className="text-xs font-bold text-white truncate group-hover:text-rip transition-colors">{item.title}</h4>
        <p className="text-[9px] text-muted truncate">{item.genre} · {item.year}</p>
      </div>
    </div>
  );
}

// ── Exported Main Component ─────────────────────────────────────
export function MediaCarousels({ onSelectMedia }: { onSelectMedia: (item: MediaItem) => void }) {
  return (
    <div className="mb-6">
      <Carousel
        title="TV SHOWS"
        icon="📺"
        items={TV_SHOWS}
        color="#00d4ff"
        onSelect={onSelectMedia}
      />
      <Carousel
        title="MOVIES"
        icon="🎬"
        items={MOVIES}
        color="#ff6b35"
        onSelect={onSelectMedia}
      />
    </div>
  );
}
