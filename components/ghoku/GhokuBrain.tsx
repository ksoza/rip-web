// components/ghoku/GhokuBrain.tsx
// Gh.O.K.U. — GitHub Oracle Kinetic Unit
// A living GitHub brain that searches, scans, and synthesizes repos in real time
'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

// ── Types ───────────────────────────────────────────────────────
interface Repo {
  id: number;
  full_name: string;
  name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string;
  topics: string[];
  owner: { login: string; avatar_url: string };
  created_at: string;
  updated_at: string;
  license?: { spdx_id: string };
  languages_url: string;
}

interface RepoIntel {
  repo: Repo;
  languages: Record<string, number>;
  readme: string;
  contributors: { login: string; avatar_url: string; contributions: number }[];
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface MemoryState {
  name: string;
  stack: string[];
  frameworks: string[];
  apis: string[];
  projects: string[];
  notes: string[];
  lastUpdated: string;
}

type GhokuTab = 'search' | 'intel' | 'chat' | 'brain' | 'neural' | 'memory';

// ── Helpers ─────────────────────────────────────────────────────
function formatNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'today';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// ── Memory persistence ──────────────────────────────────────────
function loadMemory(): MemoryState {
  if (typeof window === 'undefined') return defaultMemory();
  try {
    const stored = localStorage.getItem('ghoku_memory');
    return stored ? JSON.parse(stored) : defaultMemory();
  } catch {
    return defaultMemory();
  }
}

function saveMemory(memory: MemoryState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ghoku_memory', JSON.stringify({ ...memory, lastUpdated: new Date().toISOString() }));
}

function defaultMemory(): MemoryState {
  return {
    name: '',
    stack: [],
    frameworks: [],
    apis: [],
    projects: [],
    notes: [],
    lastUpdated: '',
  };
}

// ── Component ───────────────────────────────────────────────────
export function GhokuBrain() {
  const [tab, setTab] = useState<GhokuTab>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedRepo, setLoadedRepo] = useState<RepoIntel | null>(null);
  const [githubToken, setGithubToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Brain mode state
  const [brainInput, setBrainInput] = useState('');
  const [brainContext, setBrainContext] = useState('');
  const [showContext, setShowContext] = useState(false);

  // Neural state
  const [neuralActive, setNeuralActive] = useState(false);
  const [spikeLog, setSpikeLog] = useState<string[]>([]);

  // Memory state
  const [memory, setMemory] = useState<MemoryState>(defaultMemory);

  useEffect(() => {
    setMemory(loadMemory());
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ── GitHub Search ───────────────────────────────────
  const searchGitHub = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
      if (githubToken) headers.Authorization = `token ${githubToken}`;

      const resp = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=stars&per_page=20`,
        { headers }
      );
      const data = await resp.json();
      setSearchResults(data.items || []);
      setTab('search');
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, githubToken]);

  // ── Load Repo ───────────────────────────────────────
  const loadRepo = useCallback(async (repo: Repo) => {
    setLoading(true);
    try {
      const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
      if (githubToken) headers.Authorization = `token ${githubToken}`;

      // Fetch languages, readme, contributors in parallel
      const [langResp, readmeResp, contribResp] = await Promise.all([
        fetch(repo.languages_url, { headers }),
        fetch(`https://api.github.com/repos/${repo.full_name}/readme`, {
          headers: { ...headers, Accept: 'application/vnd.github.v3.raw' },
        }).catch(() => null),
        fetch(`https://api.github.com/repos/${repo.full_name}/contributors?per_page=10`, { headers }),
      ]);

      const languages = await langResp.json();
      const readme = readmeResp?.ok ? await readmeResp.text() : 'No README available';
      const contributors = contribResp.ok ? await contribResp.json() : [];

      const intel: RepoIntel = { repo, languages, readme: readme.slice(0, 5000), contributors };
      setLoadedRepo(intel);
      setTab('intel');

      // Auto-brief: start a chat with the repo context
      const briefPrompt = `You just loaded repo: ${repo.full_name}. Generate a brief intelligence report covering: architecture, tech stack, community health, and potential use cases. Be concise but insightful.`;
      setChatMessages([
        { role: 'system', content: `Loaded repo: ${repo.full_name}\nLanguages: ${Object.keys(languages).join(', ')}\nStars: ${repo.stargazers_count}\nDescription: ${repo.description}\nREADME (first 2000 chars): ${readme.slice(0, 2000)}` },
        { role: 'user', content: briefPrompt },
      ]);
      // Trigger auto-brief via API
      autoBrief(repo, languages, readme.slice(0, 2000));
    } catch (err) {
      console.error('Load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [githubToken]);

  // ── Auto-Brief ──────────────────────────────────────
  const autoBrief = async (repo: Repo, languages: Record<string, number>, readme: string) => {
    setChatLoading(true);
    try {
      const resp = await fetch('/api/ghoku/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: `You are Gh.O.K.U., the GitHub Oracle Kinetic Unit. You analyze repositories with deep technical insight. Repo: ${repo.full_name}. Languages: ${Object.keys(languages).join(', ')}. Stars: ${repo.stargazers_count}. Forks: ${repo.forks_count}. Description: ${repo.description}. README: ${readme}` },
            { role: 'user', content: 'Generate a brief intelligence report on this repository. Cover: architecture, tech stack, community health, strengths, weaknesses, and potential use cases. Be concise.' },
          ],
        }),
      });
      const data = await resp.json();
      if (data.content) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: '⚠ Auto-brief failed — API not configured. Set ANTHROPIC_API_KEY in env vars.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  // ── Oracle Chat ─────────────────────────────────────
  const sendChat = async (input?: string) => {
    const msg = input || chatInput;
    if (!msg.trim()) return;
    setChatInput('');
    const newMsg: ChatMessage = { role: 'user', content: msg };
    setChatMessages(prev => [...prev, newMsg]);
    setChatLoading(true);

    try {
      const resp = await fetch('/api/ghoku/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, newMsg].filter(m => m.role !== 'system').slice(-10),
          context: loadedRepo ? `Repo: ${loadedRepo.repo.full_name}, Languages: ${Object.keys(loadedRepo.languages).join(', ')}` : undefined,
        }),
      });
      const data = await resp.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.content || 'No response' }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: '⚠ Chat failed — check API configuration' }]);
    } finally {
      setChatLoading(false);
    }
  };

  // ── Brain Mode (Universal Connector) ────────────────
  const brainQuery = async () => {
    if (!brainInput.trim()) return;
    const msg = brainInput;
    setBrainInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: `🧠 BRAIN: ${msg}${brainContext ? `\n\n[PROJECT CONTEXT]\n${brainContext}` : ''}` }]);
    setChatLoading(true);
    setTab('chat');

    try {
      const resp = await fetch('/api/ghoku/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: `You are Gh.O.K.U. Brain — a universal code connector. The user describes what they want to build, and you find the right APIs, libraries, and code to make it work. Return ACTUAL working code, not pseudocode. Use the user's project context if provided. Memory: ${JSON.stringify(memory)}` },
            { role: 'user', content: `${msg}${brainContext ? `\n\nMy project context:\n${brainContext}` : ''}` },
          ],
        }),
      });
      const data = await resp.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.content || 'No response' }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: '⚠ Brain query failed — check API configuration' }]);
    } finally {
      setChatLoading(false);
    }
  };

  // ── Neural Simulation ───────────────────────────────
  useEffect(() => {
    if (!neuralActive) return;
    const interval = setInterval(() => {
      const electrode = Math.floor(Math.random() * 32);
      const amplitude = (Math.random() * 200 - 100).toFixed(1);
      const mea = Math.floor(electrode / 8);
      setSpikeLog(prev => [
        `[${new Date().toLocaleTimeString()}] MEA${mea} E${electrode % 8} → ${amplitude}μV`,
        ...prev.slice(0, 49),
      ]);
    }, 200);
    return () => clearInterval(interval);
  }, [neuralActive]);

  // ── Quick-connect chips ─────────────────────────────
  const QUICK_CHIPS = [
    'Solana', 'Stripe', 'Supabase', 'OpenAI', 'XRPL',
    'Anthropic', 'Replicate', 'ElevenLabs', 'Vercel',
    'Firebase', 'Prisma', 'tRPC', 'WebSocket', 'Redis',
    'S3', 'Cloudflare',
  ];

  // ── Tab definitions ─────────────────────────────────
  const TABS: { id: GhokuTab; icon: string; label: string }[] = [
    { id: 'search', icon: '🔍', label: 'Search' },
    { id: 'intel',  icon: '📊', label: 'Intel' },
    { id: 'chat',   icon: '🧠', label: 'Oracle' },
    { id: 'brain',  icon: '⚡', label: 'Brain' },
    { id: 'neural', icon: '🧬', label: 'Neural' },
    { id: 'memory', icon: '💾', label: 'Memory' },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-bg text-white">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="border-b border-border px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🧠</span>
          <div>
            <h1 className="font-display text-xl tracking-wider">
              <span className="text-rip">Gh</span>.<span className="text-cyan">O</span>.<span className="text-lime">K</span>.<span className="text-gold">U</span>.
            </h1>
            <p className="text-[8px] text-muted uppercase tracking-[0.3em]">GitHub Oracle Kinetic Unit</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-xl mx-4">
          <div className="flex items-center bg-bg2 border border-border rounded-xl overflow-hidden">
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchGitHub()}
              placeholder="Search GitHub repos... (e.g. langchain, solana, stable diffusion)"
              className="flex-1 bg-transparent px-4 py-2 text-sm text-white outline-none placeholder:text-muted2"
            />
            <button onClick={searchGitHub} disabled={loading}
              className="px-4 py-2 text-sm font-bold text-black bg-lime hover:brightness-110 transition disabled:opacity-50">
              {loading ? '...' : 'SCAN'}
            </button>
          </div>
        </div>

        {/* Token toggle */}
        <button onClick={() => setShowTokenInput(!showTokenInput)}
          className={`px-2 py-1 rounded text-[9px] font-bold transition ${githubToken ? 'bg-lime/20 text-lime' : 'bg-bg3 text-muted hover:text-white'}`}>
          🔑 {githubToken ? 'TOKEN SET' : 'TOKEN'}
        </button>

        {/* Status */}
        {loadedRepo && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-lime animate-pulse" />
            <span className="text-[10px] text-lime font-mono">{loadedRepo.repo.full_name}</span>
          </div>
        )}

        {memory.name && (
          <span className="text-[9px] text-gold">OPERATOR: {memory.name}</span>
        )}
      </div>

      {/* Token input */}
      {showTokenInput && (
        <div className="px-4 py-2 bg-bg2 border-b border-border flex items-center gap-2">
          <span className="text-[10px] text-muted">GitHub Token (optional, avoids rate limits):</span>
          <input
            type="password"
            value={githubToken}
            onChange={e => setGithubToken(e.target.value)}
            placeholder="ghp_..."
            className="flex-1 bg-bg3 border border-border rounded px-3 py-1 text-xs text-white outline-none font-mono"
          />
          <button onClick={() => setShowTokenInput(false)} className="text-xs text-muted hover:text-white">✕</button>
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────────── */}
      <div className="flex items-center gap-0 border-b border-border bg-bg2/50">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
              tab === t.id
                ? 'border-cyan text-cyan'
                : 'border-transparent text-muted hover:text-white'
            }`}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab Content ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {/* SEARCH TAB */}
        {tab === 'search' && (
          <div className="p-4">
            {searchResults.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4 opacity-30">🔍</div>
                <h2 className="font-display text-2xl text-white mb-2">Search the Multiverse</h2>
                <p className="text-sm text-muted max-w-md mx-auto">
                  Enter a keyword above to search GitHub repos. Gh.O.K.U. finds the best code, sorted by stars, ready for the Oracle to analyze.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-lg mx-auto">
                  {['solana', 'ai video', 'stable diffusion', 'nextjs', 'nft marketplace', 'claude api'].map(q => (
                    <button key={q} onClick={() => { setSearchQuery(q); }}
                      className="px-3 py-1.5 bg-bg2 border border-border rounded-full text-xs text-muted hover:text-white hover:border-cyan transition">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted mb-3">{searchResults.length} repos found for &quot;{searchQuery}&quot;</p>
                {searchResults.map(repo => (
                  <div key={repo.id}
                    onClick={() => loadRepo(repo)}
                    className="bg-bg2 border border-border rounded-xl p-4 hover:border-cyan transition-all cursor-pointer group">
                    <div className="flex items-start gap-3">
                      <img src={repo.owner.avatar_url} alt="" className="w-8 h-8 rounded-lg" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white group-hover:text-cyan transition">{repo.full_name}</h3>
                          {repo.language && (
                            <span className="px-1.5 py-0.5 bg-bg3 text-[8px] text-cyan rounded">{repo.language}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted mt-0.5 line-clamp-1">{repo.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-[10px] text-muted2">
                          <span>⭐ {formatNum(repo.stargazers_count)}</span>
                          <span>🔱 {formatNum(repo.forks_count)}</span>
                          <span>🔴 {repo.open_issues_count} issues</span>
                          {repo.license && <span>📄 {repo.license.spdx_id}</span>}
                          <span>Updated {timeAgo(repo.updated_at)}</span>
                        </div>
                        {repo.topics?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {repo.topics.slice(0, 6).map(t => (
                              <span key={t} className="px-1.5 py-0.5 bg-purple/10 text-[8px] text-purple rounded">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button className="text-xs text-cyan opacity-0 group-hover:opacity-100 transition px-2 py-1 rounded bg-cyan/10">
                        LOAD →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* INTEL TAB */}
        {tab === 'intel' && loadedRepo && (
          <div className="p-4 space-y-4">
            {/* Repo header */}
            <div className="bg-bg2 border border-border rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <img src={loadedRepo.repo.owner.avatar_url} alt="" className="w-12 h-12 rounded-xl" />
                <div>
                  <h2 className="font-display text-2xl text-white">{loadedRepo.repo.full_name}</h2>
                  <p className="text-xs text-muted">{loadedRepo.repo.description}</p>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-bg3 rounded-lg p-3 text-center">
                  <div className="font-display text-2xl text-gold">{formatNum(loadedRepo.repo.stargazers_count)}</div>
                  <div className="text-[9px] text-muted uppercase">Stars</div>
                </div>
                <div className="bg-bg3 rounded-lg p-3 text-center">
                  <div className="font-display text-2xl text-cyan">{formatNum(loadedRepo.repo.forks_count)}</div>
                  <div className="text-[9px] text-muted uppercase">Forks</div>
                </div>
                <div className="bg-bg3 rounded-lg p-3 text-center">
                  <div className="font-display text-2xl text-rip">{loadedRepo.repo.open_issues_count}</div>
                  <div className="text-[9px] text-muted uppercase">Issues</div>
                </div>
                <div className="bg-bg3 rounded-lg p-3 text-center">
                  <div className="font-display text-2xl text-lime">{loadedRepo.repo.license?.spdx_id || 'N/A'}</div>
                  <div className="text-[9px] text-muted uppercase">License</div>
                </div>
              </div>
            </div>

            {/* Language breakdown */}
            <div className="bg-bg2 border border-border rounded-xl p-4">
              <h3 className="text-sm font-bold text-white mb-3">📊 Language Breakdown</h3>
              {(() => {
                const total = Object.values(loadedRepo.languages).reduce((a, b) => a + b, 0);
                const COLORS = ['#ff2d78', '#00d4ff', '#8aff00', '#ffcc00', '#a855f7', '#ff6b35'];
                return (
                  <div className="space-y-2">
                    {/* Bar */}
                    <div className="h-4 rounded-full overflow-hidden flex">
                      {Object.entries(loadedRepo.languages).map(([lang, bytes], i) => (
                        <div key={lang} style={{ width: `${(bytes / total) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}
                          title={`${lang}: ${((bytes / total) * 100).toFixed(1)}%`} />
                      ))}
                    </div>
                    {/* Legend */}
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(loadedRepo.languages).map(([lang, bytes], i) => (
                        <div key={lang} className="flex items-center gap-1.5 text-xs">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-white">{lang}</span>
                          <span className="text-muted">{((bytes / total) * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Contributors */}
            {loadedRepo.contributors.length > 0 && (
              <div className="bg-bg2 border border-border rounded-xl p-4">
                <h3 className="text-sm font-bold text-white mb-3">👥 Top Contributors</h3>
                <div className="flex flex-wrap gap-2">
                  {loadedRepo.contributors.map(c => (
                    <div key={c.login} className="flex items-center gap-2 bg-bg3 rounded-lg px-3 py-2">
                      <img src={c.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                      <span className="text-xs text-white">{c.login}</span>
                      <span className="text-[9px] text-muted">{c.contributions} commits</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* README preview */}
            <div className="bg-bg2 border border-border rounded-xl p-4">
              <h3 className="text-sm font-bold text-white mb-3">📄 README</h3>
              <pre className="text-xs text-muted whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto font-mono">
                {loadedRepo.readme}
              </pre>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <a href={loadedRepo.repo.html_url} target="_blank" rel="noopener"
                className="px-4 py-2 bg-bg2 border border-border rounded-xl text-xs font-bold text-white hover:border-cyan transition">
                Open on GitHub ↗
              </a>
              <button onClick={() => setTab('chat')}
                className="px-4 py-2 rounded-xl text-xs font-bold text-black bg-cyan hover:brightness-110 transition">
                🧠 Ask the Oracle
              </button>
            </div>
          </div>
        )}

        {tab === 'intel' && !loadedRepo && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 opacity-30">📡</div>
            <h2 className="font-display text-xl text-white mb-2">No Repo Loaded</h2>
            <p className="text-sm text-muted">Search and click a repo to load its intelligence.</p>
          </div>
        )}

        {/* ORACLE CHAT TAB */}
        {tab === 'chat' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.filter(m => m.role !== 'system').length === 0 && (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4 opacity-30">🧠</div>
                  <h2 className="font-display text-xl text-white mb-2">Oracle Chat</h2>
                  <p className="text-sm text-muted max-w-md mx-auto">
                    Load a repo first, then ask anything. The Oracle synthesizes GitHub data into deep insights.
                  </p>
                </div>
              )}
              {chatMessages.filter(m => m.role !== 'system').map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-cyan/20 flex items-center justify-center text-sm shrink-0">🧠</div>
                  )}
                  <div className={`max-w-[70%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-rip/20 border border-rip/30 text-white'
                      : 'bg-bg2 border border-border text-muted'
                  }`}>
                    <pre className="whitespace-pre-wrap font-body text-sm">{msg.content}</pre>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-rip/20 flex items-center justify-center text-sm shrink-0">☽</div>
                  )}
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan/20 flex items-center justify-center text-sm">🧠</div>
                  <div className="bg-bg2 border border-border rounded-xl px-4 py-3 text-sm text-muted animate-pulse">
                    Oracle is thinking...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat input */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-2">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendChat()}
                  placeholder={loadedRepo ? `Ask about ${loadedRepo.repo.name}...` : 'Ask the Oracle...'}
                  className="flex-1 bg-bg2 border border-border rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-cyan placeholder:text-muted2"
                />
                <button onClick={() => sendChat()} disabled={chatLoading}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-black bg-cyan hover:brightness-110 transition disabled:opacity-50">
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BRAIN TAB (Universal Connector) */}
        {tab === 'brain' && (
          <div className="p-4">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">⚡</div>
              <h2 className="font-display text-2xl text-white">Universal Code Brain</h2>
              <p className="text-sm text-muted max-w-lg mx-auto mt-1">
                Describe what you want to build. The Brain finds the right APIs, libraries, and code — and returns working, copy-paste solutions.
              </p>
            </div>

            {/* Context toggle */}
            <div className="mb-4">
              <button onClick={() => setShowContext(!showContext)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${showContext ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-bg2 border border-border text-muted hover:text-white'}`}>
                📋 CTX {showContext ? '▼' : '▶'} — Project Context
              </button>
              {showContext && (
                <textarea
                  value={brainContext}
                  onChange={e => setBrainContext(e.target.value)}
                  placeholder="Paste your project code, config, or describe your stack here. The Brain will tailor its code to YOUR project..."
                  className="w-full mt-2 bg-bg2 border border-border rounded-xl p-4 text-xs text-white outline-none focus:border-gold placeholder:text-muted2 h-32 resize-y font-mono"
                />
              )}
            </div>

            {/* Quick-connect chips */}
            <div className="mb-4">
              <p className="text-[9px] text-muted uppercase tracking-widest mb-2">Quick Connect</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_CHIPS.map(chip => (
                  <button key={chip}
                    onClick={() => setBrainInput(`How do I connect ${chip} to my project?`)}
                    className="px-2.5 py-1 bg-bg2 border border-border rounded-full text-[10px] text-muted hover:text-cyan hover:border-cyan transition">
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Brain input */}
            <div className="flex items-center gap-2">
              <input
                value={brainInput}
                onChange={e => setBrainInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && brainQuery()}
                placeholder="Connect Solana wallet and read token balances... wire Stripe + crypto checkout..."
                className="flex-1 bg-bg2 border border-border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-lime placeholder:text-muted2"
              />
              <button onClick={brainQuery} disabled={chatLoading}
                className="px-6 py-3 rounded-xl text-sm font-bold text-black bg-lime hover:brightness-110 transition disabled:opacity-50">
                ⚡ GO
              </button>
            </div>

            {/* Example pipelines */}
            <div className="mt-6">
              <p className="text-[9px] text-muted uppercase tracking-widest mb-2">Example Multi-API Pipelines</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { title: 'Stripe + Solana checkout', desc: 'Fiat → crypto hybrid payment flow' },
                  { title: 'Supabase auth + XRPL wallet', desc: 'Login with email, link wallet' },
                  { title: 'Whisper → GPT-4 → ElevenLabs', desc: 'Voice in → AI process → voice out' },
                  { title: 'Replicate + Cloudflare R2', desc: 'Generate images, store in CDN' },
                  { title: 'Next.js + tRPC + Prisma', desc: 'Full-stack type-safe API' },
                  { title: 'Vercel AI + Anthropic stream', desc: 'Streaming chat with tool use' },
                ].map(p => (
                  <button key={p.title}
                    onClick={() => setBrainInput(`Build a ${p.title} integration: ${p.desc}`)}
                    className="bg-bg2 border border-border rounded-xl p-3 text-left hover:border-lime transition">
                    <h4 className="text-xs font-bold text-white">{p.title}</h4>
                    <p className="text-[10px] text-muted mt-0.5">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* NEURAL TAB */}
        {tab === 'neural' && (
          <div className="p-4">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">🧬</div>
              <h2 className="font-display text-2xl text-white">Neural Interface</h2>
              <p className="text-sm text-muted max-w-lg mx-auto">
                FinalSpark Neuroplatform bridge — simulation mode active. Connect real brain organoids when ready.
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setNeuralActive(!neuralActive)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  neuralActive ? 'bg-rip text-white' : 'bg-bg2 border border-border text-muted hover:text-white'
                }`}>
                {neuralActive ? '⏹ STOP' : '▶ START'} Simulation
              </button>
              <div className={`w-2 h-2 rounded-full ${neuralActive ? 'bg-lime animate-pulse' : 'bg-muted'}`} />
              <span className="text-[10px] text-muted">{neuralActive ? 'SIM MODE — generating spike data' : 'IDLE'}</span>
            </div>

            {/* MEA Grid */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[0, 1, 2, 3].map(mea => (
                <div key={mea} className="bg-bg2 border border-border rounded-xl p-3">
                  <div className="text-[9px] text-muted uppercase mb-2">MEA {mea}</div>
                  <div className="grid grid-cols-4 gap-1">
                    {Array.from({ length: 8 }, (_, e) => {
                      const intensity = neuralActive ? Math.random() : 0;
                      return (
                        <div key={e}
                          className="aspect-square rounded cursor-pointer transition-all hover:scale-110"
                          style={{
                            backgroundColor: neuralActive
                              ? `rgba(0, 212, 255, ${intensity * 0.8})`
                              : 'rgba(255,255,255,0.05)',
                            boxShadow: neuralActive && intensity > 0.5
                              ? `0 0 ${intensity * 10}px rgba(0, 212, 255, ${intensity * 0.5})`
                              : 'none',
                          }}
                          title={`E${e}: ${(intensity * 200 - 100).toFixed(0)}μV`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Spike log */}
            <div className="bg-bg2 border border-border rounded-xl p-4">
              <h3 className="text-[9px] text-muted uppercase tracking-widest mb-2">Spike Event Log</h3>
              <div className="h-48 overflow-y-auto font-mono text-[10px] text-cyan/80 space-y-0.5">
                {spikeLog.length === 0 ? (
                  <p className="text-muted">Start simulation to see spike events...</p>
                ) : (
                  spikeLog.map((spike, i) => (
                    <div key={i} className={i === 0 ? 'text-lime' : ''}>{spike}</div>
                  ))
                )}
              </div>
            </div>

            {/* Setup info */}
            <div className="mt-4 bg-bg2 border border-border rounded-xl p-4">
              <h3 className="text-sm font-bold text-white mb-2">📡 Going Live</h3>
              <p className="text-xs text-muted leading-relaxed">
                To connect real brain organoids via FinalSpark&apos;s Neuroplatform:
              </p>
              <ol className="text-xs text-muted mt-2 space-y-1 list-decimal list-inside">
                <li>Apply at <span className="text-cyan">finalspark.com/neuroplatform</span></li>
                <li>Set your API token in the environment</li>
                <li>Deploy the harvester proxy (<span className="font-mono text-muted2">python ghoku_harvester.py</span>)</li>
                <li>Click CONNECT — simulation flips to live organoids</li>
              </ol>
            </div>
          </div>
        )}

        {/* MEMORY TAB */}
        {tab === 'memory' && (
          <div className="p-4 max-w-xl mx-auto">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">💾</div>
              <h2 className="font-display text-2xl text-white">Memory Bank</h2>
              <p className="text-sm text-muted">
                Gh.O.K.U. remembers your stack across sessions. Fill this in once — the Brain will auto-tailor every response.
              </p>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-[9px] text-muted uppercase tracking-widest">Operator Name</label>
                <input value={memory.name} onChange={e => setMemory(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Your name"
                  className="w-full mt-1 bg-bg2 border border-border rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-gold" />
              </div>

              {/* Stack */}
              <div>
                <label className="text-[9px] text-muted uppercase tracking-widest">Tech Stack (comma separated)</label>
                <input value={memory.stack.join(', ')}
                  onChange={e => setMemory(prev => ({ ...prev, stack: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                  placeholder="Next.js, React, TypeScript, Tailwind..."
                  className="w-full mt-1 bg-bg2 border border-border rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-gold" />
              </div>

              {/* Frameworks */}
              <div>
                <label className="text-[9px] text-muted uppercase tracking-widest">Frameworks & Libraries</label>
                <input value={memory.frameworks.join(', ')}
                  onChange={e => setMemory(prev => ({ ...prev, frameworks: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                  placeholder="Supabase, Stripe, Zustand, Solana..."
                  className="w-full mt-1 bg-bg2 border border-border rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-gold" />
              </div>

              {/* APIs */}
              <div>
                <label className="text-[9px] text-muted uppercase tracking-widest">APIs Connected</label>
                <input value={memory.apis.join(', ')}
                  onChange={e => setMemory(prev => ({ ...prev, apis: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                  placeholder="Anthropic, Replicate, ElevenLabs..."
                  className="w-full mt-1 bg-bg2 border border-border rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-gold" />
              </div>

              {/* Projects */}
              <div>
                <label className="text-[9px] text-muted uppercase tracking-widest">Active Projects</label>
                <input value={memory.projects.join(', ')}
                  onChange={e => setMemory(prev => ({ ...prev, projects: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                  placeholder="RiP, Gh.O.K.U., Neural Harvester..."
                  className="w-full mt-1 bg-bg2 border border-border rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-gold" />
              </div>

              {/* Notes */}
              <div>
                <label className="text-[9px] text-muted uppercase tracking-widest">Notes & Preferences</label>
                <textarea value={memory.notes.join('\n')}
                  onChange={e => setMemory(prev => ({ ...prev, notes: e.target.value.split('\n').filter(Boolean) }))}
                  placeholder="Coding style preferences, gotchas, patterns..."
                  className="w-full mt-1 bg-bg2 border border-border rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-gold h-24 resize-y" />
              </div>

              {/* Save */}
              <div className="flex items-center gap-3">
                <button onClick={() => { saveMemory(memory); }}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-black bg-gold hover:brightness-110 transition">
                  💾 Save Memory
                </button>
                {memory.lastUpdated && (
                  <span className="text-[10px] text-muted">
                    Last saved: {new Date(memory.lastUpdated).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
