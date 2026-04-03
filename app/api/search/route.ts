// app/api/search/route.ts
// Full-text search across creations with filtering
// Supports: text query, genre filter, show filter, sort, pagination

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

// Sanitize search input — escape special PostgREST/SQL characters
function sanitizeSearch(input: string): string {
  return input
    .replace(/[%_\\]/g, '\\$&') // escape LIKE wildcards
    .replace(/[\x00-\x1F\x7F]/g, '') // strip control chars
    .trim()
    .slice(0, 200); // limit query length
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawQ = searchParams.get('q') || '';
    const rawGenre = searchParams.get('genre') || '';
    const rawShow = searchParams.get('show') || '';
    const sort = searchParams.get('sort') || 'recent'; // recent | popular | liked
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '20') || 20), 50);
    const offset = (page - 1) * limit;

    const q = sanitizeSearch(rawQ);
    const genre = sanitizeSearch(rawGenre);
    const show = sanitizeSearch(rawShow);

    const supabase = createSupabaseAdmin();

    // Build query
    let query = supabase
      .from('creations')
      .select('*, profiles!creations_user_id_fkey(username, avatar_url)', { count: 'exact' })
      .eq('is_public', true);

    // Text search — search across title, content, show_title, hashtags
    if (q) {
      query = query.or(
        `title.ilike.%${q}%,content.ilike.%${q}%,show_title.ilike.%${q}%,hashtags.ilike.%${q}%`
      );
    }

    // Filters
    if (genre) query = query.eq('genre', genre);
    if (show) query = query.ilike('show_title', `%${show}%`);

    // Sorting
    switch (sort) {
      case 'popular':
        query = query.order('likes_count', { ascending: false, nullsFirst: false });
        break;
      case 'liked':
        query = query.order('likes_count', { ascending: false, nullsFirst: false });
        break;
      case 'recent':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      results: data || [],
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit,
    });
  } catch (err: any) {
    console.error('Search error:', err);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 },
    );
  }
}
