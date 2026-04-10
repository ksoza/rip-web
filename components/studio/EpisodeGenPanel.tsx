'use client';
// components/studio/EpisodeGenPanel.tsx
// Full episode generation UI - prompt -> AI script -> scene-by-scene video+audio
// Phase 1: Setup & write script  |  Phase 2: Generate all scenes via unified pipeline
import { useState, useCallback, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Asset } from '@/lib/store';
import { SHOW_PROFILES, ART_STYLES, type ArtStyleId } from '@/lib/shows';

// -- Types -----------------------------------------------------

interface EpisodeGenPanelProps {
  user: User;
  loading: boolean;
  setLoading: (l: boolean) => void;
  error: string;
  setError: (e: string) => void;
  saveAsset: (a: Omit<Asset, 'id' | 'createdAt'>) => void;
  onPublish?: (data: { title?: string; description?: string; thumbnail?: string; mediaUrl?: string; show?: string; genre?: string }) => void;
}

interface ScriptScene {
  sceneNum: number;
  heading: string;
  description: string;
  action: string;
  dialogue: { character: string; line: string; direction?: string }[];
  duration: string;
  mood: string;
  cameraNote: string;
  transition: string;
}

interface SceneVideo {
  status: 'pending' | 'generating' | 'done' | 'error';
  videoUrl?: string;
  audioSynced?: boolean;
  error?: string;
}

type Phase = 'setup' | 'script' | 'production' | 'complete';

// -- Constants -------------------------------------------------

const FORMATS = [
  { id: 'short',   label: 'Short',   desc: '~60 s \u00B7 3-4 scenes', icon: '\u26A1' },
  { id: 'scene',   label: 'Scene',   desc: '~3 min \u00B7 4-5 scenes', icon: '\u{1F3AC}' },
  { id: 'episode', label: 'Episode', desc: '~10 min \u00B7 6-8 scenes', icon: '\u{1F4FA}' },
  { id: 'trailer', label: 'Trailer', desc: '~90 s \u00B7 5-6 cuts',    icon: '\u{1F39E}\uFE0F' },
];

const SHOW_LIST = Object.entries(SHOW_PROFILES)
  .filter(([k]) => k !== 'custom')
  .map(([key, show]) => ({ key, ...show }));

const SHOW_CATEGORIES = [...new Set(SHOW_LIST.map(s => s.category))];

// -- Component -------------------------------------------------

