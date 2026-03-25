// lib/tmdb.ts
// TMDB (The Movie Database) API client
// Provides real poster images, character headshots, and full cast data
// Free API: https://developer.themoviedb.org/docs/getting-started
// ═══════════════════════════════════════════════════════════════

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// ── Image URL helpers ────────────────────────────────────────
export const tmdbImage = {
  poster:    (path: string | null, size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w342') => path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null,
  backdrop:  (path: string | null, size: 'w300' | 'w780' | 'w1280' | 'original' = 'w780') => path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null,
  profile:   (path: string | null, size: 'w45' | 'w185' | 'h632' | 'original' = 'w185') => path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null,
  still:     (path: string | null, size: 'w92' | 'w185' | 'w300' | 'original' = 'w300') => path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null,
};

// ── Types ────────────────────────────────────────────────────
export interface TMDBSearchResult {
  id: number;
  name?: string;         // TV shows
  title?: string;        // Movies
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  first_air_date?: string;
  release_date?: string;
  vote_average: number;
  media_type?: 'tv' | 'movie';
  genre_ids: number[];
}

export interface TMDBCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
  known_for_department: string;
  popularity: number;
  gender: number;
  roles?: { character: string; episode_count: number }[]; // for aggregate_credits
}

export interface TMDBShowDetails {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  first_air_date: string;
  vote_average: number;
  number_of_seasons: number;
  number_of_episodes: number;
  genres: { id: number; name: string }[];
  status: string;
  networks: { id: number; name: string; logo_path: string | null }[];
}

export interface TMDBMovieDetails {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date: string;
  vote_average: number;
  runtime: number;
  genres: { id: number; name: string }[];
  budget: number;
  revenue: number;
}

// ── API client ───────────────────────────────────────────────
class TMDBClient {
  private apiKey: string;       // v3 API key (short hex string)
  private readToken: string;    // v4 Read Access Token (JWT)

  constructor() {
    this.apiKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY || '';
    this.readToken = process.env.TMDB_READ_ACCESS_TOKEN || process.env.NEXT_PUBLIC_TMDB_READ_ACCESS_TOKEN || '';
  }

