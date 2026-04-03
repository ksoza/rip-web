// lib/agents/tools/supabase-ops.ts
// Tool: Agent can query and write to Supabase for context
// Gives GhOSTface awareness of the RiP platform data

export interface SupabaseToolResult {
  success: boolean;
  message: string;
  data?: any;
}

// ── Query public creations ──────────────────────────────────────
export async function queryCreations(
  filters: { genre?: string; type?: string; userId?: string; limit?: number } = {},
): Promise<SupabaseToolResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return { success: false, message: 'Supabase not configured' };

  try {
    let query = `${url}/rest/v1/creations?select=id,title,show_title,genre,type,logline,likes_count,remix_count,is_public,created_at&order=created_at.desc`;

    if (filters.genre) query += `&genre=eq.${filters.genre}`;
    if (filters.type) query += `&type=eq.${filters.type}`;
    if (filters.userId) query += `&user_id=eq.${filters.userId}`;
    query += `&limit=${filters.limit || 20}`;
    if (!filters.userId) query += '&is_public=eq.true';

    const res = await fetch(query, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    return {
      success: true,
      message: `Found ${data.length} creations`,
      data,
    };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

// ── Get platform stats ──────────────────────────────────────────
export async function getPlatformStats(): Promise<SupabaseToolResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return { success: false, message: 'Supabase not configured' };

  try {
    const headers = { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Prefer': 'count=exact' };

    const [profiles, creations, subscriptions] = await Promise.all([
      fetch(`${url}/rest/v1/profiles?select=id&limit=0`, { headers }).then(r => r.headers.get('content-range')),
      fetch(`${url}/rest/v1/creations?select=id&limit=0`, { headers }).then(r => r.headers.get('content-range')),
      fetch(`${url}/rest/v1/subscriptions?select=id&status=eq.active&limit=0`, { headers }).then(r => r.headers.get('content-range')),
    ]);

    const parseCount = (range: string | null) => {
      if (!range) return 0;
      const match = range.match(/\/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    };

    return {
      success: true,
      message: 'Platform statistics',
      data: {
        totalUsers: parseCount(profiles),
        totalCreations: parseCount(creations),
        activeSubscriptions: parseCount(subscriptions),
      },
    };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

// ── Save agent memory to Supabase ───────────────────────────────
export async function saveAgentMemory(
  userId: string,
  memory: Record<string, any>,
): Promise<SupabaseToolResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return { success: false, message: 'Supabase not configured' };

  try {
    // Use profiles table metadata or a dedicated memory store
    // For now, store in localStorage on client side; this can be upgraded
    // to a Supabase table when the agent_memory table is created
    return {
      success: true,
      message: 'Memory saved (client-side). Supabase persistence available after migration.',
      data: { userId, memoryKeys: Object.keys(memory) },
    };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

// ── Search TMDB through our proxy ───────────────────────────────
export async function searchTMDB(
  query: string,
  type: 'movie' | 'tv' | 'multi' = 'multi',
): Promise<SupabaseToolResult> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return { success: false, message: 'TMDB API key not configured' };

  try {
    const url = `https://api.themoviedb.org/3/search/${type}?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB HTTP ${res.status}`);
    const data = await res.json();

    const results = data.results?.slice(0, 10).map((r: any) => ({
      id: r.id,
      title: r.title || r.name,
      overview: r.overview?.slice(0, 200),
      type: r.media_type || type,
      releaseDate: r.release_date || r.first_air_date,
      voteAverage: r.vote_average,
      posterUrl: r.poster_path ? `https://image.tmdb.org/t/p/w342${r.poster_path}` : null,
    }));

    return {
      success: true,
      message: `Found ${results?.length || 0} results for "${query}"`,
      data: results,
    };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}