export function EpisodeGenPanel({
  user, loading, setLoading, error, setError, saveAsset, onPublish,
}: EpisodeGenPanelProps) {

  /* -- Setup state ----------------------------------------- */
  const [show, setShow]                 = useState('');
  const [artStyle, setArtStyle]         = useState<ArtStyleId>('source-faithful');
  const [selectedChars, setSelectedChars] = useState<string[]>([]);
  const [prompt, setPrompt]             = useState('');
  const [format, setFormat]             = useState('short');
  const [catFilter, setCatFilter]       = useState('');

  /* -- Script state ---------------------------------------- */
  const [phase, setPhase]               = useState<Phase>('setup');
  const [script, setScript]             = useState<{
    title: string; logline: string; scenes: ScriptScene[];
  } | null>(null);
  const [sceneInputs, setSceneInputs]   = useState<any[]>([]);

  /* -- Production state ------------------------------------ */
  const [sceneVideos, setSceneVideos]   = useState<SceneVideo[]>([]);
  const [currentGen, setCurrentGen]     = useState(-1);
  const abortRef                        = useRef<AbortController | null>(null);

  /* -- Derived --------------------------------------------- */
  const showProfile    = show ? SHOW_PROFILES[show] : null;
  const characters     = showProfile?.characters || [];
  const filteredShows  = catFilter
    ? SHOW_LIST.filter(s => s.category === catFilter)
    : SHOW_LIST;
  const doneCount      = sceneVideos.filter(s => s.status === 'done').length;
  const errorCount     = sceneVideos.filter(s => s.status === 'error').length;
  const totalScenes    = sceneVideos.length;
  const progressPct    = totalScenes ? Math.round((doneCount / totalScenes) * 100) : 0;

  /* -- Helpers --------------------------------------------- */
  function toggleChar(name: string) {
    setSelectedChars(p =>
      p.includes(name) ? p.filter(n => n !== name) : [...p, name],
    );
  }
  function selectShow(key: string) {
    setShow(key);
    setSelectedChars([]);
  }
  function resetAll() {
    setPhase('setup');
    setScript(null);
    setSceneInputs([]);
    setSceneVideos([]);
    setCurrentGen(-1);
    setError('');
  }

  /* -- Phase 1: Generate Script ---------------------------- */
  const generateScript = useCallback(async () => {
    if (!show || !prompt.trim() || !selectedChars.length) {
      setError('Pick a show, select characters, and describe your episode');
      return;
    }
    setLoading(true);
    setError('');
    setPhase('script');

    try {
      const res = await fetch('/api/create/episode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ show, artStyle, characters: selectedChars, prompt: prompt.trim(), format }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Script generation failed');

      setScript(data.script);
      setSceneInputs(data.sceneInputs);
      setSceneVideos((data.sceneInputs as any[]).map(() => ({ status: 'pending' as const })));
    } catch (err: any) {
      setError(err.message);
      setPhase('setup');
    } finally {
      setLoading(false);
    }
  }, [show, artStyle, selectedChars, prompt, format, setLoading, setError]);

  /* -- Phase 2: Generate All Scenes ------------------------ */
  const generateAllScenes = useCallback(async () => {
    if (!sceneInputs.length) return;
    setPhase('production');
    setLoading(true);
    abortRef.current = new AbortController();

    for (let i = 0; i < sceneInputs.length; i++) {
      if (abortRef.current.signal.aborted) break;
      setCurrentGen(i);

      setSceneVideos(prev => {
        const next = [...prev];
        next[i] = { status: 'generating' };
        return next;
      });

      try {
        const res = await fetch('/api/generate/scene', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sceneInputs[i]),
          signal: abortRef.current.signal,
        });
        const data = await res.json();

        if (!res.ok || !data.videoUrl) {
          setSceneVideos(prev => {
            const next = [...prev];
            next[i] = { status: 'error', error: data.error || 'No video returned' };
            return next;
          });
          continue;
        }

        setSceneVideos(prev => {
          const next = [...prev];
          next[i] = { status: 'done', videoUrl: data.videoUrl, audioSynced: data.audioSynced };
          return next;
        });

        saveAsset({ type: 'video', url: data.videoUrl, prompt: `${script?.title} \u2014 Scene ${i + 1}`, model: data.model });
      } catch (err: any) {
        if (err.name === 'AbortError') break;
        setSceneVideos(prev => {
          const next = [...prev];
          next[i] = { status: 'error', error: err.message };
          return next;
        });
      }
    }

    setCurrentGen(-1);
    setLoading(false);
    setPhase('complete');
  }, [sceneInputs, script, saveAsset, setLoading]);

  /* -- Retry single scene ---------------------------------- */
  const retryScene = useCallback(async (idx: number) => {
    setSceneVideos(prev => {
      const next = [...prev];
      next[idx] = { status: 'generating' };
      return next;
    });
    try {
      const res = await fetch('/api/generate/scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sceneInputs[idx]),
      });
      const data = await res.json();
      setSceneVideos(prev => {
        const next = [...prev];
        next[idx] = res.ok && data.videoUrl
          ? { status: 'done', videoUrl: data.videoUrl, audioSynced: data.audioSynced }
          : { status: 'error', error: data.error || 'Failed' };
        return next;
      });
    } catch (err: any) {
      setSceneVideos(prev => {
        const next = [...prev];
        next[idx] = { status: 'error', error: err.message };
        return next;
      });
    }
  }, [sceneInputs]);

  /* -- Stop ------------------------------------------------ */
  const stopGeneration = () => { abortRef.current?.abort(); setLoading(false); };

  // -----------------------------------------------------------
  // RENDER
  // -----------------------------------------------------------

  return (
    <div className="space-y-6 max-w-4xl">

      {/* -- Header ------------------------------------------ */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl tracking-wider text-white">
            EPISODE<span className="text-violet-400"> GENERATOR</span>
          </h2>
          <p className="text-xs text-muted mt-1">
            Prompt  AI Script  Scene-by-scene video + audio
          </p>
        </div>
        {phase !== 'setup' && (
          <button onClick={resetAll}
            className="text-xs text-muted border border-border rounded-lg px-3 py-1.5 hover:border-violet-400 hover:text-violet-400 transition-colors">
             Start Over
          </button>
        )}
      </div>

      {/* -- Phase indicator --------------------------------- */}
      <div className="flex gap-2 flex-wrap">
        {(['setup', 'script', 'production', 'complete'] as Phase[]).map((p, i) => {
          const idx = ['setup','script','production','complete'].indexOf(phase);
          const done = idx > i;
          const active = phase === p;
          return (
            <div key={p} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                active ? 'bg-violet-500/20 border-violet-400 text-violet-400'
                : done ? 'bg-lime-500/20 border-lime-400 text-lime-400'
                : 'bg-bg3 border-border text-muted'
              }`}>
                {done ? '\u2713' : i + 1}
              </div>
              <span className={`text-[10px] uppercase tracking-wider ${
                active ? 'text-violet-400' : 'text-muted'
              }`}>
                {['Setup','Script','Producing','Done'][i]}
              </span>
              {i < 3 && <div className="w-6 h-px bg-border" />}
            </div>
          );
        })}
      </div>

      {/* --- SETUP PHASE ----------------------------------- */}
      {(phase === 'setup' || (phase === 'script' && !script)) && (
        <>
          {/* Show selector */}
          <div>
            <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-2">Select Show</div>
            <div className="flex gap-1.5 flex-wrap mb-3">
              <button onClick={() => setCatFilter('')}
                className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                  !catFilter ? 'border-violet-400 text-violet-400 bg-violet-400/10' : 'border-border text-muted hover:border-bord2'
                }`}>All</button>
              {SHOW_CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCatFilter(cat)}
                  className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                    catFilter === cat ? 'border-violet-400 text-violet-400 bg-violet-400/10' : 'border-border text-muted hover:border-bord2'
                  }`}>{cat}</button>
              ))}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
              {filteredShows.map(s => (
                <button key={s.key} onClick={() => selectShow(s.key)}
                  className={`text-left p-2 rounded-lg border transition-all ${
                    show === s.key
                      ? 'border-violet-400 bg-violet-400/10 ring-1 ring-violet-400/30'
                      : 'border-border bg-bg2 hover:border-bord2'
                  }`}>
                  <div className="text-lg mb-0.5">{s.emoji || '\u{1F3AC}'}</div>
                  <div className="text-[10px] font-bold text-white truncate">{s.title}</div>
                  <div className="text-[8px] text-muted">{s.category}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Characters */}
          {showProfile && (
            <div>
              <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-2">
                Characters <span className="text-violet-400">({selectedChars.length} selected)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {characters.map(c => (
                  <button key={c.name} onClick={() => toggleChar(c.name)}
                    className={`text-[10px] px-3 py-1.5 rounded-full border transition-colors ${
                      selectedChars.includes(c.name)
                        ? 'border-violet-400 text-violet-400 bg-violet-400/10'
                        : 'border-border text-muted hover:border-bord2'
                    }`}>{c.name}</button>
                ))}
                <button onClick={() => setSelectedChars(characters.map(c => c.name))}
                  className="text-[10px] px-3 py-1.5 rounded-full border border-dashed border-border text-muted hover:border-violet-400 hover:text-violet-400 transition-colors">
                  Select All
                </button>
              </div>
            </div>
          )}

          {/* Art Style + Format */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-2">Art Style</div>
              <div className="flex flex-wrap gap-1.5">
                {ART_STYLES.map(s => (
                  <button key={s.id} onClick={() => setArtStyle(s.id)}
                    className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                      artStyle === s.id
                        ? s.id === 'source-faithful'
                          ? 'border-lime-400 text-lime-400 bg-lime-400/10'
                          : 'border-violet-400 text-violet-400 bg-violet-400/10'
                        : 'border-border text-muted hover:border-bord2'
                    }`}>
                    {s.id === 'source-faithful' ? '\u{1F3AF} ' : ''}{s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-2">Format</div>
              <div className="flex flex-wrap gap-1.5">
                {FORMATS.map(f => (
                  <button key={f.id} onClick={() => setFormat(f.id)}
                    className={`text-[10px] px-2.5 py-1.5 rounded-lg border transition-colors ${
                      format === f.id ? 'border-violet-400 text-violet-400 bg-violet-400/10' : 'border-border text-muted hover:border-bord2'
                    }`}>
                    <span className="mr-1">{f.icon}</span>{f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Prompt */}
          <div>
            <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-2">Episode Idea</div>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={showProfile
                ? `Describe a new ${showProfile.title} episode... what happens?`
                : 'Select a show first, then describe your episode idea...'}
              className="w-full h-28 bg-bg2 border border-border rounded-xl p-3 text-sm text-white placeholder:text-muted/50 resize-none focus:border-violet-400 focus:outline-none transition-colors"
            />
          </div>

          {/* Generate Script button */}
          <button
            onClick={generateScript}
            disabled={loading || !show || !prompt.trim() || !selectedChars.length}
            className="w-full py-3 rounded-xl font-display text-sm tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-500/20"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Writing Script
              </span>
            ) : '\u270D\uFE0F Generate Script'}
          </button>
        </>
      )}

      {/* --- SCRIPT REVIEW PHASE --------------------------= */}
      {script && phase === 'script' && (
        <div className="space-y-4">
          {/* Title card */}
          <div className="bg-bg2 border border-violet-400/30 rounded-xl p-4">
            <h3 className="font-display text-lg text-white tracking-wider">{script.title}</h3>
            <p className="text-xs text-muted mt-1">{script.logline}</p>
            <div className="text-[9px] text-violet-400 mt-2">{script.scenes.length} scenes ready</div>
          </div>

          {/* Scene cards */}
          <div className="space-y-3">
            {script.scenes.map((scene, i) => (
              <div key={i} className="bg-bg2 border border-border rounded-xl p-4 hover:border-bord2 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-[10px] font-bold text-violet-400">
                    {scene.sceneNum}
                  </div>
                  <div className="text-xs font-bold text-white flex-1">{scene.heading}</div>
                  <div className="text-[9px] text-muted">{scene.duration}</div>
                </div>

                <p className="text-[11px] text-muted mb-2">{scene.action}</p>

                {scene.dialogue.length > 0 && (
                  <div className="space-y-1 pl-3 border-l-2 border-violet-400/20">
                    {scene.dialogue.map((d, j) => (
                      <div key={j} className="text-[10px]">
                        <span className="font-bold text-violet-400">{d.character}:</span>{' '}
                        <span className="text-white/80">&ldquo;{d.line}&rdquo;</span>
                        {d.direction && <span className="text-muted italic ml-1">({d.direction})</span>}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 mt-2 text-[8px] text-muted">
                  <span> {scene.mood}</span>
                  <span> {scene.cameraNote}</span>
                  <span> {scene.transition}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button onClick={() => { setScript(null); setPhase('setup'); }}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-muted border border-border hover:border-violet-400 hover:text-violet-400 transition-colors">
               Edit Setup
            </button>
            <button onClick={generateAllScenes}
              className="flex-[2] py-3 rounded-xl font-display text-sm tracking-wider bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-500/20">
               Generate All {totalScenes} Scenes
            </button>
          </div>
        </div>
      )}

      {/* --- PRODUCTION / COMPLETE PHASE ------------------= */}
      {(phase === 'production' || phase === 'complete') && script && (
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="bg-bg2 border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white">
                {phase === 'complete'
                  ? '\u2705 Episode Complete'
                  : `\u23F3 Generating scene ${currentGen + 1} of ${totalScenes}\u2026`}
              </span>
              <span className="text-xs text-violet-400">
                {doneCount}/{totalScenes} done
                {errorCount > 0 && ` \u00B7 ${errorCount} failed`}
              </span>
            </div>
            <div className="h-2 bg-bg3 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Scene result cards */}
          <div className="space-y-3">
            {script.scenes.map((scene, i) => {
              const sv = sceneVideos[i];
              return (
                <div key={i} className={`bg-bg2 border rounded-xl p-4 transition-colors ${
                  sv?.status === 'done'       ? 'border-lime-400/30'
                : sv?.status === 'generating' ? 'border-violet-400/50'
                : sv?.status === 'error'      ? 'border-red-400/30'
                : 'border-border'
                }`}>
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      sv?.status === 'done'       ? 'bg-lime-500/20 text-lime-400'
                    : sv?.status === 'generating' ? 'bg-violet-500/20 text-violet-400'
                    : sv?.status === 'error'      ? 'bg-red-500/20 text-red-400'
                    : 'bg-bg3 text-muted'
                    }`}>
                      {sv?.status === 'done' ? '\u2713' : sv?.status === 'generating' ? '\u25CC' : sv?.status === 'error' ? '\u2717' : scene.sceneNum}
                    </div>
                    <div className="text-xs font-bold text-white flex-1">{scene.heading}</div>
                    {sv?.status === 'done' && sv.audioSynced && (
                      <div className="text-[8px] bg-lime-400/10 text-lime-400 border border-lime-400/30 rounded-full px-2 py-0.5">
                         Audio Synced
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] text-muted">{scene.description}</p>

                  {/* Video player */}
                  {sv?.status === 'done' && sv.videoUrl && (
                    <video src={sv.videoUrl} controls
                      className="w-full rounded-lg border border-border mt-2"
                      style={{ maxHeight: 240 }}
                    />
                  )}

                  {/* Generating skeleton */}
                  {sv?.status === 'generating' && (
                    <div className="h-32 bg-bg3 rounded-lg border border-violet-400/20 flex items-center justify-center mt-2">
                      <div className="flex items-center gap-2 text-xs text-violet-400">
                        <span className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                        Generating video + audio
                      </div>
                    </div>
                  )}

                  {/* Error with retry */}
                  {sv?.status === 'error' && (
                    <div className="flex items-center gap-2 mt-2 p-2 bg-red-500/5 border border-red-400/20 rounded-lg">
                      <span className="text-[10px] text-red-400 flex-1">{sv.error}</span>
                      <button onClick={() => retryScene(i)}
                        className="text-[10px] text-red-400 border border-red-400/30 rounded px-2 py-1 hover:bg-red-400/10 transition-colors">
                        Retry
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            {phase === 'production' && (
              <button onClick={stopGeneration}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-colors">
                 Stop
              </button>
            )}
            {phase === 'complete' && (
              <>
                <button onClick={resetAll}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-muted border border-border hover:border-violet-400 hover:text-violet-400 transition-colors">
                  New Episode
                </button>
                {errorCount > 0 && (
                  <button onClick={() => sceneVideos.forEach((sv, i) => { if (sv.status === 'error') retryScene(i); })}
                    className="flex-1 py-3 rounded-xl text-sm font-bold text-violet-400 border border-violet-400/30 hover:bg-violet-400/10 transition-colors">
                     Retry {errorCount} Failed
                  </button>

                {onPublish && doneCount > 0 && (
                  <button onClick={() => {
                    const firstDone = sceneVideos.find(s => s.status === 'done');
                    const showProfile = show ? SHOW_PROFILES[show] : null;
                    onPublish({
                      title: script?.title,
                      description: script?.logline,
                      thumbnail: firstDone?.videoUrl,
                      mediaUrl: firstDone?.videoUrl,
                      show: showProfile?.title || show,
                      genre: showProfile?.category || 'TV Show',
                    });
                  }}
                    className="flex-[2] py-3 rounded-xl font-display text-sm tracking-wider text-white shadow-lg shadow-rip/20 transition hover:brightness-110"
                    style={{ background: 'linear-gradient(90deg,#ff2d78,#a855f7)' }}>
                     Publish to Feeds
                  </button>
                )}
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* -- Error banner ------------------------------------ */}
      {error && (
        <div className="bg-red-500/5 border border-red-400/20 rounded-xl px-4 py-3 text-xs text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
