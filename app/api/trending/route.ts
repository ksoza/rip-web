// app/api/trending/route.ts
// Trending content based on recent engagement (likes, views, comments)
// Algorithm: weighted score over last 7 days
// Score = (likes * 3) + (views * 1) + (comments * 2) + recency_bonus

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '7d'; // 1d, 7d, 30d
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const genre = searchParams.get('genre') || '';

    const supabase = createSupabaseAdmin();

    // Calculate period start
    const days = period === '1d' ? 1 : period === '30d' ? 30 : 7;
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - days);

    // Get recent creations with their engagement counts
    let query = supabase
      .from('creations')
      .select('*, profiles!creations_user_id_fkey(username, display_name, avatar_url)')
      .eq('is_public', true)
      .gte('created_at', periodStart.toISOString())
      .order('created_at', { ascending: false })
      .limit(100); // Get more than needed so we can sort by score

    if (genre) query = query.eq('genre', genre);

    const { data: creations, error: creationsError } = await query;
    if (creationsError) throw creationsError;

    if (!creations || creations.length === 0) {
      // Fallback: get all-time popular
      const { data: fallback } = await supabase
        .from('creations')
        .select('*, profiles!creations_user_id_fkey(username, display_name, avatar_url)')
        .eq('is_public', true)
        .order('like_count', { ascending: false, nullsFirst: false })
        .limit(limit);

      return NextResponse.json({
        trending: fallback || [],
        period,
        algorithm: 'all_time_popular_fallback',
      });
    }

    // Get likes for these creations in the period
    const creationIds = creations.map(c => c.id);
    const { data: recentLikes } = await supabase
      .from('likes')
      .select('creation_id')
      .in('creation_id', creationIds)
      .gte('created_at', periodStart.toISOString());

    const { data: recentComments } = await supabase
      .from('comments')
      .select('creation_id')
      .in('creation_id', creationIds)
      .gte('created_at', periodStart.toISOString());

    // Count likes and comments per creation
    const likeCounts: Record<string, number> = {};
    const commentCounts: Record<string, number> = {};
    for (const like of (recentLikes || [])) {
      likeCounts[like.creation_id] = (likeCounts[like.creation_id] || 0) + 1;
    }
    for (const comment of (recentComments || [])) {
      commentCounts[comment.creation_id] = (commentCounts[comment.creation_id] || 0) + 1;
    }

    // Calculate trending score
    const now = Date.now();
    const scored = creations.map(c => {
      const likes = likeCounts[c.id] || (c.like_count || 0);
      const comments = commentCounts[c.id] || 0;
      const views = c.view_count || 0;

      // Recency bonus: newer content gets a boost
      const ageHours = (now - new Date(c.created_at).getTime()) / 3600000;
      const recencyBonus = Math.max(0, 100 - ageHours * 2); // Decays over 50 hours

      const score = (likes * 3) + (views * 1) + (comments * 2) + recencyBonus;

      return { ...c, trending_score: Math.round(score * 10) / 10, recent_likes: likes, recent_comments: comments };
    });

    // Sort by score and take top N
    scored.sort((a, b) => b.trending_score - a.trending_score);
    const trending = scored.slice(0, limit);

    return NextResponse.json({
      trending,
      period,
      algorithm: 'weighted_engagement_recency',
      total: trending.length,
    });
  } catch (err: any) {
    console.error('Trending error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
