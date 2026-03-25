// app/api/search/route.ts
// Full-text search across creations with filtering
// Supports: text query, genre filter, show filter, sort, pagination

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const genre = searchParams.get('genre') || '';
    const show = searchParams.get('show') || '';
    const sort = searchParams.get('sort') || 'recent'; // recent | popular | liked
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = (page - 1) * limit;

    const supabase = createSupabaseAdmin();

    // Build query
    let query = supabase
      .from('creations')
      .select('*, profiles!creations_user_id_fkey(username, display_name, avatar_url)', { count: 'exact' })
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
        query = query.order('view_count', { ascending: false, nullsFirst: false });
        break;
      case 'liked':
        query = query.order('like_count', { ascending: false, nullsFirst: false });
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
