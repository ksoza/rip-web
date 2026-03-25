// app/api/tmdb/route.ts
// Server-side TMDB API proxy — keeps API key server-only
// GET /api/tmdb?action=cast&id=breaking-bad
// GET /api/tmdb?action=search&q=breaking
// GET /api/tmdb?action=images&id=breaking-bad
// GET /api/tmdb?action=trending
import { NextRequest, NextResponse } from 'next/server';
import { tmdb, tmdbImage, TMDB_ID_MAP } from '@/lib/tmdb';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  try {
    switch (action) {
      // ── Get FULL cast for a media item (by our slug ID) ───
      case 'cast': {
        const mediaId = searchParams.get('id');
        if (!mediaId) return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });

        const entry = TMDB_ID_MAP[mediaId];
        if (!entry) return NextResponse.json({ error: `Unknown media ID: ${mediaId}` }, { status: 404 });

        const cast = entry.type === 'tv'
          ? await tmdb.getTVCast(entry.tmdbId)
          : await tmdb.getMovieCast(entry.tmdbId);

        // Transform to our format — ALL characters, no limits
        const characters = cast.map((member, idx) => ({
          id: `tmdb-${member.id}`,
          tmdbId: member.id,
          name: member.name,
          character: member.roles?.[0]?.character || member.character || 'Unknown',
          imageUrl: tmdbImage.profile(member.profile_path, 'w185'),
          order: member.order ?? idx,
          popularity: member.popularity,
          episodeCount: member.roles?.[0]?.episode_count,
        }));

        return NextResponse.json({
          mediaId,
          tmdbId: entry.tmdbId,
          type: entry.type,
          totalCharacters: characters.length,
          characters,
        }, {
          headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' },
        });
      }

      // ── Get poster and backdrop images for a media item ────
      case 'images': {
        const mediaId = searchParams.get('id');
        if (!mediaId) return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });

        const entry = TMDB_ID_MAP[mediaId];
        if (!entry) return NextResponse.json({ error: `Unknown media ID: ${mediaId}` }, { status: 404 });

        const details = entry.type === 'tv'
          ? await tmdb.getTVDetails(entry.tmdbId)
          : await tmdb.getMovieDetails(entry.tmdbId);

        return NextResponse.json({
          mediaId,
          posterUrl: tmdbImage.poster((details as any).poster_path, 'w500'),
          backdropUrl: tmdbImage.backdrop((details as any).backdrop_path, 'w1280'),
          posterThumb: tmdbImage.poster((details as any).poster_path, 'w185'),
        }, {
          headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' },
        });
      }

      // ── Batch: get poster URLs for all media in our library ─
      case 'posters': {
        // Returns poster URLs for all mapped media — used for initial load
        const posterMap: Record<string, string | null> = {};
        
        // We'll fetch in batches to avoid rate limits
        const entries = Object.entries(TMDB_ID_MAP);
        const batchSize = 20;
        
        for (let i = 0; i < Math.min(entries.length, batchSize * 3); i++) {
          const [slug, entry] = entries[i];
          try {
            const details = entry.type === 'tv'
              ? await tmdb.getTVDetails(entry.tmdbId)
              : await tmdb.getMovieDetails(entry.tmdbId);
            posterMap[slug] = tmdbImage.poster((details as any).poster_path, 'w342');
          } catch {
            posterMap[slug] = null;
          }
        }

        return NextResponse.json(posterMap, {
          headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' },
        });
      }

      // ── Search TMDB for shows/movies ──────────────────────
      case 'search': {
        const query = searchParams.get('q');
        if (!query) return NextResponse.json({ error: 'Missing q parameter' }, { status: 400 });

        const results = await tmdb.searchMulti(query);
        return NextResponse.json({
          query,
          results: results.slice(0, 20).map(r => ({
            tmdbId: r.id,
            title: r.name || r.title,
            type: r.media_type || (r.first_air_date ? 'tv' : 'movie'),
            year: (r.first_air_date || r.release_date || '').split('-')[0],
            posterUrl: tmdbImage.poster(r.poster_path, 'w185'),
            rating: r.vote_average,
            overview: r.overview?.slice(0, 200),
          })),
        });
      }

      // ── Get trending content ──────────────────────────────
      case 'trending': {
        const type = (searchParams.get('type') || 'all') as 'tv' | 'movie' | 'all';
        const results = await tmdb.getTrending(type);
        
        return NextResponse.json({
          results: results.map(r => ({
            tmdbId: r.id,
            title: r.name || r.title,
            type: r.media_type,
            posterUrl: tmdbImage.poster(r.poster_path, 'w342'),
            backdropUrl: tmdbImage.backdrop(r.backdrop_path),
            rating: r.vote_average,
          })),
        }, {
          headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: cast, images, posters, search, trending' },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error('[TMDB API Error]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'TMDB request failed' },
      { status: 500 }
    );
  }
}
