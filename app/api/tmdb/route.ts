// app/api/tmdb/route.ts
// Server-side TMDB API proxy — keeps API key server-only
// GET /api/tmdb?action=cast&id=breaking-bad
// GET /api/tmdb?action=search&q=breaking
// GET /api/tmdb?action=images&id=breaking-bad
// GET /api/tmdb?action=trending
import { NextRequest, NextResponse } from 'next/server';
import { tmdb, tmdbImage, TMDB_ID_MAP } from '@/lib/tmdb';

// ── Fandom Wiki subdomain map for Western cartoons ──
const FANDOM_WIKI_MAP: Record<number, string> = {
  // TMDB ID → fandom wiki subdomain
  60625: 'rickandmorty',    // Rick and Morty
  456:   'simpsons',        // The Simpsons
  2190:  'southpark',       // South Park
  1434:  'familyguy',       // Family Guy
  387:   'spongebob',       // SpongeBob
  246:   'avatar',          // Avatar: The Last Airbender
};

// ── Fandom Wiki — character images for Western cartoons (free, no API key) ──
async function fetchFandomCharacterImages(tmdbId: number, characterNames: string[]): Promise<Record<string, string>> {
  const imageMap: Record<string, string> = {};
  const wiki = FANDOM_WIKI_MAP[tmdbId];
  if (!wiki || characterNames.length === 0) return imageMap;

  // Fandom API accepts multiple titles at once (up to 50)
  const titles = characterNames.slice(0, 30).map(n => {
    // Clean up "(voice)" suffix and convert spaces to underscores
    const clean = n.replace(/\s*\(voice\)\s*/i, '').trim();
    return clean.replace(/\s+/g, '_');
  });

  try {
    const url = `https://${wiki}.fandom.com/api.php?action=query&titles=${titles.join('|')}&prop=pageimages&format=json&pithumbsize=200`;
    const res = await fetch(url);
    if (!res.ok) return imageMap;
    const data = await res.json();

    for (const page of Object.values(data.query?.pages || {}) as any[]) {
      if (page.thumbnail?.source && page.title) {
        imageMap[page.title.toLowerCase()] = page.thumbnail.source;
      }
    }
  } catch (e) {
    console.error(`[Fandom/${wiki}] Error:`, e);
  }
  return imageMap;
}

// ── Jikan (MyAnimeList) — real character artwork for anime ──
async function fetchJikanCharacterImages(showTitle: string): Promise<Record<string, string>> {
  const imageMap: Record<string, string> = {};
  try {
    const searchRes = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(showTitle)}&limit=1`);
    if (!searchRes.ok) return imageMap;
    const searchData = await searchRes.json();
    const malId = searchData.data?.[0]?.mal_id;
    if (!malId) return imageMap;

    const charRes = await fetch(`https://api.jikan.moe/v4/anime/${malId}/characters`);
    if (!charRes.ok) return imageMap;
    const charData = await charRes.json();

    for (const entry of (charData.data || [])) {
      const char = entry.character;
      if (!char?.name || !char?.images?.jpg?.image_url) continue;
      const imgUrl = char.images.jpg.image_url;
      const jikanName = char.name;
      imageMap[jikanName.toLowerCase()] = imgUrl;
      if (jikanName.includes(', ')) {
        const [last, first] = jikanName.split(', ');
        imageMap[`${first} ${last}`.toLowerCase()] = imgUrl;
        imageMap[first.toLowerCase()] = imgUrl;
      }
    }
  } catch (e) {
    console.error('[Jikan] Error:', e);
  }
  return imageMap;
}

// ── Match a character name to an image from either source ──
function findCharacterImage(characterName: string, imageMap: Record<string, string>): string | null {
  // Clean "(voice)" suffix
  const cleaned = characterName.replace(/\s*\(voice\)\s*/i, '').trim();
  const normalized = cleaned.toLowerCase();

  // Direct match
  if (imageMap[normalized]) return imageMap[normalized];
  // Underscore variant (Fandom uses spaces in titles but we search with underscores)
  const underscored = normalized.replace(/\s+/g, '_');
  if (imageMap[underscored]) return imageMap[underscored];
  // Partial match
  for (const [key, url] of Object.entries(imageMap)) {
    if (normalized.includes(key) || key.includes(normalized)) return url;
  }
  // First word match (e.g., "Goku" matches "Son, Gokuu")
  const firstName = normalized.split(/\s+/)[0];
  if (firstName.length >= 3) {
    for (const [key, url] of Object.entries(imageMap)) {
      if (key.includes(firstName)) return url;
    }
  }
  return null;
}

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

        // Fetch details to check if animated (genre 16 = Animation)
        const details = entry.type === 'tv'
          ? await tmdb.getTVDetails(entry.tmdbId)
          : await tmdb.getMovieDetails(entry.tmdbId);
        const isAnimated = (details as any).genres?.some((g: any) => g.id === 16) || false;

        const cast = entry.type === 'tv'
          ? await tmdb.getTVCast(entry.tmdbId)
          : await tmdb.getMovieCast(entry.tmdbId);

        // For animated content, fetch real character artwork:
        // 1. Fandom Wiki (Western cartoons — Rick & Morty, Simpsons, etc.)
        // 2. Jikan/MyAnimeList (anime — Naruto, Dragon Ball Z, etc.)
        const showTitle = (details as any).name || (details as any).title || '';
        const characterNames = cast.map(m => m.roles?.[0]?.character || m.character || 'Unknown');

        let charImageMap: Record<string, string> = {};
        if (isAnimated) {
          // Try Fandom first (Western cartoons), then Jikan (anime)
          charImageMap = await fetchFandomCharacterImages(entry.tmdbId, characterNames);
          if (Object.keys(charImageMap).length === 0) {
            charImageMap = await fetchJikanCharacterImages(showTitle);
          }
        }

        // Transform to our format — ALL characters, no limits
        const characters = cast.map((member, idx) => {
          const characterName = member.roles?.[0]?.character || member.character || 'Unknown';
          const actorName = member.name;

          // For animated: use character art from Fandom/Jikan; for live-action: actor photo
          let imageUrl: string | null;
          if (isAnimated) {
            imageUrl = findCharacterImage(characterName, charImageMap) || null;
          } else {
            imageUrl = tmdbImage.profile(member.profile_path, 'w185');
          }

          return {
            id: `tmdb-${member.id}`,
            tmdbId: member.id,
            // Always use character name as primary, actor as secondary
            name: actorName,
            character: characterName,
            imageUrl,
            order: member.order ?? idx,
            popularity: member.popularity,
            episodeCount: member.roles?.[0]?.episode_count,
          };
        });

        return NextResponse.json({
          mediaId,
          tmdbId: entry.tmdbId,
          type: entry.type,
          isAnimated,
          totalCharacters: characters.length,
          characters,
        }, {
          headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
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
