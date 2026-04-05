'use client';
// components/discover/RxMoviesFeed.tsx
// 🎬 RxMovies — Films, shorts, and cinematic AI content
// Letterboxd/IMDb-style browsing for AI-generated movies
import { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { createSupabaseBrowser } from '@/lib/supabase';
import { ShareDialog } from '../shared/ShareDialog';

// ── Types ───────────────────────────────────────────────────────
interface RxMoviesFeedProps {
  user: User | null;
  onNavigateToStudio?: (showName: string, category: string) => void;
  onWatch?: (creationId: string) => void;
}

type MovieItem = {
  id: string;
  title: string;
  genre: string;
  subGenre?: string;
  creator: { handle: string; avatar: string; tier: string };
  thumbnail?: string;
  posterUrl?: string;
  videoUrl?: string;
  description: string;
  likes: number;
  views: number;
  liked: boolean;
  createdAt: string;
  duration?: string;
  tags: string[];
  rating?: number; // 1-5 stars
  mediaType: 'movie' | 'short' | 'trailer' | 'music-video';
};

type SubTab = 'now-showing' | 'shorts' | 'latest' | 'top-rated';

const MOVIE_GENRES = ['All', 'Movie', 'Short Film', 'Music Video', 'Anime', 'Documentary'];
const GENRE_COLORS: Record<string, string> = {
  'Movie': '#ff6b35', 'Short Film': '#a855f7', 'Music Video': '#ff2d78',
  'Anime': '#ff2d78', 'Documentary': '#00d4ff',
};

// ── Sample Data ─────────────────────────────────────────────────
const SAMPLE_MOVIES: MovieItem[] = [
  {
    id: 'mov-1', title: 'The Last Prompt', genre: 'Movie', subGenre: 'Sci-Fi',
    creator: { handle: 'cinema_ai', avatar: '', tier: 'studio' },
    description: 'In 2045, the last human screenwriter discovers that AI has been writing reality itself. A mind-bending thriller about creation and consciousness.',
    likes: 24000, views: 180000, liked: false, createdAt: '1d ago',
    duration: '1:42:00', tags: ['scifi', 'thriller', 'ai', 'consciousness'],
    rating: 4.8, mediaType: 'movie',
  },
  {
    id: 'mov-2', title: 'Neon Ronin', genre: 'Anime', subGenre: 'Cyberpunk',
    creator: { handle: 'anime_remixer', avatar: '', tier: 'studio' },
    description: 'A rogue AI samurai navigates the neon-lit streets of Neo-Osaka, fighting corporate algorithms that control the city.',
    likes: 18500, views: 95000, liked: false, createdAt: '3d ago',
    duration: '52:18', tags: ['anime', 'cyberpunk', 'action', 'samurai'],
    rating: 4.6, mediaType: 'movie',
  },
  {
    id: 'mov-3', title: '60 Seconds of Chaos', genre: 'Short Film', subGenre: 'Comedy',
    creator: { handle: 'quick_cuts', avatar: '', tier: 'creator' },
    description: 'A one-minute short where everything that can go wrong does. Generated entirely with Kling AI in a single session.',
    likes: 42000, views: 350000, liked: false, createdAt: '5h ago',
    duration: '1:00', tags: ['comedy', 'short', 'viral', 'chaos'],
    rating: 4.2, mediaType: 'short',
  },
  {
    id: 'mov-4', title: 'Echoes in the Machine', genre: 'Music Video', subGenre: 'Electronic',
    creator: { handle: 'ai_composer', avatar: '', tier: 'studio' },
    description: 'Visual album exploring the boundary between human emotion and artificial intelligence. Music by AI, visuals by AI, feelings by you.',
    likes: 8900, views: 67000, liked: false, createdAt: '2d ago',
    duration: '4:32', tags: ['musicvideo', 'electronic', 'visual', 'ambient'],
    rating: 4.4, mediaType: 'music-video',
  },
  {
    id: 'mov-5', title: 'The Pixel Detective', genre: 'Short Film', subGenre: 'Noir',
    creator: { handle: 'noir_vision', avatar: '', tier: 'creator' },
    description: 'A hard-boiled detective in a world made of pixels. When sprites start disappearing, someone has to investigate.',
    likes: 5600, views: 28000, liked: false, createdAt: '1d ago',
    duration: '8:45', tags: ['noir', 'animation', 'mystery', 'retro'],
    rating: 4.1, mediaType: 'short',
  },
];

const MEDIA_LABELS: Record<string, { icon: string; label: string }> = {
  movie:        { icon: '🎬', label: 'Feature' },
  short:        { icon: '🎞️', label: 'Short' },
  trailer:      { icon: '📽️', label: 'Trailer' },
  'music-video': { icon: '🎵', label: 'Music Video' },
};

// ── Main Component ──────────────────────────────────────────────
export function RxMoviesFeed({ user, onNavigateToStudio, onWatch }: RxMoviesFeedProps) {
  const [subTab, setSubTab] = useState<SubTab>('now-showing');
  const [movies, setMovies] = useState<MovieItem[]>(SAMPLE_MOVIES);
  const [loading, setLoading] = useState(false);
  const [genreFilter, setGenreFilter] = useState('All');
  const [shareItem, setShareItem] = useState<MovieItem | null>(null);

  // ── Load from Supabase ────────────────────────────────────────
  const loadFeed = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createSupabaseBrowser();

      const movieGenres = ['Movie', 'Short Film', 'Music Video'];
      const movieTypes = ['Movie', 'Full Movie', 'Short Film', 'Music', 'Trailer'];

      let query = supabase
        .from('creations')
        .select('*, profiles:user_id(username, avatar_url)')
        .eq('is_public', true)
        .or(`genre.in.(${movieGenres.join(',')}),type.in.(${movieTypes.join(',')})`)
        .order('created_at', { ascending: false })
        .limit(30);

      if (genreFilter !== 'All') {
        query = supabase
          .from('creations')
          .select('*, profiles:user_id(username, avatar_url)')
          .eq('is_public', true)
          .eq('genre', genreFilter)
          .order('created_at', { ascending: false })
          .limit(30);
      }

      const { data: creations, error } = await query;
      if (error) { console.error('RxMovies feed error:', error); return; }
      if (!creations || creations.length === 0) return;

      const realMovies: MovieItem[] = creations.map((c: any) => ({
        id: c.id,
        title: c.title || c.show_title || 'Untitled',
        genre: c.genre || 'Movie',
        subGenre: '',
        creator: {
          handle: c.profiles?.username || 'anonymous',
          avatar: c.profiles?.avatar_url || '',
          tier: 'creator',
        },
        description: c.logline || c.content?.slice(0, 300) || '',
        likes: c.likes_count || 0,
        views: c.likes_count ? c.likes_count * 5 : 0,
        liked: false,
        createdAt: formatRelative(c.created_at),
        tags: c.hashtags ? c.hashtags.split(/[,#\s]+/).filter(Boolean).slice(0, 5) : [],
        mediaType: mapMovieType(c.type, c.genre),
      }));

      setMovies([...realMovies, ...SAMPLE_MOVIES]);
    } catch (err) {
      console.error('RxMovies load error:', err);
    } finally {
      setLoading(false);
    }
  }, [genreFilter]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  function toggleLike(id: string) {
    setMovies(prev => prev.map(m =>
      m.id === id ? { ...m, liked: !m.liked, likes: m.liked ? m.likes - 1 : m.likes + 1 } : m
    ));
    if (user?.id) {
      fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, creationId: id }),
      }).catch(() => {});
    }
  }

  // Derived lists
  const features = movies.filter(m => m.mediaType === 'movie');
  const shorts = movies.filter(m => m.mediaType === 'short' || m.mediaType === 'music-video' || m.mediaType === 'trailer');
  const topRated = [...movies].sort((a, b) => (b.rating || 0) - (a.rating || 0));

  return (
    <div>
      {/* RxMovies Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-4xl">🎬</span>
          <div>
            <h1 className="font-display text-3xl tracking-widest">
              <span className="text-rip">Rx</span><span className="text-white">Movies</span>
            </h1>
            <p className="text-muted text-xs">AI-Generated Films, Shorts & Cinematic Experiences</p>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {([
          { id: 'now-showing', label: '🍿 Now Showing' },
          { id: 'shorts', label: '🎞️ Shorts & Clips' },
          { id: 'latest', label: '✨ Latest' },
          { id: 'top-rated', label: '⭐ Top Rated' },
        ] as { id: SubTab; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
              subTab === t.id
                ? 'bg-rip/10 border-2 border-rip text-rip'
                : 'bg-bg2 border border-border text-muted hover:text-white hover:border-bord2'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Genre filter */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {MOVIE_GENRES.map(g => (
          <button key={g} onClick={() => setGenreFilter(g)}
            className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${
              genreFilter === g
                ? 'text-black'
                : 'border border-border text-muted hover:text-white'
            }`}
            style={genreFilter === g ? { backgroundColor: g === 'All' ? '#fff' : (GENRE_COLORS[g] || '#ff6b35') } : {}}>
            {g}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin text-3xl mb-2">🎬</div>
          <p className="text-muted text-sm">Loading RxMovies...</p>
        </div>
      )}

      {/* ── Now Showing: Featured Film + Poster Grid ───────────── */}
      {subTab === 'now-showing' && !loading && (
        <div>
          {/* Hero Film */}
          {features.length > 0 && (
            <div className="mb-8 relative bg-bg2 border border-border rounded-2xl overflow-hidden">
              <div className="h-56 sm:h-80 relative">
                {features[0].posterUrl || features[0].thumbnail ? (
                  <img src={features[0].posterUrl || features[0].thumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-rip/30 via-bg2 to-orange-500/20 flex items-center justify-center">
                    <span className="text-[100px] opacity-20">🎬</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-bg2 via-bg2/60 to-transparent" />
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-500 text-white">
                    🍿 Now Showing
                  </span>
                  {features[0].rating && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-yellow-400/20 text-yellow-400 backdrop-blur">
                      ⭐ {features[0].rating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6 -mt-20 relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-rip/20 flex items-center justify-center text-xs text-rip font-bold">
                    {features[0].creator.handle[0].toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-white">@{features[0].creator.handle}</span>
                  {features[0].subGenre && (
                    <span className="text-[9px] text-muted2 border border-border px-2 py-0.5 rounded-full">{features[0].subGenre}</span>
                  )}
                </div>
                <h2 className="font-display text-4xl text-white mb-2 leading-tight">{features[0].title}</h2>
                <p className="text-sm text-muted mb-3 max-w-2xl">{features[0].description}</p>
                <div className="flex items-center gap-4 text-xs text-muted2 mb-4">
                  {features[0].duration && <span>🕐 {features[0].duration}</span>}
                  <span>❤️ {fmtNum(features[0].likes)}</span>
                  <span>👁 {fmtNum(features[0].views)}</span>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => onWatch?.(features[0].id)}
                    className="px-6 py-3 rounded-xl text-sm font-bold text-white transition hover:brightness-110 active:scale-95"
                    style={{ background: 'linear-gradient(90deg,#ff6b35,#ff2d78)' }}>
                    ▶ Watch Film
                  </button>
                  <button onClick={() => onNavigateToStudio?.(features[0].title, features[0].genre)}
                    className="px-6 py-3 rounded-xl text-sm font-bold border border-rip/30 text-rip hover:bg-rip/10 transition active:scale-95">
                    ☽ Create Sequel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Movie Poster Grid */}
          <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">🎬 All Films</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {features.slice(1).concat(movies.filter(m => m.mediaType !== 'movie').slice(0, 2)).map(movie => (
              <MoviePoster key={movie.id} movie={movie} onLike={toggleLike} onWatch={onWatch}
                onShare={setShareItem} onRemix={() => onNavigateToStudio?.(movie.title, movie.genre)} />
            ))}
          </div>
        </div>
      )}

      {/* ── Shorts & Clips ─────────────────────────────────────── */}
      {subTab === 'shorts' && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shorts.length > 0 ? shorts.map(movie => (
            <MovieCard key={movie.id} movie={movie} onLike={toggleLike} onWatch={onWatch}
              onShare={setShareItem} onRemix={() => onNavigateToStudio?.(movie.title, movie.genre)} />
          )) : (
            <EmptyState onNavigate={onNavigateToStudio} label="short film" />
          )}
        </div>
      )}

      {/* ── Latest ─────────────────────────────────────────────── */}
      {subTab === 'latest' && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {movies.length > 0 ? movies.map(movie => (
            <MovieCard key={movie.id} movie={movie} onLike={toggleLike} onWatch={onWatch}
              onShare={setShareItem} onRemix={() => onNavigateToStudio?.(movie.title, movie.genre)} />
          )) : (
            <EmptyState onNavigate={onNavigateToStudio} label="film" />
          )}
        </div>
      )}

      {/* ── Top Rated ──────────────────────────────────────────── */}
      {subTab === 'top-rated' && !loading && (
        <div>
          {topRated.length > 0 && (
            <div className="mb-6">
              <TopRatedHero movie={topRated[0]} onLike={toggleLike} onWatch={onWatch}
                onRemix={() => onNavigateToStudio?.(topRated[0].title, topRated[0].genre)} />
            </div>
          )}
          <div className="space-y-3">
            {topRated.slice(1).map((movie, i) => (
              <RankedRow key={movie.id} movie={movie} rank={i + 2} onLike={toggleLike}
                onWatch={onWatch} onRemix={() => onNavigateToStudio?.(movie.title, movie.genre)} />
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

// ── Movie Poster (compact, Letterboxd-style) ────────────────────
function MoviePoster({ movie, onLike, onWatch, onShare, onRemix }: {
  movie: MovieItem; onLike: (id: string) => void; onWatch?: (id: string) => void;
  onShare: (m: MovieItem) => void; onRemix: () => void;
}) {
  const info = MEDIA_LABELS[movie.mediaType] || MEDIA_LABELS.movie;
  return (
    <div className="group cursor-pointer" onClick={() => onWatch?.(movie.id)}>
      {/* Poster */}
      <div className="aspect-[2/3] relative bg-bg2 border border-border rounded-xl overflow-hidden mb-2 hover:border-rip/40 transition-all">
        {movie.posterUrl || movie.thumbnail ? (
          <img src={movie.posterUrl || movie.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-rip/20 via-bg3 to-orange-500/10 flex items-center justify-center">
            <span className="text-5xl opacity-20 group-hover:opacity-40 transition-opacity">{info.icon}</span>
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-1">
            <span className="text-white text-xl ml-0.5">▶</span>
          </div>
          <p className="text-[9px] text-white/80 text-center line-clamp-3">{movie.description}</p>
          <div className="flex gap-2 mt-1">
            <button onClick={e => { e.stopPropagation(); onLike(movie.id); }}
              className={`text-sm ${movie.liked ? 'text-rip' : 'text-white/60 hover:text-rip'}`}>
              {movie.liked ? '❤️' : '🤍'}
            </button>
            <button onClick={e => { e.stopPropagation(); onShare(movie); }}
              className="text-sm text-white/60 hover:text-lime">📤</button>
            <button onClick={e => { e.stopPropagation(); onRemix(); }}
              className="text-sm text-white/60 hover:text-rip">☽</button>
          </div>
        </div>
        {/* Type badge */}
        <div className="absolute top-2 left-2">
          <span className="px-1.5 py-0.5 rounded text-[7px] font-bold bg-black/60 backdrop-blur text-white">
            {info.icon} {info.label}
          </span>
        </div>
        {/* Duration */}
        {movie.duration && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-[8px] text-white font-mono">
            {movie.duration}
          </div>
        )}
        {/* Rating */}
        {movie.rating && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-yellow-500/20 backdrop-blur text-[8px] text-yellow-400 font-bold">
            ⭐ {movie.rating.toFixed(1)}
          </div>
        )}
      </div>
      {/* Title */}
      <h4 className="font-display text-sm text-white truncate">{movie.title}</h4>
      <div className="flex items-center gap-2 text-[9px] text-muted">
        <span>@{movie.creator.handle}</span>
        <span>·</span>
        <span>❤️ {fmtNum(movie.likes)}</span>
      </div>
    </div>
  );
}

// ── Movie Card (landscape, for lists) ───────────────────────────
function MovieCard({ movie, onLike, onWatch, onShare, onRemix }: {
  movie: MovieItem; onLike: (id: string) => void; onWatch?: (id: string) => void;
  onShare: (m: MovieItem) => void; onRemix: () => void;
}) {
  const info = MEDIA_LABELS[movie.mediaType] || MEDIA_LABELS.movie;
  return (
    <div className="bg-bg2 border border-border rounded-xl overflow-hidden hover:border-rip/40 transition-all cursor-pointer group"
      onClick={() => onWatch?.(movie.id)}>
      <div className="h-40 relative bg-bg3">
        {movie.thumbnail ? (
          <img src={movie.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-rip/10 to-orange-500/10 flex items-center justify-center">
            <span className="text-4xl opacity-20 group-hover:opacity-40 transition">{info.icon}</span>
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur flex items-center justify-center">
            <span className="text-white text-xl ml-0.5">▶</span>
          </div>
        </div>
        <div className="absolute top-2 left-2 flex gap-1.5">
          <span className="px-1.5 py-0.5 rounded text-[7px] font-bold bg-black/60 backdrop-blur text-white">
            {info.icon} {info.label}
          </span>
          {movie.genre !== 'Movie' && (
            <span className="px-1.5 py-0.5 rounded-full text-[7px] font-bold text-black"
              style={{ backgroundColor: GENRE_COLORS[movie.genre] || '#ff6b35' }}>
              {movie.genre}
            </span>
          )}
        </div>
        {movie.duration && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-[8px] text-white font-mono">
            {movie.duration}
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-5 h-5 rounded-full bg-rip/20 flex items-center justify-center text-[8px] text-rip font-bold">
            {movie.creator.handle[0].toUpperCase()}
          </div>
          <span className="text-[10px] font-bold text-white truncate">@{movie.creator.handle}</span>
          <span className="text-[8px] text-muted ml-auto flex-shrink-0">{movie.createdAt}</span>
        </div>
        <h3 className="font-display text-base text-white leading-tight mb-1 line-clamp-1">{movie.title}</h3>
        <p className="text-[10px] text-muted line-clamp-2 mb-2">{movie.description}</p>

        <div className="flex items-center gap-3 text-[10px] text-muted pt-2 border-t border-border">
          <button onClick={e => { e.stopPropagation(); onLike(movie.id); }}
            className={`flex items-center gap-1 transition ${movie.liked ? 'text-rip' : 'hover:text-rip'}`}>
            {movie.liked ? '❤️' : '🤍'} {fmtNum(movie.likes)}
          </button>
          <span className="flex items-center gap-1">👁 {fmtNum(movie.views)}</span>
          {movie.rating && <span className="text-yellow-400">⭐ {movie.rating.toFixed(1)}</span>}
          <button onClick={e => { e.stopPropagation(); onShare(movie); }}
            className="hover:text-lime transition">📤</button>
          <button onClick={e => { e.stopPropagation(); onRemix(); }}
            className="ml-auto px-2 py-0.5 rounded text-[9px] font-bold border border-rip/30 text-rip hover:bg-rip/10 transition active:scale-95">
            ☽ Remix
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Top Rated Hero ──────────────────────────────────────────────
function TopRatedHero({ movie, onLike, onWatch, onRemix }: {
  movie: MovieItem; onLike: (id: string) => void; onWatch?: (id: string) => void; onRemix: () => void;
}) {
  return (
    <div className="relative bg-bg2 border border-border rounded-2xl overflow-hidden cursor-pointer"
      onClick={() => onWatch?.(movie.id)}>
      <div className="h-48 sm:h-60 relative">
        {movie.posterUrl || movie.thumbnail ? (
          <img src={movie.posterUrl || movie.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-yellow-500/20 via-bg2 to-rip/20 flex items-center justify-center">
            <span className="text-8xl opacity-20">⭐</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg2 via-bg2/40 to-transparent" />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-yellow-500 text-black">⭐ #1 Top Rated</span>
          {movie.rating && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-yellow-400/20 text-yellow-400 backdrop-blur">
              {movie.rating.toFixed(1)} / 5
            </span>
          )}
        </div>
      </div>
      <div className="p-5 -mt-12 relative z-10">
        <h2 className="font-display text-2xl text-white mb-1">{movie.title}</h2>
        <p className="text-sm text-muted mb-3 max-w-xl">{movie.description}</p>
        <div className="flex items-center gap-4">
          <button onClick={e => { e.stopPropagation(); onLike(movie.id); }}
            className={`flex items-center gap-1.5 text-sm transition ${movie.liked ? 'text-rip' : 'text-muted hover:text-rip'}`}>
            {movie.liked ? '❤️' : '🤍'} <span className="text-xs font-bold">{fmtNum(movie.likes)}</span>
          </button>
          <span className="text-sm text-muted">👁 {fmtNum(movie.views)}</span>
          <div className="flex-1" />
          <button onClick={e => { e.stopPropagation(); onRemix(); }}
            className="px-4 py-2 rounded-lg text-xs font-bold text-white transition hover:brightness-110"
            style={{ background: 'linear-gradient(90deg,#ff6b35,#ff2d78)' }}>
            ☽ Remix This
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Ranked Row ──────────────────────────────────────────────────
function RankedRow({ movie, rank, onLike, onWatch, onRemix }: {
  movie: MovieItem; rank: number; onLike: (id: string) => void;
  onWatch?: (id: string) => void; onRemix: () => void;
}) {
  return (
    <div className="bg-bg2 border border-border rounded-xl p-3 flex items-center gap-3 hover:border-rip/40 transition-all cursor-pointer"
      onClick={() => onWatch?.(movie.id)}>
      <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center text-lg font-display text-yellow-400 flex-shrink-0">
        #{rank}
      </div>
      <div className="w-16 h-16 rounded-lg bg-bg3 flex-shrink-0 overflow-hidden">
        {movie.thumbnail ? (
          <img src={movie.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl opacity-20">🎬</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-display text-sm text-white truncate">{movie.title}</h4>
        <div className="flex items-center gap-2 text-[9px] text-muted mt-0.5">
          <span>@{movie.creator.handle}</span>
          {movie.rating && <span className="text-yellow-400">⭐ {movie.rating.toFixed(1)}</span>}
          <span>❤️ {fmtNum(movie.likes)}</span>
          {movie.duration && <span>🕐 {movie.duration}</span>}
        </div>
      </div>
      <button onClick={e => { e.stopPropagation(); onRemix(); }}
        className="px-3 py-1.5 rounded-lg text-[9px] font-bold border border-rip/30 text-rip hover:bg-rip/10 transition flex-shrink-0">
        ☽ Remix
      </button>
    </div>
  );
}

// ── Empty State ─────────────────────────────────────────────────
function EmptyState({ onNavigate, label }: {
  onNavigate?: (s: string, c: string) => void; label: string;
}) {
  return (
    <div className="col-span-full text-center py-16">
      <div className="text-5xl mb-3">🎬</div>
      <h3 className="font-display text-xl text-white mb-1">No {label}s yet</h3>
      <p className="text-muted text-sm mb-4">Be the first to publish on RxMovies!</p>
      <button onClick={() => onNavigate?.('', '')}
        className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition hover:brightness-110"
        style={{ background: 'linear-gradient(90deg,#ff6b35,#ff2d78)' }}>
        ☽ Create a Film
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

function mapMovieType(type?: string, genre?: string): 'movie' | 'short' | 'trailer' | 'music-video' {
  const t = (type || '').toLowerCase();
  const g = (genre || '').toLowerCase();
  if (t.includes('trailer')) return 'trailer';
  if (t.includes('music') || g.includes('music')) return 'music-video';
  if (t.includes('short') || g.includes('short')) return 'short';
  return 'movie';
}
