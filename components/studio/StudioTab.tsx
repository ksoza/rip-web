// components/studio/StudioTab.tsx
'use client';
import { useState } from 'react';
import type { User } from '@supabase/supabase-js';

const CATEGORIES = ['TV Show','Movie','Anime','Cartoon','News Show','New Show'];
const GENRE_COLORS: Record<string,string> = {'TV Show':'#00d4ff','Movie':'#ff6b35','Anime':'#ff2d78','Cartoon':'#ffcc00','News Show':'#8aff00','New Show':'#a855f7'};
const TYPES = [{id:'episode',icon:'📺',label:'New Episode'},{id:'scene',icon:'🎬',label:'New Scene'},{id:'ending',icon:'🔀',label:'Alt Ending'},{id:'character',icon:'🧬',label:'Add Character'},{id:'crossover',icon:'⚡',label:'Crossover'},{id:'newscast',icon:'📰',label:'News Remix'}];

export function StudioTab({ user, profile, onProfileUpdate }: any) {
  const [cat, setCat]         = useState('TV Show');
  const [show, setShow]       = useState('');
  const [type, setType]       = useState('episode');
  const [idea, setIdea]       = useState('');
  const [xover, setXover]     = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<any>(null);
  const [error, setError]     = useState('');
  const [copied, setCopied]   = useState(false);

  const genLeft = profile ? profile.generations_limit - profile.generations_used : 0;
  const canGen  = show.trim() && idea.trim() && genLeft > 0 && !loading;

  async function generate() {
    if (!canGen) return;
    setLoading(true); setResult(null); setError('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showTitle: show, genre: cat, creationType: type, idea, crossover: xover, userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.upgrade) { setError('Generation limit reached — upgrade to continue'); }
        else setError(data.error || 'Generation failed');
        return;
      }
      setResult(data);
      onProfileUpdate((p: any) => p ? { ...p, generations_used: p.generations_used + 1 } : p);
    } catch { setError('Network error — try again'); }
    finally { setLoading(false); }
  }

  async function copyForSocial() {
    if (!result) return;
    const text = `🎬 ${result.title}\n${show} — Fan ${TYPES.find(t=>t.id===type)?.label}\n\n${result.logline}\n\n${result.hashtags}\n\n${result.disclaimer}\n\nCreated with RiP ☽ remixip.com`;
    await navigator.clipboard.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-4xl tracking-widest text-white">☽ <span className="text-rip">STUDIO</span></h1>
        <p className="text-muted text-sm mt-1">Pick any IP. Remix it your way.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Form */}
        <div className="lg:col-span-2 space-y-4">

          {/* Category */}
          <div className="bg-bg2 border border-border rounded-xl p-4">
            <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Category</div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => {
                const active = cat === c;
                return (
                  <button key={c} onClick={() => setCat(c)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${active ? 'text-black border-none' : 'border border-bord2 text-muted hover:text-white'}`}
                    style={active ? { backgroundColor: GENRE_COLORS[c] } : {}}
                  >{c}</button>
                );
              })}
            </div>
          </div>

          {/* Show */}
          <div className="bg-bg2 border border-border rounded-xl p-4">
            <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Show / Movie Title</div>
            <input value={show} onChange={e => setShow(e.target.value)}
              placeholder={`e.g. Breaking Bad, Naruto, CNN...`}
              className="w-full bg-bg3 border border-border rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-bord2 placeholder:text-muted2"
            />
          </div>

          {/* Type */}
          <div className="bg-bg2 border border-border rounded-xl p-4">
            <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Creation Type</div>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(t => (
                <button key={t.id} onClick={() => setType(t.id)}
                  className={`py-2.5 rounded-lg text-center transition-all ${type === t.id ? 'border border-cyan bg-cyan/5' : 'bg-bg3 border border-border hover:border-bord2'}`}
                >
                  <div className="text-lg mb-1">{t.icon}</div>
                  <div className={`text-[10px] font-bold ${type === t.id ? 'text-cyan' : 'text-muted'}`}>{t.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Crossover */}
          {type === 'crossover' && (
            <div className="bg-bg2 border border-border rounded-xl p-4">
              <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Crossover With</div>
              <input value={xover} onChange={e => setXover(e.target.value)}
                placeholder="e.g. The Office meets Game of Thrones"
                className="w-full bg-bg3 border border-border rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-bord2 placeholder:text-muted2"
              />
            </div>
          )}

          {/* Idea */}
          <div className="bg-bg2 border border-border rounded-xl p-4">
            <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Your Idea</div>
            <textarea value={idea} onChange={e => setIdea(e.target.value)} rows={5}
              placeholder="Your twist... what happens? Who's involved? Go wild."
              className="w-full bg-bg3 border border-border rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-bord2 placeholder:text-muted2 resize-none leading-relaxed"
            />
          </div>

          {/* Generate */}
          {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">{error}</p>}
          <button onClick={generate} disabled={!canGen}
            className="w-full py-4 rounded-xl font-display text-2xl tracking-widest text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:brightness-110"
            style={{ background: canGen ? 'linear-gradient(90deg,#ff2d78,#a855f7)' : '' }}
          >
            {loading ? '⏳  WRITING YOUR SCENE...' : '☽  GENERATE MY REMIX'}
          </button>

          {/* Result */}
          {result && (
            <div className="bg-bg3 border border-bord2 rounded-xl p-5 animate-slide-up">
              <div className="flex gap-2 items-center mb-3">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded text-black uppercase" style={{ backgroundColor: GENRE_COLORS[cat] }}>{cat}</span>
                <span className="text-[10px] text-muted uppercase tracking-wide">{TYPES.find(t=>t.id===type)?.label}</span>
              </div>
              <p className="text-[10px] text-muted2 italic mb-1">{show}</p>
              <h2 className="font-display text-3xl tracking-wide text-white mb-2">{result.title || 'UNTITLED'}</h2>
              {result.logline && <p className="text-cyan text-sm italic mb-4 leading-relaxed">{result.logline}</p>}
              <p className="text-sm text-white/50 leading-relaxed mb-4 whitespace-pre-wrap">{result.content}</p>
              {result.hashtags && <p className="text-xs text-muted mb-4 leading-loose">{result.hashtags}</p>}
              <p className="text-[10px] text-muted2 italic border-t border-border pt-3 mb-4">{result.disclaimer}</p>
              <div className="flex gap-3">
                <button onClick={copyForSocial}
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all text-white"
                  style={{ background: copied ? 'linear-gradient(90deg,#1a4a00,#2a7a00)' : 'linear-gradient(90deg,#ff2d78,#a855f7)' }}
                >{copied ? '✓ COPIED!' : '📋 COPY FOR SOCIAL'}</button>
                <button className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-bg2 border border-bord2 text-muted hover:border-lime hover:text-lime transition-all">
                  📡 POST TO FEED
                </button>
              </div>
              {result.generationsLeft === 0 && (
                <p className="text-xs text-center text-rip mt-3">That was your last free generation — <a href="#" className="underline">upgrade for more</a></p>
              )}
            </div>
          )}
        </div>

        {/* Right: Stats */}
        <div className="space-y-4">
          <div className="bg-bg2 border border-border rounded-xl p-4">
            <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Generations Left</div>
            <div className="text-center py-2">
              <div className="font-display text-6xl text-white">{genLeft}</div>
              <div className="text-[10px] text-muted uppercase tracking-widest mt-1">
                {profile?.tier || 'free'} plan
              </div>
            </div>
            <div className="h-0.5 bg-border rounded-full overflow-hidden mt-3 mb-1">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${profile ? (genLeft / profile.generations_limit) * 100 : 100}%`, background: 'linear-gradient(90deg,#ff2d78,#00d4ff)' }} />
            </div>
          </div>

          <div className="bg-gradient-to-b from-[#0d0408] to-[#080410] border border-[#2a0a1e] rounded-xl p-5">
            <div className="text-[9px] font-bold text-rip uppercase tracking-widest mb-3">🔥 Upgrade</div>
            <div className="font-display text-4xl text-white mb-1">$1<span className="text-sm font-body text-muted">/mo</span></div>
            <div className="text-xs text-muted2 mb-4 leading-relaxed">30 gens · Voice TTS · No watermark · Social export</div>
            <button className="w-full py-2.5 rounded-lg font-bold text-sm text-white transition hover:brightness-110"
              style={{ background: 'linear-gradient(90deg,#ff2d78,#a855f7)' }}>
              Upgrade to Starter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
