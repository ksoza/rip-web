'use client';
// components/studio/StudioTab.tsx
// Creative Studio V2 â Multi-mode creation suite
import { useState, useCallback, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { useStudioStore, genId } from '@/lib/store';
import type { StudioMode, Asset } from '@/lib/store';
import { TimelineEditor } from './TimelineEditor';
import { LipSyncPanel } from './LipSyncPanel';
import { CharacterController } from './CharacterController';
import { SceneComposer } from './SceneComposer';
import { SceneGenPanel } from './SceneGenPanel';
import { EpisodeGenPanel } from './EpisodeGenPanel';

// ââ Mode Definitions ââââââââââââââââââââââââââââââââââââââââââââ
const MODES: { id: StudioMode; icon: string; label: string; desc: string; color: string }[] = [
  { id: 'script',    icon: 'âï¸', label: 'Script',    desc: 'Stories & dialogue',    color: '#00d4ff' },
  { id: 'character', icon: 'ð¨', label: 'Character', desc: 'Design characters',     color: '#ff2d78' },
  { id: 'scene',     icon: 'ð¼ï¸', label: 'Scene',     desc: 'Generate images',       color: '#a855f7' },
  { id: 'scenegen',  icon: 'ð¥', label: 'Scene Gen', desc: 'Video + audio together', color: '#6d28d9' },
  { id: 'episode',   icon: '📺', label: 'Episode',   desc: 'Full episode pipeline', color: '#7c3aed' },
  { id: 'video',     icon: 'ð¬', label: 'Video',     desc: 'AI video clips',        color: '#ffcc00' },
  { id: 'audio',      icon: 'ð', label: 'Audio',      desc: 'Voice, music & SFX',    color: '#8aff00' },
  { id: 'lipsync',   icon: 'ð', label: 'Lip Sync',  desc: 'Sync audio to face',    color: '#ff69b4' },
  { id: 'controller', icon: 'ð®', label: 'Controller', desc: 'Poses & expressions',  color: '#ff8c00' },
  { id: 'compose',   icon: 'ð¨', label: 'Compose',   desc: 'Layer scene editor',    color: '#00ffa3' },
  { id: 'timeline',  icon: 'ðï¸', label: 'Timeline',  desc: 'Edit & arrange',        color: '#ff6b35' },
];

// ââ Genre data ââââââââââââââââââââââââââââââââââââââââââââââââââ
const CATEGORIES = ['TV Show','Movie','Anime','Cartoon','News Show','New Show'];
const GENRE_COLORS: Record<string,string> = {'TV Show':'#00d4ff','Movie':'#ff6b35','Anime':'#ff2d78','Cartoon':'#ffcc00','News Show':'#8aff00','New Show':'#a855f7'};
const CREATION_TYPES = [{id:'episode',icon:'ðº',label:'New Episode'},{id:'scene',icon:'ð¬',label:'New Scene'},{id:'ending',icon:'ð',label:'Alt Ending'},{id:'character',icon:'ð§¬',label:'Add Character'},{id:'crossover',icon:'â¡',label:'Crossover'},{id:'newscast',icon:'ð°',label:'News Remix'}];

// ââ Image providers âââââââââââââââââââââââââââââââââââââââââââââ
const IMAGE_PROVIDERS = [
  { id: 'dalle',    name: 'DALLÂ·E 3',  icon: 'ð¢', desc: 'OpenAI â Best for detailed art' },
  { id: 'flux',     name: 'Flux Pro',   icon: 'â¡', desc: 'Black Forest Labs â Fast & sharp' },
  { id: 'seedream', name: 'Seedream 3', icon: 'ðµ', desc: 'ByteDance â Photorealistic' },
];

// ââ Video providers âââââââââââââââââââââââââââââââââââââââââââââ
const VIDEO_PROVIDERS = [
  { id: 'luma',   name: 'Luma Dream Machine', icon: 'ð', desc: 'Best for cinematic scenes' },
  { id: 'runway', name: 'Runway Gen-3',       icon: 'âï¸', desc: 'Professional video AI' },
  { id: 'kling',  name: 'Kling',              icon: 'ð¥', desc: 'Advanced motion control' },
];

// ââ Audio providers âââââââââââââââââââââââââââââââââââââââââââââ
const AUDIO_PROVIDERS = [
  { id: 'elevenlabs',     name: 'ElevenLabs Voice',  icon: 'ð£ï¸', desc: 'Character voices & narration' },
  { id: 'elevenlabs-sfx', name: 'ElevenLabs SFX',    icon: 'ð¥', desc: 'Sound effects' },
  { id: 'musicgen',       name: 'MusicGen',           icon: 'ðµ', desc: 'AI background music' },
  { id: 'audiogen',       name: 'AudioGen',           icon: 'ð', desc: 'Ambient audio & effects' },
];

// ââ Character Styles ââââââââââââââââââââââââââââââââââââââââââââ
const CHAR_STYLES = ['anime','realistic','cartoon','pixel art','comic book','3D render','watercolor','cyberpunk'];

// ââ Text AI providers âââââââââââââââââââââââââââââââââââââââââââ
const TEXT_PROVIDERS = [
  { id: 'claude', name: 'Claude', icon: 'ð ', desc: 'Best for deep storytelling' },
  { id: 'grok',   name: 'Grok',   icon: 'ðµ', desc: 'Witty & unfiltered' },
];

type Props = {
  user: User;
  profile: any;
  onProfileUpdate: (fn: any) => void;
  preselectedShow?: string;
  preselectedCategory?: string;
};

export function StudioTab({ user, profile, onProfileUpdate, preselectedShow, preselectedCategory }: Props) {
  const store = useStudioStore();
  const { mode, setMode, assets, addAsset, characters, addCharacter } = store;

  // Shared state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const genLeft = profile ? profile.generations_limit - profile.generations_used : 0;

  // ââ Asset helper ââââââââââââââââââââââââââââââââââââââââââââ
  const saveAsset = useCallback((asset: Omit<Asset, 'id' | 'createdAt'>) => {
    const full: Asset = { ...asset, id: genId('asset'), createdAt: Date.now() };
    addAsset(full);
    return full;
  }, [addAsset]);

  return (
    <div>
      {/* Studio Header */}
      <div className="mb-5">
        <h1 className="font-display text-4xl tracking-widest text-white">â½ CREATIVE <span className="text-rip">STUDIO</span></h1>
        <p className="text-muted text-sm mt-1">Multi-AI creation suite â script, design, animate, publish</p>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-2 -mx-1 px-1">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-left transition-all whitespace-nowrap shrink-0 ${
              mode === m.id
                ? 'border-2 bg-opacity-10'
                : 'border border-border bg-bg2 hover:border-bord2'
            }`}
            style={mode === m.id ? {
              borderColor: m.color,
              backgroundColor: m.color + '10',
            } : {}}
          >
            <span className="text-lg">{m.icon}</span>
            <div>
              <div className={`text-xs font-bold ${mode === m.id ? 'text-white' : 'text-muted'}`}>{m.label}</div>
              <div className="text-[9px] text-muted2 hidden sm:block">{m.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Mode Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Main Panel (3 cols) */}
        <div className={['timeline', 'compose'].includes(mode) ? 'lg:col-span-4' : 'lg:col-span-3'}>
          {mode === 'script'    && <ScriptPanel user={user} profile={profile} onProfileUpdate={onProfileUpdate} loading={loading} setLoading={setLoading} error={error} setError={setError} saveAsset={saveAsset} genLeft={genLeft} preselectedShow={preselectedShow} preselectedCategory={preselectedCategory} />}
          {mode === 'character' && <CharacterPanel user={user} loading={loading} setLoading={setLoading} error={error} setError={setError} saveAsset={saveAsset} characters={characters} addCharacter={addCharacter} />}
          {mode === 'scene'     && <ScenePanel user={user} loading={loading} setLoading={setLoading} error={error} setError={setError} saveAsset={saveAsset} characters={characters} />}
          {mode === 'scenegen'  && <SceneGenPanel user={user} loading={loading} setLoading={setLoading} error={error} setError={setError} saveAsset={saveAsset} />}
          {mode === 'episode'   && <EpisodeGenPanel user={user} loading={loading} setLoading={setLoading} error={error} setError={setError} saveAsset={saveAsset} />}
          {mode === 'video'     && <VideoPanel user={user} loading={loading} setLoading={setLoading} error={error} setError={setError} saveAsset={saveAsset} />}
          {mode === 'audio'      && <AudioPanel user={user} loading={loading} setLoading={setLoading} error={error} setError={setError} saveAsset={saveAsset} />}
          {mode === 'lipsync'   && <LipSyncPanel user={user} loading={loading} setLoading={setLoading} error={error} setError={setError} saveAsset={saveAsset} />}
          {mode === 'controller' && <CharacterController user={user} loading={loading} setLoading={setLoading} error={error} setError={setError} saveAsset={saveAsset} characters={characters} addCharacter={addCharacter} />}
          {mode === 'compose'   && <SceneComposer user={user} loading={loading} setLoading={setLoading} error={error} setError={setError} saveAsset={saveAsset} />}
          {mode === 'timeline'  && <TimelineEditor assets={assets} />}
        </div>

        {/* Right Sidebar (1 col) â hidden in timeline mode */}
        {!['timeline', 'compose'].includes(mode) && (
          <div className="space-y-4">
            {/* Generations Counter */}
            <div className="bg-bg2 border border-border rounded-xl p-4">
              <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-2">Generations</div>
              <div className="text-center py-1">
                <div className="font-display text-5xl text-white">{genLeft}</div>
                <div className="text-[10px] text-muted uppercase tracking-widest mt-1">{profile?.tier || 'free'} plan</div>
              </div>
              <div className="h-0.5 bg-border rounded-full overflow-hidden mt-3">
                <div className="h-full rounded-full transition-all" style={{
                  width: `${profile ? (genLeft / profile.generations_limit) * 100 : 100}%`,
                  background: 'linear-gradient(90deg,#ff2d78,#00d4ff)',
                }} />
              </div>
            </div>

            {/* Asset Library */}
            <div className="bg-bg2 border border-border rounded-xl p-4">
              <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Asset Library</div>
              {assets.length === 0 ? (
                <div className="text-center py-6 text-muted2 text-xs">
                  Generate content to build your library
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {assets.slice(0, 10).map(a => (
                    <div key={a.id} className="flex items-center gap-2 p-2 bg-bg3 rounded-lg">
                      {a.url && (a.type === 'image' || a.type === 'sprite') ? (
                        <img src={a.url} alt="" className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-bg flex items-center justify-center text-xs">
                          {a.type === 'text' ? 'ð' : a.type === 'video' ? 'ð¬' : a.type === 'voice' ? 'ð£ï¸' : a.type === 'music' ? 'ðµ' : 'ð¦'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white truncate">{a.name}</div>
                        <div className="text-[9px] text-muted2">{a.type} Â· {a.provider}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Characters */}
            {characters.length > 0 && (
              <div className="bg-bg2 border border-border rounded-xl p-4">
                <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Characters</div>
                <div className="space-y-2">
                  {characters.map(c => (
                    <div key={c.id} className="flex items-center gap-2 p-2 bg-bg3 rounded-lg">
                      {c.referenceImage ? (
                        <img src={c.referenceImage} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-rip/20 flex items-center justify-center text-xs text-rip font-bold">
                          {c.name[0]}
                        </div>
                      )}
                      <div>
                        <div className="text-xs text-white font-bold">{c.name}</div>
                        <div className="text-[9px] text-muted2">{c.style}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upgrade CTA */}
            <div className="bg-gradient-to-b from-[#0d0408] to-[#080410] border border-[#2a0a1e] rounded-xl p-4">
              <div className="text-[9px] font-bold text-rip uppercase tracking-widest mb-2">ð¥ Unlock All AI</div>
              <div className="font-display text-3xl text-white mb-1">$10<span className="text-sm font-body text-muted">/mo</span></div>
              <div className="text-[10px] text-muted2 mb-3 leading-relaxed">Unlimited gens Â· All AI models Â· Video Â· Timeline Â· NFT minting</div>
              <button className="w-full py-2 rounded-lg font-bold text-xs text-white transition hover:brightness-110"
                style={{ background: 'linear-gradient(90deg,#ff2d78,#a855f7)' }}>
                Upgrade to Studio
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// SCRIPT PANEL â Story & dialogue writing (existing + enhanced)
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function ScriptPanel({ user, profile, onProfileUpdate, loading, setLoading, error, setError, saveAsset, genLeft, preselectedShow, preselectedCategory }: any) {
  const [cat, setCat]           = useState(preselectedCategory || 'TV Show');
  const [show, setShow]         = useState(preselectedShow || '');
  const [type, setType]         = useState('episode');
  const [idea, setIdea]         = useState('');
  const [xover, setXover]       = useState('');
  const [textProvider, setTextProvider] = useState('claude');
  const [result, setResult]     = useState<any>(null);
  const [copied, setCopied]     = useState(false);

  // Pre-fill when navigating from Discover tab
  useEffect(() => {
    if (preselectedShow) setShow(preselectedShow);
    if (preselectedCategory) setCat(preselectedCategory);
  }, [preselectedShow, preselectedCategory]);

  const canGen = show.trim() && idea.trim() && genLeft > 0 && !loading;

  async function generate() {
    if (!canGen) return;
    setLoading(true); setResult(null); setError('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showTitle: show, genre: cat, creationType: type, idea, crossover: xover, userId: user.id, provider: textProvider }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Generation failed');
        return;
      }
      setResult(data);
      onProfileUpdate((p: any) => p ? { ...p, generations_used: p.generations_used + 1 } : p);

      // Save to asset library
      saveAsset({
        type: 'text' as const,
        name: data.title || `${show} â ${CREATION_TYPES.find(t => t.id === type)?.label}`,
        content: data.content,
        provider: textProvider,
        prompt: idea,
      });
    } catch { setError('Network error â try again'); }
    finally { setLoading(false); }
  }

  async function copyForSocial() {
    if (!result) return;
    const text = `ð¬ ${result.title}\n${show} â Fan ${CREATION_TYPES.find(t=>t.id===type)?.label}\n\n${result.logline}\n\n${result.hashtags}\n\n${result.disclaimer}\n\nCreated with RiP â½ remixip.icu`;
    await navigator.clipboard.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      {/* AI Provider Toggle */}
      <div className="bg-bg2 border border-border rounded-xl p-4">
        <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">AI Writer</div>
        <div className="flex gap-2">
          {TEXT_PROVIDERS.map(p => (
            <button key={p.id} onClick={() => setTextProvider(p.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
                textProvider === p.id
                  ? 'border-2 border-cyan bg-cyan/5 text-cyan'
                  : 'border border-border bg-bg3 text-muted hover:border-bord2'
              }`}>
              <span>{p.icon}</span> {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div className="bg-bg2 border border-border rounded-xl p-4">
        <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Category</div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${cat === c ? 'text-black' : 'border border-bord2 text-muted hover:text-white'}`}
              style={cat === c ? { backgroundColor: GENRE_COLORS[c] } : {}}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Show Title */}
      <div className="bg-bg2 border border-border rounded-xl p-4">
        <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Show / Movie Title</div>
        <input value={show} onChange={e => setShow(e.target.value)}
          placeholder="e.g. Breaking Bad, Naruto, CNN..."
          className="w-full bg-bg3 border border-border rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-bord2 placeholder:text-muted2" />
      </div>

      {/* Creation Type */}
      <div className="bg-bg2 border border-border rounded-xl p-4">
        <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Creation Type</div>
        <div className="grid grid-cols-3 gap-2">
          {CREATION_TYPES.map(t => (
            <button key={t.id} onClick={() => setType(t.id)}
              className={`py-2.5 rounded-lg text-center transition-all ${type === t.id ? 'border border-cyan bg-cyan/5' : 'bg-bg3 border border-border hover:border-bord2'}`}>
              <div className="text-lg mb-1">{t.icon}</div>
              <div className={`text-[10px] font-bold ${type === t.id ? 'text-cyan' : 'text-muted'}`}>{t.label}</div>
            </button>
          ))}
        </div>
      </div>

      {type === 'crossover' && (
        <div className="bg-bg2 border border-border rounded-xl p-4">
          <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Crossover With</div>
          <input value={xover} onChange={e => setXover(e.target.value)} placeholder="e.g. The Office meets Game of Thrones"
            className="w-full bg-bg3 border border-border rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-bord2 placeholder:text-muted2" />
        </div>
      )}

      {/* Idea */}
      <div className="bg-bg2 border border-border rounded-xl p-4">
        <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Your Idea</div>
        <textarea value={idea} onChange={e => setIdea(e.target.value)} rows={5}
          placeholder="Your twist... what happens? Who's involved? Go wild."
          className="w-full bg-bg3 border border-border rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-bord2 placeholder:text-muted2 resize-none leading-relaxed" />
      </div>

      {/* Error + Generate */}
      {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">{error}</p>}
      <button onClick={generate} disabled={!canGen}
        className="w-full py-4 rounded-xl font-display text-2xl tracking-widest text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:brightness-110"
        style={{ background: canGen ? 'linear-gradient(90deg,#ff2d78,#a855f7)' : '' }}>
        {loading ? 'â³  WRITING YOUR SCENE...' : 'â½  GENERATE MY REMIX'}
      </button>

      {/* Result */}
      {result && (
        <div className="bg-bg3 border border-bord2 rounded-xl p-5 animate-slide-up">
          <div className="flex gap-2 items-center mb-3">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded text-black uppercase" style={{ backgroundColor: GENRE_COLORS[cat] }}>{cat}</span>
            <span className="text-[10px] text-muted uppercase tracking-wide">{CREATION_TYPES.find(t=>t.id===type)?.label}</span>
            <span className="text-[9px] text-muted2 ml-auto">via {TEXT_PROVIDERS.find(p => p.id === textProvider)?.name}</span>
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
              style={{ background: copied ? 'linear-gradient(90deg,#1a4a00,#2a7a00)' : 'linear-gradient(90deg,#ff2d78,#a855f7)' }}>
              {copied ? 'â COPIED!' : 'ð COPY FOR SOCIAL'}
            </button>
            <button className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-bg2 border border-bord2 text-muted hover:border-lime hover:text-lime transition-all">
              ð¡ POST TO FEED
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// CHARACTER PANEL â Design & generate characters
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function CharacterPanel({ user, loading, setLoading, error, setError, saveAsset, characters, addCharacter }: any) {
  const [name, setName]         = useState('');
  const [desc, setDesc]         = useState('');
  const [style, setStyle]       = useState('anime');
  const [traits, setTraits]     = useState('');
  const [provider, setProvider] = useState('dalle');
  const [result, setResult]     = useState<any>(null);

  async function generateCharacter() {
    if (!name.trim() || !desc.trim()) return;
    setLoading(true); setResult(null); setError('');
    try {
      // Generate character reference image
      const prompt = `Character design sheet for "${name}": ${desc}. Style: ${style}. Key traits: ${traits}. Full body, front-facing, clean background, professional character art.`;

      const res = await fetch('/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, provider, style, userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Character generation failed'); return; }

      setResult(data);

      // Save as character
      addCharacter({
        id: genId('char'),
        name,
        description: desc,
        style,
        traits: traits.split(',').map((t: string) => t.trim()).filter(Boolean),
        referenceImage: data.url,
      });

      // Save as asset
      saveAsset({
        type: 'image' as const,
        name: `Character: ${name}`,
        url: data.url,
        provider,
        prompt,
      });
    } catch { setError('Network error â try again'); }
    finally { setLoading(false); }
  }

  async function generateSprite() {
    if (!name.trim() || !desc.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/generate/sprite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: desc,
          characterName: name,
          style,
          directions: 'front,back,left,right',
          provider: 'flux',
          userId: user.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Sprite generation failed'); return; }

      saveAsset({
        type: 'sprite' as const,
        name: `Sprites: ${name}`,
        url: data.url,
        provider: 'flux',
        prompt: desc,
      });
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      {/* Character Name */}
      <div className="bg-bg2 border border-border rounded-xl p-4">
        <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Character Name</div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Shadow, Luna, Detective Park..."
          className="w-full bg-bg3 border border-border rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-bord2 placeholder:text-muted2" />
      </div>

      {/* Description */}
      <div className="bg-bg2 border border-border rounded-xl p-4">
        <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Description</div>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
          placeholder="Describe the character's appearance in detail: hair, clothing, build, distinguishing features..."
          className="w-full bg-bg3 border border-border rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-bord2 placeholder:text-muted2 resize-none leading-relaxed" />
      </div>

      {/* Visual Traits */}
      <div className="bg-bg2 border border-border rounded-xl p-4">
        <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Visual Traits (comma separated)</div>
        <input value={traits} onChange={e => setTraits(e.target.value)} placeholder="e.g. scar on left eye, silver hair, leather jacket, tall"
          className="w-full bg-bg3 border border-border rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-bord2 placeholder:text-muted2" />
      </div>

      {/* Art Style */}
      <div className="bg-bg2 border border-border rounded-xl p-4">
        <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Art Style</div>
        <div className="flex flex-wrap gap-2">
          {CHAR_STYLES.map(s => (
            <button key={s} onClick={() => setStyle(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-all ${
                style === s ? 'border-2 border-rip bg-rip/10 text-rip' : 'border border-border bg-bg3 text-muted hover:text-white'
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Image AI Provider */}
      <div className="bg-bg2 border border-border rounded-xl p-4">
        <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Image AI</div>
        <div className="grid grid-cols-3 gap-2">
          {IMAGE_PROVIDERS.map(p => (
            <button key={p.id} onClick={() => setProvider(p.id)}
              className={`py-3 rounded-lg text-center transition-all ${
                provider === p.id ? 'border-2 border-rip bg-rip/5' : 'border border-border bg-bg3 hover:border-bord2'
              }`}>
              <div className="text-lg mb-1">{p.icon}</div>
              <div className={`text-[10px] font-bold ${provider === p.id ? 'text-rip' : 'text-muted'}`}>{p.name}</div>
              <div className="text-[8px] text-muted2 hidden sm:block">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Generate Buttons */}
      {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={generateCharacter} disabled={!name.trim() || !desc.trim() || loading}
          className="py-3.5 rounded-xl font-display text-lg tracking-widest text-white disabled:opacity-40 transition-all hover:brightness-110"
          style={{ background: 'linear-gradient(90deg,#ff2d78,#a855f7)' }}>
          {loading ? 'â³ GENERATING...' : 'ð¨ GENERATE CHARACTER'}
        </button>
        <button onClick={generateSprite} disabled={!name.trim() || !desc.trim() || loading}
          className="py-3.5 rounded-xl font-display text-lg tracking-widest text-white disabled:opacity-40 transition-all hover:brightness-110"
          style={{ background: 'linear-gradient(90deg,#00d4ff,#a855f7)' }}>
          {loading ? 'â³...' : 'ð SPRITE SHEET'}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-bg3 border border-bord2 rounded-xl p-5 animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-rip/20 text-rip uppercase">Character Created</span>
            <span className="text-[10px] text-muted ml-auto">via {IMAGE_PROVIDERS.find(p => p.id === provider)?.name}</span>
          </div>
          <div className="font-display text-2xl text-white mb-3">{name}</div>
          {result.url && (
            <div className="rounded-lg overflow-hidden mb-3 border border-border">
              <img src={result.url} alt={name} className="w-full" />
            </div>
          )}
          <p className="text-xs text-muted leading-relaxed">{desc}</p>
          {traits && <p className="text-[10px] text-muted2 mt-2">Traits: {traits}</p>}
        </div>
      )}

      {/* Existing Characters */}
      {characters.length > 0 && (
        <div className="bg-bg2 border border-border rounded-xl p-4">
          <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Your Characters ({characters.length})</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {characters.map((c: any) => (
              <div key={c.id} className="bg-bg3 border border-border rounded-lg p-3 text-center">
                {c.referenceImage ? (
                  <img src={c.referenceImage} alt={c.name} className="w-16 h-16 rounded-full mx-auto mb-2 object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-full mx-auto mb-2 bg-rip/20 flex items-center justify-center text-2xl text-rip font-display">{c.name[0]}</div>
                )}
                <div className="text-xs font-bold text-white">{c.name}</div>
                <div className="text-[9px] text-muted2 capitalize">{c.style}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// SCENE PANEL â Image generation with character references
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function ScenePanel({ user, loading, setLoading, error, setError, saveAsset, characters }: any) {
  const [prompt, setPrompt]     = useState('');
  const [provider, setProvider] = useState('dalle');
  const [size, setSize]         = useState('1024x1024');
  const [charId, setCharId]     = useState('');
  const [result, setResult]     = useState<any>(null);

  const selectedChar = characters.find((c: any) => c.id === charId);

  async function generateScene() {
    if (!prompt.trim()) return;
    setLoading(true); setResult(null); setError('');
    try {
      const res = await fetch('/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          provider,
          size,
          userId: user.id,
          characterRef: selectedChar ? {
            name: selectedChar.name,
            description: selectedChar.description,
            style: selectedChar.style,
            traits: selectedChar.traits,
          } : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Scene generation failed'); return; }

      setResult(data);
      saveAsset({
        type: 'image' as const,
        name: prompt.slice(0, 40) + '...',
        url: data.url,
        provider,
        prompt,
      });
    } catch { setError('Network error â try again'); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      {/* Character Reference */}
      {characters.length > 0 && (
        <div className="bg-bg2 border border-border rounded-xl p-4">
          <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Character Reference (optional)</div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setCharId('')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${!charId ? 'border-2 border-cyan text-cyan' : 'border border-border text-muted'}`}>
              None
            </button>
            {characters.map((c: any) => (
              <button key={c.id} onClick={() => setCharId(c.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  charId === c.id ? 'border-2 border-rip text-rip' : 'border border-border text-muted'
                }`}>
                {c.referenceImage && <img src={c.referenceImage} alt="" className="w-4 h-4 rounded-full" />}
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Scene Prompt */}
      <div className="bg-bg2 border border-border rounded-xl p-4">
        <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Scene Description</div>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4}
          placeholder="Describe the scene: setting, mood, action, lighting..."
          className="w-full bg-bg3 border border-border rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-bord2 placeholder:text-muted2 resize-none leading-relaxed" />
      </div>

      {/* Image Provider */}
      <div className="bg-bg2 border border-border rounded-xl p-4">
        <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Image AI</div>
        <div className="grid grid-cols-3 gap-2">
          {IMAGE_PROVIDERS.map(p => (
            <button key={p.id} onClick={() => setProvider(p.id)}
              className={`py-2.5 rounded-lg text-center transition-all ${
                provider === p.id ? 'border-2 border-purple bg-purple/5' : 'border border-border bg-bg3 hover:border-bord2'
              }`}>
              <div className="text-lg mb-1">{p.icon}</div>
              <div className={`text-[10px] font-bold ${provider === p.id ? 'text-purple' : 'text-muted'}`}>{p.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Size */}
      <div className="bg-bg2 border border-border rounded-xl p-4">
        <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Dimensions</div>
        <div className="flex gap-2">
          {[
            { v: '1024x1024', l: '1:1 Square' },
            { v: '1792x1024', l: '16:9 Wide' },
            { v: '1024x1792', l: '9:16 Tall' },
          ].map(s => (
            <button key={s.v} onClick={() => setSize(s.v)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                size === s.v ? 'border-2 border-cyan text-cyan bg-cyan/5' : 'border border-border text-muted bg-bg3'
              }`}>
              {s.l}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">{error}</p>}

      <button onClick={generateScene} disabled={!prompt.trim() || loading}
        className="w-full py-4 rounded-xl font-display text-xl tracking-widest text-white disabled:opacity-40 transition-all hover:brightness-110"
        style={{ background: 'linear-gradient(90deg,#a855f7,#ff2d78)' }}>
        {loading ? 'â³  GENERATING SCENE...' : 'ð¼ï¸  GENERATE SCENE'}
      </button>

      {result?.url && (
        <div className="bg-bg3 border border-bord2 rounded-xl overflow-hidden animate-slide-up">
          <img src={result.url} alt="Generated scene" className="w-full" />
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-purple/20 text-purple uppercase">Scene</span>
              <span className="text-[10px] text-muted">via {IMAGE_PROVIDERS.find(p => p.id === provider)?.name}</span>
            </div>
            {result.revised_prompt && <p className="text-xs text-muted2 leading-relaxed">{result.revised_prompt}</p>}
            <div className="flex gap-2 mt-3">
              <button className="flex-1 py-2 rounded-lg text-xs font-bold text-white bg-rip/20 border border-rip/30 hover:bg-rip/30 transition-all">
                ðï¸ Add to Timeline
              </button>
              <button className="flex-1 py-2 rounded-lg text-xs font-bold text-muted border border-border hover:border-bord2 transition-all">
                ð¾ Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// VIDEO PANEL â AI video generation
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function VideoPanel({ user, loading, setLoading, error, setError, saveAsset }: any) {
  const [prompt, setPrompt]       = useState('');
  const [provider, setProvider]   = useState('luma');
  const [imageUrl, setImageUrl]   = useState('');
  const [duration, setDuration]   = useState(5);
  const [result, setResult]       = useState<any>(null);
  const { assets } = useStudioStore();

  // Get image assets for image-to-video
  const imageAssets = assets.filter(a => a.type === 'image' || a.type === 'sprite');

  async function generateVideo() {
    if (!prompt.trim()) return;
    setLoading(true); setResult(null); setError('');
    try {
      const res = await fetch('/api/generate/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, provider, imageUrl: imageUrl || undefined, duration, userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Video generation failed'); return; }

      setResult(data);
      saveAsset({
        type: 'video' as const,
        name: prompt.slice(0, 40) + '...',
        url: data.url,
        duration: data.duration || duration,
        provider,
        prompt,
      });
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      {/* Video AI Provider */}
      <div className="bg-bg2 border border-border rounded-xl p-4">
        <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Video AI</div>
        <div className="grid grid-cols-3 gap-2">
          {VIDEO_PROVIDERS.map(p => (
            <button key={p.id} onClick={() => setProvider(p.id)}
              className={`py-3 rounded-lg text-center transition-all ${
                provider === p.id ? 'border-2 border-gold bg-gold/5' : 'border border-border bg-bg3 hover:border-bord2'
              }`}>
              <div className="text-lg mb-1">{p.icon}</div>
              <div className={`text-[10px] font-bold ${provider === p.id ? 'text-gold' : 'text-muted'}`}>{p.name}</div>
              <div className="text-[8px] text-muted2">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Scene Prompt */}
      <div className="bg-bg2 border border-border rounded-xl p-4">
        <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Video Prompt</div>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4}
          placeholder="Describe the video scene: action, camera movement, mood, style..."
          className="w-full bg-bg3 border border-border rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-bord2 placeholder:text-muted2 resize-none leading-relaxed" />
      </div>

      {/* Source Image (optional) */}
      <div className="bg-bg2 border border-border rounded-xl p-4">
        <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Source Image (Image â Video)</div>
        {imageAssets.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button onClick={() => setImageUrl('')}
              className={`shrink-0 w-16 h-16 rounded-lg border-2 flex items-center justify-center text-xs ${
                !imageUrl ? 'border-cyan text-cyan' : 'border-border text-muted'
              }`}>None</button>
            {imageAssets.map(a => (
              <button key={a.id} onClick={() => setImageUrl(a.url || '')}
                className={`shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden ${
                  imageUrl === a.url ? 'border-gold' : 'border-border'
                }`}>
                <img src={a.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted2 py-2">Generate images in Scene mode first, or paste a URL:</div>
        )}
        <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Paste image URL (optional)"
          className="w-full bg-bg3 border border-border rounded-lg px-4 py-2 text-white text-xs outline-none focus:border-bord2 placeholder:text-muted2 mt-2" />
      </div>

      {/* Duration */}
      <div className="bg-bg2 border border-border rounded-xl p-4">
        <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Duration</div>
        <div className="flex gap-2">
          {[3, 5, 10].map(d => (
            <button key={d} onClick={() => setDuration(d)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                duration === d ? 'border-2 border-gold text-gold bg-gold/5' : 'border border-border text-muted bg-bg3'
              }`}>
              {d}s
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">{error}</p>}

      <button onClick={generateVideo} disabled={!prompt.trim() || loading}
        className="w-full py-4 rounded-xl font-display text-xl tracking-widest text-white disabled:opacity-40 transition-all hover:brightness-110"
        style={{ background: 'linear-gradient(90deg,#ffcc00,#ff6b35)' }}>
        {loading ? 'â³  GENERATING VIDEO... (this may take 1-3 min)' : 'ð¬  GENERATE VIDEO'}
      </button>

      {result?.url && (
        <div className="bg-bg3 border border-bord2 rounded-xl overflow-hidden animate-slide-up">
          <video src={result.url} controls className="w-full" />
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-gold/20 text-gold uppercase">Video</span>
              <span className="text-[10px] text-muted">via {VIDEO_PROVIDERS.find(p => p.id === provider)?.name}</span>
              <span className="text-[10px] text-muted2 ml-auto">{duration}s</span>
            </div>
            <button className="w-full py-2 rounded-lg text-xs font-bold text-gold bg-gold/10 border border-gold/20 hover:bg-gold/20 transition-all mt-2">
              ðï¸ Add to Timeline
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// AUDIO PANEL â Voice, SFX, Music
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function AudioPanel({ user, loading, setLoading, error, setError, saveAsset }: any) {
  const [audioMode, setAudioMode] = useState<'voice'|'sfx'|'music'>('voice');
  const [text, setText]           = useState('');
  const [prompt, setPrompt]       = useState('');
  const [voiceId, setVoiceId]     = useState('');
  const [duration, setDuration]   = useState(10);
  const [result, setResult]       = useState<any>(null);

  const VOICES = [
    { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel',  desc: 'Warm, calm narrator' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah',   desc: 'Soft, friendly' },
    { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam',    desc: 'Deep, authoritative' },
    { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni',  desc: 'Young, expressive' },
    { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold',  desc: 'Deep, dramatic' },
    { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam',     desc: 'Raspy, dynamic' },
  ];

  async function generateAudio() {
    setLoading(true); setResult(null); setError('');
    try {
      let body: any = { userId: user.id };

      if (audioMode === 'voice') {
        body.provider = 'elevenlabs';
        body.text = text;
        body.voiceId = voiceId || VOICES[0].id;
      } else if (audioMode === 'sfx') {
        body.provider = 'elevenlabs-sfx';
        body.prompt = prompt;
        body.duration = duration;
      } else {
        body.provider = 'musicgen';
        body.prompt = prompt;
        body.duration = duration;
      }

      const res = await fetch('/api/generate/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Audio generation failed'); return; }

      setResult(data);
      saveAsset({
        type: audioMode as any,
        name: audioMode === 'voice' ? `Voice: ${text.slice(0, 30)}...` : audioMode === 'sfx' ? `SFX: ${prompt.slice(0, 30)}...` : `Music: ${prompt.slice(0, 30)}...`,
        url: data.audioUrl,
        duration: data.duration || duration,
        provider: body.provider,
        prompt: text || prompt,
      });
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      {/* Audio Mode */}
      <div className="bg-bg2 border border-border rounded-xl p-4">
        <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Audio Type</div>
        <div className="grid grid-cols-3 gap-2">
          {([
            { id: 'voice' as const, icon: 'ð£ï¸', label: 'Voice', color: '#8aff00' },
            { id: 'sfx' as const,   icon: 'ð¥', label: 'Sound FX', color: '#00d4ff' },
            { id: 'music' as const, icon: 'ðµ', label: 'Music', color: '#a855f7' },
          ]).map(m => (
            <button key={m.id} onClick={() => setAudioMode(m.id)}
              className={`py-3 rounded-lg text-center transition-all ${
                audioMode === m.id ? 'border-2 bg-opacity-5' : 'border border-border bg-bg3 hover:border-bord2'
              }`}
              style={audioMode === m.id ? { borderColor: m.color, backgroundColor: m.color + '10' } : {}}>
              <div className="text-xl mb-1">{m.icon}</div>
              <div className="text-[10px] font-bold" style={audioMode === m.id ? { color: m.color } : { color: '#3a3a50' }}>{m.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Voice Mode: Text + Voice Selection */}
      {audioMode === 'voice' && (
        <>
          <div className="bg-bg2 border border-border rounded-xl p-4">
            <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Dialogue Text</div>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={4}
              placeholder="Type the dialogue or narration to voice..."
              className="w-full bg-bg3 border border-border rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-bord2 placeholder:text-muted2 resize-none leading-relaxed" />
          </div>
          <div className="bg-bg2 border border-border rounded-xl p-4">
            <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Voice</div>
            <div className="grid grid-cols-3 gap-2">
              {VOICES.map(v => (
                <button key={v.id} onClick={() => setVoiceId(v.id)}
                  className={`py-2.5 rounded-lg text-center transition-all ${
                    (voiceId || VOICES[0].id) === v.id ? 'border-2 border-lime bg-lime/5' : 'border border-border bg-bg3'
                  }`}>
                  <div className={`text-xs font-bold ${(voiceId || VOICES[0].id) === v.id ? 'text-lime' : 'text-muted'}`}>{v.name}</div>
                  <div className="text-[8px] text-muted2">{v.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* SFX / Music Mode: Prompt + Duration */}
      {(audioMode === 'sfx' || audioMode === 'music') && (
        <>
          <div className="bg-bg2 border border-border rounded-xl p-4">
            <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">
              {audioMode === 'sfx' ? 'Sound Effect Description' : 'Music Description'}
            </div>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
              placeholder={audioMode === 'sfx'
                ? 'e.g. Thunder crack, sword clashing, footsteps in rain...'
                : 'e.g. Tense orchestral score, lo-fi hip hop, epic battle theme...'}
              className="w-full bg-bg3 border border-border rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-bord2 placeholder:text-muted2 resize-none leading-relaxed" />
          </div>
          <div className="bg-bg2 border border-border rounded-xl p-4">
            <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Duration</div>
            <div className="flex gap-2">
              {(audioMode === 'sfx' ? [3, 5, 10] : [10, 15, 30]).map(d => (
                <button key={d} onClick={() => setDuration(d)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                    duration === d ? 'border-2 border-cyan text-cyan bg-cyan/5' : 'border border-border text-muted bg-bg3'
                  }`}>{d}s</button>
              ))}
            </div>
          </div>
        </>
      )}

      {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">{error}</p>}

      <button onClick={generateAudio}
        disabled={loading || (audioMode === 'voice' ? !text.trim() : !prompt.trim())}
        className="w-full py-4 rounded-xl font-display text-xl tracking-widest text-white disabled:opacity-40 transition-all hover:brightness-110"
        style={{ background: 'linear-gradient(90deg,#8aff00,#00d4ff)' }}>
        {loading ? 'â³  GENERATING AUDIO...' : audioMode === 'voice' ? 'ð£ï¸  GENERATE VOICE' : audioMode === 'sfx' ? 'ð¥  GENERATE SFX' : 'ðµ  GENERATE MUSIC'}
      </button>

      {result?.audioUrl && (
        <div className="bg-bg3 border border-bord2 rounded-xl p-5 animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-lime/20 text-lime uppercase">{audioMode}</span>
            <span className="text-[10px] text-muted">via {result.provider}</span>
          </div>
          <audio src={result.audioUrl} controls className="w-full mb-3" style={{ filter: 'hue-rotate(300deg)' }} />
          <button className="w-full py-2 rounded-lg text-xs font-bold text-lime bg-lime/10 border border-lime/20 hover:bg-lime/20 transition-all">
            ðï¸ Add to Timeline
          </button>
        </div>
      )}
    </div>
  );
}
