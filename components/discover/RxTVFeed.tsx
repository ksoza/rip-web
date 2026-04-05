'use client';
// components/discover/RxTVFeed.tsx
// 📺 RxTV — Episodic content feed (shows, series, episodes)
// Netflix/Hulu-style browsing for AI-generated TV content
import { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { createSupabaseBrowser } from '@/lib/supabase';
import { ShareDialog } from '../shared/ShareDialog';

// ── Types ───────────────────────────────────────────────────────
interface RxTVFeedProps {
  user: User | null;
  onNavigateToStudio?: (showName: string, category: string) => void;
  onWatch?: (creationId: string) => void;
}

type ShowCard = {
  id: string;
  showTitle: string;
  genre: string;
  creator: { handle: string; avatar: string; tier: string };
  thumbnail?: string;
  description: string;
  episodeCount: number;
  totalLikes: number;
  totalViews: number;
  latestEpisode?: string;
  tags: string[];
};

type EpisodeItem = {
  id: string;
  title: string;
  showTitle: string;
  genre: string;
  type: string;
  season: number;
  episode: number;
  creator: { handle: string; avatar: string; tier: string };
  thumbnail?: string;
  videoUrl?: string;
  description: string;
  likes: number;
  views: number;
  liked: boolean;
  createdAt: string;
  duration?: string;
};

type SubTab = 'featured' | 'shows' | 'latest' | 'trending';

const GENRE_FILTERS = ['All', 'TV Show', 'Anime', 'Cartoon', 'News Show', 'New Show'];
const GENRE_COLORS: Record<string, string> = {
  'TV Show': '#00d4ff', 'Anime': '#ff2d78', 'Cartoon': '#ffcc00',
  'News Show': '#8aff00', 'New Show': '#a855f7',
};

// ── Sample Data ─────────────────────────────────────────────────
const SAMPLE_SHOWS: ShowCard[] = [
  {
    id: 'show-1', showTitle: 'Breaking Bad: Blue Sky', genre: 'TV Show',
    creator: { handle: 'heisenberg_fan', avatar: '', tier: 'studio' },
    description: 'What if Walter White never got caught? An alternate timeline where the empire keeps growing.',
    episodeCount: 8, totalLikes: 12400, totalViews: 89000,
    latestEpisode: 'S2E3 — The Laundry Returns',
    tags: ['breakingbad', 'drama', 'alternate'],
  },
  {
    id: 'show-2', showTitle: 'Naruto: Next Gen AI', genre: 'Anime',
    creator: { handle: 'anime_remixer', avatar: '', tier: 'studio' },
    description: 'AI-generated continuation of Naruto featuring original characters in a cyber-ninja world.',
    episodeCount: 15, totalLikes: 28000, totalViews: 210000,
    latestEpisode: 'S1E15 — Digital Sage Mode',
    tags: ['anime', 'naruto', 'scifi'],
  },
  {
    id: 'show-3', showTitle: 'Cat News Network', genre: 'News Show',
    creator: { handle: 'cat_news_network', avatar: '', tier: 'creator' },
    description: 'All the news that fits, presented by cats. Daily AI-generated satirical news show.',
    episodeCount: 42, totalLikes: 156000, totalViews: 890000,
    latestEpisode: 'EP42 — Markets React to Catnip Shortage',
    tags: ['comedy', 'news', 'cats', 'satire'],
  },
  {
    id: 'show-4', showTitle: 'Stranger Things: Tokyo', genre: 'TV Show',
    creator: { handle: 'upside_down', avatar: '', tier: 'creator' },
    description: 'The Upside Down breaks through in Shibuya. Japanese urban legends meet Hawkins.',
    episodeCount: 6, totalLikes: 8700, totalViews: 45000,
    latestEpisode: 'S1E6 — The Shibuya Gate',
    tags: ['strangerthings', 'japan', 'horror'],
  },
];

const SAMPLE_EPISODES: EpisodeItem[] = [
  {
    id: 'ep-1', title: 'The Laundry Returns', showTitle: 'Breaking Bad: Blue Sky',
    genre: 'TV Show', type: 'Episode', season: 2, episode: 3,
    creator: { handle: 'heisenberg_fan', avatar: '', tier: 'studio' },
    description: 'Gus Fring\'s successor reopens the superlab. Walter must decide: retire or reclaim his empire.',
    likes: 2847, views: 15200, liked: false, createdAt: '2h ago', duration: '12:34',
  },
  {
    id: 'ep-2', title: 'Digital Sage Mode', showTitle: 'Naruto: Next Gen AI',
    genre: 'Anime', type: 'Episode', season: 1, episode: 15,
    creator: { handle: 'anime_remixer', avatar: '', tier: 'studio' },
    description: 'Haruki discovers a new form of chakra that merges with artificial intelligence.',
    likes: 5100, views: 42000, liked: false, createdAt: '4h ago', duration: '18:22',
  },
  {
    id: 'ep-3', title: 'Markets React to Catnip Shortage', showTitle: 'Cat News Network',
    genre: 'News Show', type: 'Episode', season: 1, episode: 42,
    creator: { handle: 'cat_news_network', avatar: '', tier: 'creator' },
    description: 'Breaking: Global catnip reserves at all-time low. Experts say this could trigger a feline recession.',
    likes: 8900, views: 89000, liked: false, createdAt: '6h ago', duration: '5:47',
  },
  {
    id: 'ep-4', title: 'The Shibuya Gate', showTitle: 'Stranger Things: Tokyo',
    genre: 'TV Show', type: 'Episode', season: 1, episode: 6,
    creator: { handle: 'upside_down', avatar: '', tier: 'creator' },
    description: 'The portal in Shibuya Crossing grows. Eleven receives a message from across the Pacific.',
    likes: 3200, views: 21000, liked: false, createdAt: '12h ago', duration: '15:08',
  },
];

// ── Main Component ──────────────────────────────────────────────
export function RxTVFeed({ user, onNavigateToStudio, onWatch }: RxTVFeedProps) {
  const [subTab, setSubTab] = useState<SubTab>('featured');
  const [shows, setShows] = useState<ShowCard[]>(SAMPLE_SHOWS);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>(SAMPLE_EPISODES);
  const [loading, setLoading] = useState(false);
  const [genreFilter, setGenreFilter] = useState('All');
  const [expandedShow, setExpandedShow] = useState('');
  const [shareItem, setShareItem] = useState<EpisodeItem | null>(null);

  // ── Load from Supabase ────────────────────────────────────────
  const loadFeed = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createSupabaseBrowser();

      // Fetch episodic content (TV Show, Anime, Cartoon, News Show)
      const tvGenres = ['TV Show', 'Anime', 'Cartoon', 'News Show', 'New Show'];
      let query = supabase
        .from('creations')
        .select('*, profiles:user_id(username, avatar_url)')
        .eq('is_public', true)
        .in('genre', tvGenres)
        .order('created_at', { ascending: false })
        .limit(50);

      if (genreFilter !== 'All') {
        query = supabase
          .from('creations')
          .select('*, profiles:user_id(username, avatar_url)')
          .eq('is_public', true)
          .eq('genre', genreFilter)
          .order('created_at', { ascending: false })
          .limit(50);
      }

      const { data: creations, error } = await query;
      if (error) { console.error('RxTV feed error:', error); return; }
      if (!creations || creations.length === 0) return;

      // Group by show_title to build show cards
      const showMap = new Map<string, { episodes: typeof creations; totalLikes: number }>();
      for (const c of creations) {
        const key = c.show_title || 'Untitled Show';
        const existing = showMap.get(key) || { episodes: [], totalLikes: 0 };
        existing.episodes.push(c);
        existing.totalLikes += c.likes_count || 0;
        showMap.set(key, existing);
      }

      const realShows: ShowCard[] = Array.from(showMap.entries()).map(([showTitle, data]) => {
        const latest = data.episodes[0];
        return {
          id: `show-${latest.id}`,
          showTitle,
          genre: latest.genre || 'TV Show',
          creator: {
            handle: latest.profiles?.username || 'anonymous',
            avatar: latest.profiles?.avatar_url || '',
            tier: 'creator',
          },
          description: latest.logline || latest.content?.slice(0, 200) || '',
          episodeCount: data.episodes.length,
          totalLikes: data.totalLikes,
          totalViews: data.totalLikes * 5,
          latestEpisode: latest.title,
          tags: latest.hashtags ? latest.hashtags.split(/[,#\s]+/).filter(Boolean).slice(0, 4) : [],
        };
      });

      const realEpisodes: EpisodeItem[] = creations.slice(0, 20).map((c: any) => ({
        id: c.id,
        title: c.title || 'Untitled Episode',
        showTitle: c.show_title || '',
        genre: c.genre || 'TV Show',
        type: c.type || 'Episode',
        season: c.season || 1,
        episode: c.episode || 1,
        creator: {
          handle: c.profiles?.username || 'anonymous',
          avatar: c.profiles?.avatar_url || '',
          tier: 'creator',
        },
        description: c.logline || c.content?.slice(0, 200) || '',
        likes: c.likes_count || 0,
        views: c.likes_count ? c.likes_count * 5 : 0,
        liked: false,
        createdAt: formatRelative(c.created_at),
      }));

      if (realShows.length > 0) setShows([...realShows, ...SAMPLE_SHOWS]);
      if (realEpisodes.length > 0) setEpisodes([...realEpisodes, ...SAMPLE_EPISODES]);
    } catch (err) {
      console.error('RxTV load error:', err);
    } finally {
      setLoading(false);
    }
  }, [genreFilter]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  // Toggle like
  function toggleLike(id: string) {
    setEpisodes(prev => prev.map(ep =>
      ep.id === id ? { ...ep, liked: !ep.liked, likes: ep.liked ? ep.likes - 1 : ep.likes + 1 } : ep
    ));
    if (user?.id) {
      fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, creationId: id }),
      }).catch(() => {});
    }
  }

  return (
    <div>
      {/* RxTV Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-4xl">📺</span>
          <div>
            <h1 className="font-display text-3xl tracking-widest">
              <span className="text-cyan">Rx</span><span className="text-white">TV</span>
            </h1>
            <p className="text-muted text-xs">AI-Generated Shows, Episodes & Series</p>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {([
          { id: 'featured', label: '⭐ Featured' },
          { id: 'shows', label: '📺 All Shows' },
          { id: 'latest', label: '✨ New Episodes' },
          { id: 'trending', label: '🔥 Trending' },
        ] as { id: SubTab; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
              subTab === t.id
                ? 'bg-cyan/10 border-2 border-cyan text-cyan'
                : 'bg-bg2 border border-border text-muted hover:text-white hover:border-bord2'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Genre filter pills */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {GENRE_FILTERS.map(g => (
          <button key={g} onClick={() => setGenreFilter(g)}
            className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${
              genreFilter === g
                ? 'text-black'
                : 'border border-border text-muted hover:text-white'
            }`}
            style={genreFilter === g ? { backgroundColor: g === 'All' ? '#fff' : (GENRE_COLORS[g] || '#fff') } : {}}>
            {g}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin text-3xl mb-2">📺</div>
          <p className="text-muted text-sm">Loading RxTV...</p>
        </div>
      )}

      {/* ── Featured: Hero show + episode grid ─────────────────── */}
      {subTab === 'featured' && !loading && (
        <div>
          {/* Hero Show */}
          {shows.length > 0 && (
            <div className="mb-8 relative bg-bg2 border border-border rounded-2xl overflow-hidden">
              <div className="h-52 sm:h-72 relative">
                {shows[0].thumbnail ? (
                  <img src={shows[0].thumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-cyan/20 via-bg2 to-rip/20 flex items-center justify-center">
                    <span className="text-8xl opacity-30">📺</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-bg2 via-bg2/50 to-transparent" />
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-black"
                    style={{ backgroundColor: GENRE_COLORS[shows[0].genre] || '#00d4ff' }}>
                    {shows[0].genre}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rip/20 backdrop-blur text-rip">
                    ⭐ Featured Show
                  </span>
                </div>
              </div>

              <div className="p-5 -mt-16 relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-cyan/20 flex items-center justify-center text-xs text-cyan font-bold">
                    {shows[0].creator.handle[0].toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-white">@{shows[0].creator.handle}</span>
                </div>
                <h2 className="font-display text-3xl text-white mb-1">{shows[0].showTitle}</h2>
                <p className="text-sm text-muted mb-2">{shows[0].description}</p>
                <div className="flex items-center gap-4 text-xs text-muted2 mb-3">
                  <span>📺 {shows[0].episodeCount} episodes</span>
                  <span>❤️ {fmtNum(shows[0].totalLikes)}</span>
                  <span>👁 {fmtNum(shows[0].totalViews)}</span>
                </div>
                {shows[0].latestEpisode && (
                  <div className="text-[10px] text-cyan mb-3">Latest: {shows[0].latestEpisode}</div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => onWatch?.(shows[0].id)}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition hover:brightness-110 active:scale-95"
                    style={{ background: 'linear-gradient(90deg,#00d4ff,#a855f7)' }}>
                    ▶ Watch Now
                  </button>
                  <button onClick={() => onNavigateToStudio?.(shows[0].showTitle, shows[0].genre)}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold border border-rip/30 text-rip hover:bg-rip/10 transition active:scale-95">
                    ☽ Create Episode
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Latest Episodes row */}
          <div className="mb-6">
            <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">🆕 New Episodes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {episodes.slice(0, 4).map(ep => (
                <EpisodeCard key={ep.id} ep={ep} onLike={toggleLike} onWatch={onWatch}
                  onShare={setShareItem} onRemix={() => onNavigateToStudio?.(ep.showTitle, ep.genre)} />
              ))}
            </div>
          </div>

          {/* Shows you might like */}
          <div>
            <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">📺 Popular Shows</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {shows.slice(1).map(show => (
                <ShowRow key={show.id} show={show} expanded={expandedShow === show.id}
                  onExpand={id => setExpandedShow(expandedShow === id ? '' : id)}
                  onWatch={onWatch} onCreateEpisode={() => onNavigateToStudio?.(show.showTitle, show.genre)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── All Shows Grid ─────────────────────────────────────── */}
      {subTab === 'shows' && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shows.map(show => (
            <ShowCard key={show.id} show={show} onWatch={onWatch}
              onCreateEpisode={() => onNavigateToStudio?.(show.showTitle, show.genre)} />
          ))}
          {shows.length === 0 && <EmptyState onNavigate={onNavigateToStudio} label="show" />}
        </div>
      )}

      {/* ── Latest Episodes ────────────────────────────────────── */}
      {subTab === 'latest' && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {episodes.map(ep => (
            <EpisodeCard key={ep.id} ep={ep} onLike={toggleLike} onWatch={onWatch}
              onShare={setShareItem} onRemix={() => onNavigateToStudio?.(ep.showTitle, ep.genre)} />
          ))}
          {episodes.length === 0 && <EmptyState onNavigate={onNavigateToStudio} label="episode" />}
        </div>
      )}

      {/* ── Trending ───────────────────────────────────────────── */}
      {subTab === 'trending' && !loading && (
        <div>
          {episodes.length > 0 && (
            <div className="mb-6">
              <TrendingHero ep={episodes[0]} onLike={toggleLike} onWatch={onWatch}
                onRemix={() => onNavigateToStudio?.(episodes[0].showTitle, episodes[0].genre)} />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {episodes.slice(1).map((ep, i) => (
              <EpisodeCard key={ep.id} ep={ep} onLike={toggleLike} onWatch={onWatch}
                onShare={setShareItem} onRemix={() => onNavigateToStudio?.(ep.showTitle, ep.genre)}
                rank={i + 2} />
            ))}
          </div>
        </div>
      )}

      {/* Share Dialog */}
      <ShareDialog isOpen={!!shareItem} onClose={() => setShareItem(null)}
        title={shareItem?.title || ''} description={shareItem?.description}
        url={`https://remixip.icu/watch/${shareItem?.id || ''}`}
        type="creation" />
    </div>
  );
}

// ── Episode Card ────────────────────────────────────────────────
function EpisodeCard({ ep, onLike, onWatch, onShare, onRemix, rank }: {
  ep: EpisodeItem; onLike: (id: string) => void; onWatch?: (id: string) => void;
  onShare: (ep: EpisodeItem) => void; onRemix: () => void; rank?: number;
}) {
  return (
    <div className="bg-bg2 border border-border rounded-xl overflow-hidden hover:border-cyan/40 transition-all cursor-pointer group"
      onClick={() => onWatch?.(ep.id)}>
      {/* Thumbnail */}
      <div className="h-36 relative bg-bg3">
        {ep.thumbnail ? (
          <img src={ep.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-cyan/10 to-bg3 flex items-center justify-center">
            <span className="text-4xl opacity-20 group-hover:opacity-40 transition-opacity">📺</span>
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur flex items-center justify-center">
            <span className="text-white text-xl ml-0.5">▶</span>
          </div>
        </div>
        {/* Genre badge */}
        <div className="absolute top-2 left-2">
          <span className="px-2 py-0.5 rounded-full text-[8px] font-bold text-black"
            style={{ backgroundColor: GENRE_COLORS[ep.genre] || '#00d4ff' }}>
            {ep.genre}
          </span>
        </div>
        {/* Duration */}
        {ep.duration && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-white font-mono">
            {ep.duration}
          </div>
        )}
        {/* Rank badge */}
        {rank && (
          <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-rip flex items-center justify-center text-[10px] font-bold text-white">
            #{rank}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-5 h-5 rounded-full bg-cyan/20 flex items-center justify-center text-[8px] text-cyan font-bold">
            {ep.creator.handle[0].toUpperCase()}
          </div>
          <span className="text-[10px] font-bold text-white truncate">@{ep.creator.handle}</span>
          <span className="text-[8px] text-muted ml-auto flex-shrink-0">{ep.createdAt}</span>
        </div>

        <h3 className="font-display text-base text-white leading-tight mb-0.5 line-clamp-1">{ep.title}</h3>
        <p className="text-[10px] text-cyan/70 mb-1">{ep.showTitle} — S{ep.season}E{ep.episode}</p>
        <p className="text-[10px] text-muted leading-relaxed line-clamp-2 mb-2">{ep.description}</p>

        <div className="flex items-center gap-3 text-[10px] text-muted pt-2 border-t border-border">
          <button onClick={e => { e.stopPropagation(); onLike(ep.id); }}
            className={`flex items-center gap-1 transition-all ${ep.liked ? 'text-rip' : 'hover:text-rip'}`}>
            {ep.liked ? '❤️' : '🤍'} {fmtNum(ep.likes)}
          </button>
          <span className="flex items-center gap-1">👁 {fmtNum(ep.views)}</span>
          <button onClick={e => { e.stopPropagation(); onShare(ep); }}
            className="hover:text-lime transition-all">📤</button>
          <button onClick={e => { e.stopPropagation(); onRemix(); }}
            className="ml-auto px-2 py-0.5 rounded text-[9px] font-bold border border-rip/30 text-rip hover:bg-rip/10 transition active:scale-95">
            ☽ Remix
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Show Card (grid view) ───────────────────────────────────────
function ShowCard({ show, onWatch, onCreateEpisode }: {
  show: ShowCard; onWatch?: (id: string) => void; onCreateEpisode: () => void;
}) {
  return (
    <div className="bg-bg2 border border-border rounded-xl overflow-hidden hover:border-cyan/40 transition-all">
      <div className="h-40 relative bg-bg3">
        {show.thumbnail ? (
          <img src={show.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-cyan/10 to-rip/10 flex items-center justify-center">
            <span className="text-6xl opacity-20">📺</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg2 to-transparent" />
        <div className="absolute top-2 left-2">
          <span className="px-2 py-0.5 rounded-full text-[8px] font-bold text-black"
            style={{ backgroundColor: GENRE_COLORS[show.genre] || '#00d4ff' }}>
            {show.genre}
          </span>
        </div>
      </div>

      <div className="p-4 -mt-8 relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-cyan/20 flex items-center justify-center text-[8px] text-cyan font-bold">
            {show.creator.handle[0].toUpperCase()}
          </div>
          <span className="text-[10px] font-bold text-white">@{show.creator.handle}</span>
        </div>
        <h3 className="font-display text-xl text-white mb-1">{show.showTitle}</h3>
        <p className="text-[10px] text-muted line-clamp-2 mb-2">{show.description}</p>
        <div className="flex items-center gap-3 text-[10px] text-muted2 mb-3">
          <span>📺 {show.episodeCount} eps</span>
          <span>❤️ {fmtNum(show.totalLikes)}</span>
          <span>👁 {fmtNum(show.totalViews)}</span>
        </div>
        {show.latestEpisode && (
          <div className="text-[9px] text-cyan/70 mb-3 truncate">Latest: {show.latestEpisode}</div>
        )}
        <div className="flex gap-2">
          <button onClick={() => onWatch?.(show.id)}
            className="flex-1 px-3 py-2 rounded-lg text-[10px] font-bold text-white transition hover:brightness-110"
            style={{ background: 'linear-gradient(90deg,#00d4ff,#a855f7)' }}>
            ▶ Watch
          </button>
          <button onClick={onCreateEpisode}
            className="px-3 py-2 rounded-lg text-[10px] font-bold border border-rip/30 text-rip hover:bg-rip/10 transition">
            ☽ Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Show Row (compact, for featured tab) ────────────────────────
function ShowRow({ show, expanded, onExpand, onWatch, onCreateEpisode }: {
  show: ShowCard; expanded: boolean; onExpand: (id: string) => void;
  onWatch?: (id: string) => void; onCreateEpisode: () => void;
}) {
  return (
    <div className={`bg-bg2 border rounded-xl p-3 cursor-pointer transition-all ${
      expanded ? 'border-cyan' : 'border-border hover:border-bord2'
    }`} onClick={() => onExpand(show.id)}>
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-cyan/20 to-rip/20 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">📺</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-display text-sm text-white truncate">{show.showTitle}</h4>
            <span className="px-1.5 py-0.5 rounded-full text-[7px] font-bold text-black flex-shrink-0"
              style={{ backgroundColor: GENRE_COLORS[show.genre] || '#00d4ff' }}>
              {show.genre}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[9px] text-muted mt-0.5">
            <span>@{show.creator.handle}</span>
            <span>·</span>
            <span>{show.episodeCount} eps</span>
            <span>·</span>
            <span>❤️ {fmtNum(show.totalLikes)}</span>
          </div>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border animate-slide-up">
          <p className="text-xs text-muted mb-2">{show.description}</p>
          {show.latestEpisode && (
            <p className="text-[9px] text-cyan/70 mb-2">Latest: {show.latestEpisode}</p>
          )}
          <div className="flex gap-2">
            <button onClick={e => { e.stopPropagation(); onWatch?.(show.id); }}
              className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white"
              style={{ background: 'linear-gradient(90deg,#00d4ff,#a855f7)' }}>
              ▶ Watch
            </button>
            <button onClick={e => { e.stopPropagation(); onCreateEpisode(); }}
              className="px-3 py-1.5 rounded-lg text-[10px] font-bold border border-rip/30 text-rip hover:bg-rip/10">
              ☽ New Episode
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Trending Hero ───────────────────────────────────────────────
function TrendingHero({ ep, onLike, onWatch, onRemix }: {
  ep: EpisodeItem; onLike: (id: string) => void; onWatch?: (id: string) => void; onRemix: () => void;
}) {
  return (
    <div className="relative bg-bg2 border border-border rounded-2xl overflow-hidden cursor-pointer"
      onClick={() => onWatch?.(ep.id)}>
      <div className="h-48 sm:h-56 relative">
        {ep.thumbnail ? (
          <img src={ep.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-rip/20 via-bg2 to-cyan/20 flex items-center justify-center">
            <span className="text-8xl opacity-20">🔥</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg2 via-bg2/40 to-transparent" />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rip text-white">🔥 #1 Trending</span>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-black"
            style={{ backgroundColor: GENRE_COLORS[ep.genre] || '#00d4ff' }}>
            {ep.genre}
          </span>
        </div>
      </div>
      <div className="p-5 -mt-12 relative z-10">
        <h2 className="font-display text-2xl text-white mb-0.5">{ep.title}</h2>
        <p className="text-[10px] text-cyan/70 mb-2">{ep.showTitle} — S{ep.season}E{ep.episode}</p>
        <p className="text-sm text-muted mb-3">{ep.description}</p>
        <div className="flex items-center gap-4">
          <button onClick={e => { e.stopPropagation(); onLike(ep.id); }}
            className={`flex items-center gap-1.5 text-sm transition ${ep.liked ? 'text-rip' : 'text-muted hover:text-rip'}`}>
            {ep.liked ? '❤️' : '🤍'} <span className="text-xs font-bold">{fmtNum(ep.likes)}</span>
          </button>
          <span className="flex items-center gap-1.5 text-sm text-muted">
            👁 <span className="text-xs">{fmtNum(ep.views)}</span>
          </span>
          <div className="flex-1" />
          <button onClick={e => { e.stopPropagation(); onRemix(); }}
            className="px-4 py-2 rounded-lg text-xs font-bold text-white transition hover:brightness-110"
            style={{ background: 'linear-gradient(90deg,#ff2d78,#a855f7)' }}>
            ☽ Remix This
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Empty State ─────────────────────────────────────────────────
function EmptyState({ onNavigate, label }: {
  onNavigate?: (s: string, c: string) => void; label: string;
}) {
  return (
    <div className="col-span-full text-center py-16">
      <div className="text-5xl mb-3">📺</div>
      <h3 className="font-display text-xl text-white mb-1">No {label}s yet</h3>
      <p className="text-muted text-sm mb-4">Be the first to publish on RxTV!</p>
      <button onClick={() => onNavigate?.('', '')}
        className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition hover:brightness-110"
        style={{ background: 'linear-gradient(90deg,#00d4ff,#a855f7)' }}>
        ☽ Create a Show
      </button>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────
function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
