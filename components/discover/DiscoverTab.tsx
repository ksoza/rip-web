// components/discover/DiscoverTab.tsx
// "Like Suno, but for TV and Movies" — social publishing platform
// Creators post AI-generated episodes/scenes, others watch/like/remix/follow
'use client';
import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';

// ── Types ───────────────────────────────────────────────────────
type FeedItem = {
  id: string;
  title: string;
  show: string;
  genre: string;
  type: string;
  creator: { handle: string; avatar: string; tier: string };
  thumbnail?: string;
  videoUrl?: string;
  description: string;
  likes: number;
  remixes: number;
  views: number;
  liked: boolean;
  createdAt: string;
  tags: string[];
  mediaType: 'scene' | 'episode' | 'video' | 'music';
};

type Creator = {
  id: string;
  handle: string;
  avatar: string;
  tier: string;
  bio: string;
  followers: number;
  works: number;
  featured?: string;
};

// ── Sample Data (placeholder until Supabase is wired) ───────────
const SAMPLE_FEED: FeedItem[] = [
  {
    id: '1',
    title: 'Walter White Opens a Bakery',
    show: 'Breaking Bad',
    genre: 'TV Show',
    type: 'Alt Ending',
    creator: { handle: 'heisenberg_fan', avatar: '', tier: 'creator' },
    description: 'What if Walter White left the drug trade and opened an artisanal bakery in Albuquerque? Blue Sky Croissants, anyone?',
    likes: 2847,
    remixes: 142,
    views: 15200,
    liked: false,
    createdAt: '2h ago',
    tags: ['breakingbad', 'altending', 'comedy'],
    mediaType: 'episode',
  },
  {
    id: '2',
    title: 'Naruto vs Goku — The Crossover',
    show: 'Naruto x Dragon Ball',
    genre: 'Anime',
    type: 'Crossover',
    creator: { handle: 'anime_remixer', avatar: '', tier: 'studio' },
    thumbnail: '',
    description: 'The ultimate anime crossover. Naruto faces Goku in an epic battle that spans dimensions. Generated with Luma Dream Machine.',
    likes: 5100,
    remixes: 340,
    views: 42000,
    liked: false,
    createdAt: '4h ago',
    tags: ['anime', 'crossover', 'action', 'dragonball'],
    mediaType: 'video',
  },
  {
    id: '3',
    title: 'CNN but Everyone is a Cat',
    show: 'CNN',
    genre: 'News Show',
    type: 'News Remix',
    creator: { handle: 'cat_news_network', avatar: '', tier: 'starter' },
    description: 'Breaking news: Local cat demands more treats. In other news, the economy is... *knocks glass off table*',
    likes: 8900,
    remixes: 1200,
    views: 89000,
    liked: false,
    createdAt: '8h ago',
    tags: ['news', 'cats', 'comedy', 'viral'],
    mediaType: 'episode',
  },
  {
    id: '4',
    title: 'Stranger Things: Tokyo Edition',
    show: 'Stranger Things',
    genre: 'TV Show',
    type: 'New Episode',
    creator: { handle: 'upside_down', avatar: '', tier: 'creator' },
    description: 'The Upside Down breaks through in Shibuya. Japanese urban legends meet Hawkins in this wild crossover scene.',
    likes: 3200,
    remixes: 198,
    views: 21000,
    liked: false,
    createdAt: '12h ago',
    tags: ['strangerthings', 'japan', 'horror'],
    mediaType: 'scene',
  },
  {
    id: '5',
    title: 'Dark Knight Theme — Lo-fi Remix',
    show: 'The Dark Knight',
    genre: 'Movie',
    type: 'Music',
    creator: { handle: 'ai_composer', avatar: '', tier: 'studio' },
    description: 'Batman meets lo-fi. A chill study remix of the Dark Knight score, generated with MusicGen and refined.',
    likes: 1500,
    remixes: 89,
    views: 7800,
    liked: false,
    createdAt: '1d ago',
    tags: ['batman', 'lofi', 'music', 'chill'],
    mediaType: 'music',
  },
];

const GENRE_COLORS: Record<string, string> = {
  'TV Show': '#00d4ff',
  'Movie': '#ff6b35',
  'Anime': '#ff2d78',
  'Cartoon': '#ffcc00',
  'News Show': '#8aff00',
  'New Show': '#a855f7',
};

const MEDIA_ICONS: Record<string, string> = {
  scene: '🖼️',
  episode: '📺',
  video: '🎬',
  music: '🎵',
};

const TABS = [
  { id: 'trending',  label: '🔥 Trending' },
  { id: 'latest',    label: '✨ Latest' },
  { id: 'following', label: '👥 Following' },
  { id: 'genres',    label: '🎭 Genres' },
];

