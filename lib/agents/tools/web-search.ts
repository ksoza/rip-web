// lib/agents/tools/web-search.ts
// Tool: Web search for current information

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

// Uses a simple fetch-based approach; can be swapped for a proper search API
export async function webSearch(query: string, maxResults = 5): Promise<SearchResult[]> {
  // If a SerpAPI or Tavily key is configured, use that
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (tavilyKey) {
    return searchWithTavily(query, tavilyKey, maxResults);
  }

  // Fallback: return a note that no search API is configured
  return [{
    title: 'Search not configured',
    url: '',
    snippet: `No search API key configured. Set TAVILY_API_KEY in environment variables. Query was: "${query}"`,
  }];
}

async function searchWithTavily(query: string, apiKey: string, maxResults: number): Promise<SearchResult[]> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults,
      search_depth: 'basic',
    }),
  });

  if (!res.ok) {
    throw new Error(`Tavily search failed: ${res.status}`);
  }

  const data = await res.json();
  return (data.results || []).map((r: any) => ({
    title: r.title,
    url: r.url,
    snippet: r.content?.slice(0, 300) || '',
  }));
}
