// lib/agents/tools/github-search.ts
// Tool: Search GitHub repositories and retrieve code intel

export interface GitHubSearchResult {
  full_name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  topics: string[];
  updated_at: string;
}

export async function searchGitHub(query: string, options?: { sort?: string; per_page?: number }): Promise<GitHubSearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    sort: options?.sort || 'stars',
    order: 'desc',
    per_page: String(options?.per_page || 5),
  });

  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'GhOSTface-RiP',
  };

  // Use token if available for higher rate limits
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`https://api.github.com/search/repositories?${params}`, { headers });

  if (!res.ok) {
    throw new Error(`GitHub search failed: ${res.status}`);
  }

  const data = await res.json();
  return (data.items || []).map((r: any) => ({
    full_name: r.full_name,
    description: r.description || '',
    html_url: r.html_url,
    stargazers_count: r.stargazers_count,
    forks_count: r.forks_count,
    language: r.language || 'Unknown',
    topics: r.topics || [],
    updated_at: r.updated_at,
  }));
}

export async function getRepoReadme(owner: string, repo: string): Promise<string> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.raw',
    'User-Agent': 'GhOSTface-RiP',
  };

  const token = process.env.GITHUB_TOKEN;
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers });
  if (!res.ok) return '(No README found)';
  return (await res.text()).slice(0, 3000);
}

export async function getRepoLanguages(owner: string, repo: string): Promise<Record<string, number>> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'GhOSTface-RiP',
  };

  const token = process.env.GITHUB_TOKEN;
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, { headers });
  if (!res.ok) return {};
  return res.json();
}
