// app/api/feed/[type]/route.ts
// Feed-specific API for RxTV and RxMovies
// GET /api/feed/rxtv — episodic content (TV, Anime, Cartoon, News)
// GET /api/feed/rxmovies — films, shorts, music videos
// GET /api/feed/all — everything

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

const TV_GENRES = ['TV Show', 'Anime', 'Cartoon', 'News Show', 'New Show'];
const MOVIE_GENRES = ['Movie', 'Short Film', 'Music Video'];
const MOVIE_TYPES = ['Movie', 'Full Movie', 'Short Film', 'Trailer', 'Music'];

export async function GET(
  req: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const feedType = params.type; // rxtv | rxmovies | all
    const { searchParams } = new URL(req.url);

    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '20') || 20), 50);
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0') || 0);
    const sort = searchParams.get('sort') || 'recent'; // recent | popular | trending
    const genre = searchParams.get('genre')?.trim().slice(0, 100) || '';
    const showTitle = searchParams.get('show')?.trim().slice(0, 200) || '';

    const supabase = createSupabaseAdmin();

    // Base query
    let query = supabase
      .from('creations')
      .select('*, profiles!creations_user_id_fkey(username, avatar_url)', { count: 'exact' })
      .eq('is_public', true);

    // Filter by feed type
    if (feedType === 'rxtv') {
      if (genre && TV_GENRES.includes(genre)) {
        query = query.eq('genre', genre);
      } else {
        query = query.in('genre', TV_GENRES);
      }
    } else if (feedType === 'rxmovies') {
      if (genre && MOVIE_GENRES.includes(genre)) {
        query = query.eq('genre', genre);
      } else {
        // Match either by genre OR by type
        query = query.or(
          `genre.in.(${MOVIE_GENRES.join(',')}),type.in.(${MOVIE_TYPES.join(',')})`
        );
      }
    } else if (genre) {
      query = query.eq('genre', genre);
    }

    // Filter by show title (for show-specific episode listing)
    if (showTitle) {
      query = query.ilike('show_title', `%${showTitle}%`);
    }

    // Sorting
    if (sort === 'popular') {
      query = query.order('likes_count', { ascending: false, nullsFirst: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data: creations, error, count } = await query;
    if (error) throw error;

    // For trending sort, compute scores client-side
    let results = creations || [];
    if (sort === 'trending' && results.length > 0) {
      const now = Date.now();
      results = results.map((c: any) => {
        const ageHours = (now - new Date(c.created_at).getTime()) / 3600000;
        const recencyBonus = Math.max(0, 100 - ageHours * 2);
        const score = ((c.likes_count || 0) * 3) + recencyBonus;
        return { ...c, trending_score: Math.round(score * 10) / 10 };
      }).sort((a: any, b: any) => b.trending_score - a.trending_score);
    }

    // For RxTV, also compute show groupings
    let shows: any[] = [];
    if (feedType === 'rxtv' && results.length > 0) {
      const showMap = new Map<string, { count: number; totalLikes: number; latest: any }>();
      for (const c of results) {
        const key = c.show_title || 'Untitled';
        const existing = showMap.get(key) || { count: 0, totalLikes: 0, latest: c };
        existing.count++;
        existing.totalLikes += c.likes_count || 0;
        if (new Date(c.created_at) > new Date(existing.latest.created_at)) {
          existing.latest = c;
        }
        showMap.set(key, existing);
      }
      shows = Array.from(showMap.entries()).map(([title, data]) => ({
        showTitle: title,
        episodeCount: data.count,
        totalLikes: data.totalLikes,
        genre: data.latest.genre,
        latestEpisode: data.latest.title,
        latestCreatedAt: data.latest.created_at,
        creator: data.latest.profiles?.username || 'anonymous',
      })).sort((a, b) => b.totalLikes - a.totalLikes);
    }

    return NextResponse.json({
      feed: feedType,
      results,
      shows: shows.length > 0 ? shows : undefined,
      total: count || results.length,
      offset,
      limit,
      sort,
    });
  } catch (err: any) {
    console.error('Feed API error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch feed' },
      { status: 500 },
    );
  }
}