  private async fetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${TMDB_BASE}${endpoint}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    // Prefer v4 Bearer token auth (uses Read Access Token JWT)
    const bearerToken = this.readToken || this.apiKey;
    const res = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Accept': 'application/json',
      },
      next: { revalidate: 86400 }, // Cache for 24h in Next.js
    });

    if (!res.ok) {
      // Fallback: try v3 query param auth (uses API key)
      const fallbackUrl = new URL(`${TMDB_BASE}${endpoint}`);
      fallbackUrl.searchParams.set('api_key', this.apiKey);
      Object.entries(params).forEach(([k, v]) => fallbackUrl.searchParams.set(k, v));

      const fallbackRes = await fetch(fallbackUrl.toString(), {
        next: { revalidate: 86400 },
      });

      if (!fallbackRes.ok) {
        throw new Error(`TMDB API error: ${res.status} ${res.statusText}`);
      }
      return fallbackRes.json();
    }

    return res.json();
  }

  // ── Search ─────────────────────────────────────────────────
  async searchTV(query: string): Promise<TMDBSearchResult[]> {
    const data = await this.fetch<{ results: TMDBSearchResult[] }>('/search/tv', { query });
    return data.results;
  }

  async searchMovie(query: string): Promise<TMDBSearchResult[]> {
    const data = await this.fetch<{ results: TMDBSearchResult[] }>('/search/movie', { query });
    return data.results;
  }

  async searchMulti(query: string): Promise<TMDBSearchResult[]> {
    const data = await this.fetch<{ results: TMDBSearchResult[] }>('/search/multi', { query });
    return data.results.filter(r => r.media_type === 'tv' || r.media_type === 'movie');
  }

  // ── Details ────────────────────────────────────────────────
  async getTVDetails(id: number): Promise<TMDBShowDetails> {
    return this.fetch<TMDBShowDetails>(`/tv/${id}`);
  }

  async getMovieDetails(id: number): Promise<TMDBMovieDetails> {
    return this.fetch<TMDBMovieDetails>(`/movie/${id}`);
  }

  // ── Cast (full, no limits) ─────────────────────────────────
  /**
   * Get FULL cast for a TV show (aggregate across all seasons).
   * Returns ALL characters — no arbitrary limits.
   */
  async getTVCast(id: number): Promise<TMDBCastMember[]> {
    const data = await this.fetch<{ cast: TMDBCastMember[] }>(`/tv/${id}/aggregate_credits`);
    return data.cast.sort((a, b) => a.order - b.order);
  }

  /**
   * Get FULL cast for a movie.
   * Returns ALL characters — no arbitrary limits.
   */
  async getMovieCast(id: number): Promise<TMDBCastMember[]> {
    const data = await this.fetch<{ cast: TMDBCastMember[] }>(`/movie/${id}/credits`);
    return data.cast.sort((a, b) => a.order - b.order);
  }

  /**
   * Get cast for a specific TV season.
   */
  async getSeasonCast(tvId: number, seasonNum: number): Promise<TMDBCastMember[]> {
    const data = await this.fetch<{ cast: TMDBCastMember[] }>(`/tv/${tvId}/season/${seasonNum}/credits`);
    return data.cast.sort((a, b) => a.order - b.order);
  }

  // ── Images ─────────────────────────────────────────────────
  async getTVImages(id: number) {
    return this.fetch<{ posters: { file_path: string; width: number; height: number }[]; backdrops: { file_path: string }[] }>(`/tv/${id}/images`);
  }

  async getMovieImages(id: number) {
    return this.fetch<{ posters: { file_path: string; width: number; height: number }[]; backdrops: { file_path: string }[] }>(`/movie/${id}/images`);
  }

  async getPersonImages(id: number) {
    return this.fetch<{ profiles: { file_path: string; width: number; height: number }[] }>(`/person/${id}/images`);
  }

  // ── Trending ───────────────────────────────────────────────
  async getTrending(mediaType: 'tv' | 'movie' | 'all' = 'all', timeWindow: 'day' | 'week' = 'week') {
    const data = await this.fetch<{ results: TMDBSearchResult[] }>(`/trending/${mediaType}/${timeWindow}`);
    return data.results;
  }

  // ── Popular ────────────────────────────────────────────────
  async getPopularTV(page = 1) {
    const data = await this.fetch<{ results: TMDBSearchResult[] }>('/tv/popular', { page: String(page) });
    return data.results;
  }

  async getPopularMovies(page = 1) {
    const data = await this.fetch<{ results: TMDBSearchResult[] }>('/movie/popular', { page: String(page) });
    return data.results;
  }

  // ── Discover (for recommendations) ────────────────────────
  async discoverTV(params: Record<string, string> = {}) {
    const data = await this.fetch<{ results: TMDBSearchResult[] }>('/discover/tv', params);
    return data.results;
  }

  async discoverMovies(params: Record<string, string> = {}) {
    const data = await this.fetch<{ results: TMDBSearchResult[] }>('/discover/movie', params);
    return data.results;
  }
}

// ── Singleton export ─────────────────────────────────────────
export const tmdb = new TMDBClient();