// ── Main Component ──────────────────────────────────────────────
export function DiscoverTab({ user, profile }: { user: User; profile: any }) {
  const [tab, setTab] = useState('trending');
  const [feed, setFeed] = useState<FeedItem[]>(SAMPLE_FEED);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState('');

  // Filter feed
  const filteredFeed = feed.filter(item => {
    if (selectedGenre && item.genre !== selectedGenre) return false;
    if (search) {
      const q = search.toLowerCase();
      return item.title.toLowerCase().includes(q) || item.show.toLowerCase().includes(q) || item.tags.some(t => t.includes(q));
    }
    return true;
  });

  // Toggle like
  function toggleLike(id: string) {
    setFeed(f => f.map(item =>
      item.id === id ? { ...item, liked: !item.liked, likes: item.liked ? item.likes - 1 : item.likes + 1 } : item
    ));
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h1 className="font-display text-4xl tracking-widest text-white">☽ <span className="text-cyan">DISCOVER</span></h1>
        <p className="text-muted text-sm mt-1">Watch, like, and remix AI-generated shows, scenes, and music</p>
      </div>

      {/* Search */}
      <div className="mb-5">
        <div className="relative">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search shows, creators, tags..."
            className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 pl-10 text-white text-sm outline-none focus:border-bord2 placeholder:text-muted2" />
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">🔍</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
              tab === t.id
                ? 'bg-cyan/10 border-2 border-cyan text-cyan'
                : 'bg-bg2 border border-border text-muted hover:text-white hover:border-bord2'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Genre Filter */}
      {tab === 'genres' && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button onClick={() => setSelectedGenre('')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              !selectedGenre ? 'bg-white text-black' : 'border border-border text-muted'
            }`}>
            All
          </button>
          {Object.entries(GENRE_COLORS).map(([genre, color]) => (
            <button key={genre} onClick={() => setSelectedGenre(genre)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                selectedGenre === genre ? 'text-black' : 'border border-bord2 text-muted hover:text-white'
              }`}
              style={selectedGenre === genre ? { backgroundColor: color } : {}}>
              {genre}
            </button>
          ))}
        </div>
      )}

      {/* Trending Banner */}
      {tab === 'trending' && filteredFeed.length > 0 && (
        <div className="mb-6">
          <FeaturedCard item={filteredFeed[0]} onLike={toggleLike} onExpand={setExpandedId} />
        </div>
      )}

      {/* Feed Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(tab === 'trending' ? filteredFeed.slice(1) : filteredFeed).map(item => (
          <FeedCard key={item.id} item={item} onLike={toggleLike} expanded={expandedId === item.id} onExpand={setExpandedId} />
        ))}
      </div>

      {/* Empty State */}
      {filteredFeed.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🎬</div>
          <h3 className="font-display text-2xl text-white mb-2">Nothing yet!</h3>
          <p className="text-muted text-sm mb-4">Be the first to create and share in this category.</p>
          <button className="px-6 py-3 rounded-xl font-bold text-sm text-white transition hover:brightness-110"
            style={{ background: 'linear-gradient(90deg,#ff2d78,#a855f7)' }}>
            ☽ Create Something
          </button>
        </div>
      )}

      {/* Creator Spotlight (sidebar for larger screens) */}
      <div className="mt-8">
        <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">🌟 Top Creators</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { handle: 'heisenberg_fan', tier: 'creator', works: 42, followers: 2800 },
            { handle: 'anime_remixer', tier: 'studio', works: 156, followers: 15000 },
            { handle: 'cat_news_network', tier: 'starter', works: 23, followers: 89000 },
            { handle: 'upside_down', tier: 'creator', works: 67, followers: 4200 },
          ].map(c => (
            <div key={c.handle} className="bg-bg2 border border-border rounded-xl p-4 text-center hover:border-bord2 transition-all cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rip to-cyan mx-auto mb-2 flex items-center justify-center text-lg font-display text-white">
                {c.handle[0].toUpperCase()}
              </div>
              <div className="text-xs font-bold text-white">@{c.handle}</div>
              <div className="text-[9px] text-muted uppercase mt-0.5">{c.tier}</div>
              <div className="flex justify-center gap-3 mt-2 text-[9px] text-muted2">
                <span>{fmtNum(c.followers)} followers</span>
                <span>{c.works} works</span>
              </div>
              <button className="mt-2 px-3 py-1 rounded-full text-[10px] font-bold border border-rip text-rip hover:bg-rip/10 transition-all">
                Follow
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Featured Card (hero/banner) ─────────────────────────────────
function FeaturedCard({ item, onLike, onExpand }: { item: FeedItem; onLike: (id: string) => void; onExpand: (id: string) => void }) {
  return (
    <div className="relative bg-bg2 border border-border rounded-2xl overflow-hidden group cursor-pointer"
      onClick={() => onExpand(item.id)}>
      {/* Hero background */}
      <div className="h-48 sm:h-64 relative">
        {item.thumbnail ? (
          <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-8xl opacity-20">
            {MEDIA_ICONS[item.mediaType] || '🎬'}
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg2 via-bg2/40 to-transparent" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-black" style={{ backgroundColor: GENRE_COLORS[item.genre] }}>
            {item.genre}
          </span>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/10 backdrop-blur text-white">
            🔥 Trending
          </span>
        </div>

        {/* Media type icon */}
        <div className="absolute top-3 right-3 text-3xl opacity-60">
          {MEDIA_ICONS[item.mediaType]}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 -mt-12 relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-rip/20 flex items-center justify-center text-xs text-rip font-bold">
            {item.creator.handle[0].toUpperCase()}
          </div>
          <div>
            <span className="text-xs font-bold text-white">@{item.creator.handle}</span>
            <span className="text-[9px] text-muted ml-2">{item.createdAt}</span>
          </div>
        </div>

        <h2 className="font-display text-3xl text-white mb-1 leading-tight">{item.title}</h2>
        <p className="text-[10px] text-muted2 uppercase tracking-wide mb-2">{item.show} — {item.type}</p>
        <p className="text-sm text-muted leading-relaxed mb-4">{item.description}</p>

        <div className="flex items-center gap-4">
          <button onClick={(e) => { e.stopPropagation(); onLike(item.id); }}
            className={`flex items-center gap-1.5 text-sm transition-all ${item.liked ? 'text-rip' : 'text-muted hover:text-rip'}`}>
            {item.liked ? '❤️' : '🤍'} <span className="text-xs font-bold">{fmtNum(item.likes)}</span>
          </button>
          <button className="flex items-center gap-1.5 text-sm text-muted hover:text-cyan transition-all">
            🔄 <span className="text-xs font-bold">{fmtNum(item.remixes)}</span>
          </button>
          <span className="flex items-center gap-1.5 text-sm text-muted">
            👁 <span className="text-xs">{fmtNum(item.views)}</span>
          </span>
          <div className="flex-1" />
          <button className="px-4 py-2 rounded-lg text-xs font-bold text-white transition hover:brightness-110"
            style={{ background: 'linear-gradient(90deg,#ff2d78,#a855f7)' }}>
            ☽ Remix This
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Feed Card ───────────────────────────────────────────────────
function FeedCard({ item, onLike, expanded, onExpand }: {
  item: FeedItem; onLike: (id: string) => void; expanded: boolean; onExpand: (id: string) => void;
}) {
  return (
    <div className={`bg-bg2 border rounded-xl overflow-hidden hover:border-bord2 transition-all cursor-pointer ${
      expanded ? 'border-cyan' : 'border-border'
    }`} onClick={() => onExpand(expanded ? '' : item.id)}>
      {/* Thumbnail / Media preview */}
      <div className="h-36 relative bg-bg3">
        {item.thumbnail ? (
          <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl opacity-20">{MEDIA_ICONS[item.mediaType] || '🎬'}</span>
          </div>
        )}

        {/* Genre badge */}
        <div className="absolute top-2 left-2">
          <span className="px-2 py-0.5 rounded-full text-[8px] font-bold text-black" style={{ backgroundColor: GENRE_COLORS[item.genre] }}>
            {item.genre}
          </span>
        </div>

        {/* Media icon */}
        <div className="absolute bottom-2 right-2 text-lg opacity-60">
          {MEDIA_ICONS[item.mediaType]}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-5 h-5 rounded-full bg-rip/20 flex items-center justify-center text-[8px] text-rip font-bold">
            {item.creator.handle[0].toUpperCase()}
          </div>
          <span className="text-[10px] font-bold text-white">@{item.creator.handle}</span>
          <span className="text-[8px] text-muted ml-auto">{item.createdAt}</span>
        </div>

        <h3 className="font-display text-lg text-white leading-tight mb-1">{item.title}</h3>
        <p className="text-[10px] text-muted2 uppercase tracking-wide mb-2">{item.show} — {item.type}</p>

        {expanded && (
          <p className="text-xs text-muted leading-relaxed mb-2 animate-slide-up">{item.description}</p>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-2">
          {item.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded bg-bg3 text-muted2">#{tag}</span>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-[10px] text-muted pt-2 border-t border-border">
          <button onClick={(e) => { e.stopPropagation(); onLike(item.id); }}
            className={`flex items-center gap-1 transition-all ${item.liked ? 'text-rip' : 'hover:text-rip'}`}>
            {item.liked ? '❤️' : '🤍'} {fmtNum(item.likes)}
          </button>
          <span className="flex items-center gap-1">🔄 {fmtNum(item.remixes)}</span>
          <span className="flex items-center gap-1">👁 {fmtNum(item.views)}</span>
          <button className="ml-auto px-2 py-0.5 rounded text-[9px] font-bold border border-rip/30 text-rip hover:bg-rip/10 transition-all">
            ☽ Remix
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────
function fmtNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}