// ── TMDB ID Mapping for existing media library ──────────────
// Maps RiP media IDs to TMDB IDs so we can fetch real images
export const TMDB_ID_MAP: Record<string, { tmdbId: number; type: 'tv' | 'movie' }> = {
  // ── TV Shows: Drama / Crime ──
  'breaking-bad':       { tmdbId: 1396,   type: 'tv' },
  'game-of-thrones':    { tmdbId: 1399,   type: 'tv' },
  'the-sopranos':       { tmdbId: 1398,   type: 'tv' },
  'the-wire':           { tmdbId: 1438,   type: 'tv' },
  'peaky-blinders':     { tmdbId: 60574,  type: 'tv' },
  'better-call-saul':   { tmdbId: 60059,  type: 'tv' },
  'ozark':              { tmdbId: 69740,  type: 'tv' },
  'succession':         { tmdbId: 76331,  type: 'tv' },
  // ── TV Shows: Sci-Fi / Fantasy / Horror ──
  'stranger-things':    { tmdbId: 66732,  type: 'tv' },
  'the-last-of-us':     { tmdbId: 100088, type: 'tv' },
  'the-mandalorian':    { tmdbId: 82856,  type: 'tv' },
  'wednesday':          { tmdbId: 119051, type: 'tv' },
  'the-walking-dead':   { tmdbId: 1402,   type: 'tv' },
  'black-mirror':       { tmdbId: 42009,  type: 'tv' },
  'westworld':          { tmdbId: 63247,  type: 'tv' },
  'the-witcher':        { tmdbId: 71912,  type: 'tv' },
  'house-of-dragon':    { tmdbId: 94997,  type: 'tv' },
  // ── TV Shows: Comedy ──
  'the-office':         { tmdbId: 2316,   type: 'tv' },
  'friends':            { tmdbId: 1668,   type: 'tv' },
  'seinfeld':           { tmdbId: 1400,   type: 'tv' },
  'its-always-sunny':   { tmdbId: 2710,   type: 'tv' },
  'malcolm-middle':     { tmdbId: 2004,   type: 'tv' },
  'arrested-dev':       { tmdbId: 4589,   type: 'tv' },
  'the-simpsons':       { tmdbId: 456,    type: 'tv' },
  'south-park':         { tmdbId: 2190,   type: 'tv' },
  'rick-and-morty':     { tmdbId: 60625,  type: 'tv' },
  'family-guy':         { tmdbId: 1434,   type: 'tv' },
  'archer':             { tmdbId: 10283,  type: 'tv' },
  'bobs-burgers':       { tmdbId: 32726,  type: 'tv' },
  'parks-and-rec':      { tmdbId: 8592,   type: 'tv' },
  'american-dad':       { tmdbId: 1433,   type: 'tv' },
  'celebrity-deathmatch': { tmdbId: 4534, type: 'tv' },
  'robot-chicken':      { tmdbId: 2137,   type: 'tv' },
  // ── Anime ──
  'attack-on-titan':    { tmdbId: 1429,   type: 'tv' },
  'naruto':             { tmdbId: 46260,  type: 'tv' },
  'one-piece':          { tmdbId: 37854,  type: 'tv' },
  'demon-slayer':       { tmdbId: 85937,  type: 'tv' },
  'death-note':         { tmdbId: 13916,  type: 'tv' },
  'dragon-ball-z':      { tmdbId: 12971,  type: 'tv' },
  'jujutsu-kaisen':     { tmdbId: 95479,  type: 'tv' },
  'my-hero-academia':   { tmdbId: 65930,  type: 'tv' },
  // ── Cartoons / Kids ──
  'spongebob':          { tmdbId: 387,    type: 'tv' },
  'avatar-tla':         { tmdbId: 246,    type: 'tv' },
  'adventure-time':     { tmdbId: 15260,  type: 'tv' },
  'gravity-falls':      { tmdbId: 40075,  type: 'tv' },
  'addams-family':      { tmdbId: 2767,   type: 'tv' },
  // ── Reality / Thriller / Other ──
  'squid-game':         { tmdbId: 93405,  type: 'tv' },
  'money-heist':        { tmdbId: 71446,  type: 'tv' },
  'dark':               { tmdbId: 70523,  type: 'tv' },
  'euphoria':           { tmdbId: 85552,  type: 'tv' },
  'yellowstone':        { tmdbId: 73586,  type: 'tv' },
  // ── Movies ──
  'the-dark-knight':    { tmdbId: 155,    type: 'movie' },
  'avengers-endgame':   { tmdbId: 299534, type: 'movie' },
  'spider-verse':       { tmdbId: 569094, type: 'movie' }, // Across the Spider-Verse
  'black-panther':      { tmdbId: 284054, type: 'movie' },
  'inception':          { tmdbId: 27205,  type: 'movie' },
  'interstellar':       { tmdbId: 157336, type: 'movie' },
  'the-matrix':         { tmdbId: 603,    type: 'movie' },
  'dune':               { tmdbId: 438631, type: 'movie' },
  'it':                 { tmdbId: 346364, type: 'movie' },
  'get-out':            { tmdbId: 419430, type: 'movie' },
  'parasite':           { tmdbId: 496243, type: 'movie' },
  'pulp-fiction':       { tmdbId: 680,    type: 'movie' },
  'django-unchained':   { tmdbId: 68718,  type: 'movie' },
  'fight-club':         { tmdbId: 550,    type: 'movie' },
  'joker':              { tmdbId: 475557, type: 'movie' },
  'john-wick':          { tmdbId: 245891, type: 'movie' },
  'no-country':         { tmdbId: 6977,   type: 'movie' },
  'shutter-island':     { tmdbId: 11324,  type: 'movie' },
  'se7en':              { tmdbId: 807,    type: 'movie' },
  'zodiac':             { tmdbId: 1949,   type: 'movie' },
};
