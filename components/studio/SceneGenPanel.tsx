'use client';
// components/studio/SceneGenPanel.tsx
// Unified Scene Generation - video + audio generated together
// Uses the /api/generate/scene endpoint (Veo 3.1 primary, Seedance 2 fallback)
import { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Asset } from '@/lib/store';

// -- Types -------------------------------------------------------
interface ShowInfo {
  id: string;
  title: string;
  category: string;
  characters: { id: string; name: string; role: string; emoji: string }[];
}

interface ArtStyleInfo {
  id: string;
  label: string;
  emoji: string;
  description: string;
}

interface ModelInfo {
  key: string;
  name: string;
  description: string;
  tier: string;
  audioCapable: boolean;
}

interface DialogueLine {
  id: string;
  character: string;
  line: string;
}

interface SceneGenResult {
  success: boolean;
  videoUrl?: string;
  audioUrl?: string;
  model: string;
  audioSynced: boolean;
  prompt: string;
  requestId?: string;
  error?: string;
}

// -- Helpers -----------------------------------------------------
let _lineId = 0;
function newLineId() { return `dl_${Date.now().toString(36)}_${(++_lineId).toString(36)}`; }

// -- Component ---------------------------------------------------
type Props = {
  user: User;
  loading: boolean;
  setLoading: (v: boolean) => void;
  error: string;
  setError: (v: string) => void;
  saveAsset: (asset: Omit<Asset, 'id' | 'createdAt'>) => Asset;
  onPublish?: (data: any) => void;
};

export function SceneGenPanel({ user, loading, setLoading, error, setError, saveAsset }: Props) {
  // -- Config fetched from API ---------------------------------
  const [shows, setShows] = useState<ShowInfo[]>([]);
  const [artStyles, setArtStyles] = useState<ArtStyleInfo[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [configLoaded, setConfigLoaded] = useState(false);

  // -- User selections -----------------------------------------
  const [selectedShow, setSelectedShow] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('source-faithful');
  const [selectedModel, setSelectedModel] = useState('veo');
  const [sceneDesc, setSceneDesc] = useState('');
  const [dialogue, setDialogue] = useState<DialogueLine[]>([]);
  const [selectedChars, setSelectedChars] = useState<string[]>([]);
  const [aspectRatio, setAspectRatio] = useState('16:9');

  // -- Result --------------------------------------------------
  const [result, setResult] = useState<SceneGenResult | null>(null);
  const [generating, setGenerating] = useState(false);

  // -- Fetch config on mount -----------------------------------
  useEffect(() => {
    fetch('/api/generate/scene')
      .then(r => r.json())
      .then(data => {
        setShows(data.shows || []);
        setArtStyles(data.artStyles || []);
        setModels(data.models || []);
        if (data.shows?.length) setSelectedShow(data.shows[0].title);
        setConfigLoaded(true);
      })
      .catch(() => setError('Failed to load scene config'));
  }, [setError]);

  // -- Current show data ---------------------------------------
  const currentShow = shows.find(s => s.title === selectedShow);

  // -- When show changes, reset characters and dialogue --------
  useEffect(() => {
    setSelectedChars([]);
    setDialogue([]);
  }, [selectedShow]);

  // -- Toggle character selection ------------------------------
  const toggleChar = useCallback((name: string) => {
    setSelectedChars(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  }, []);

  // -- Dialogue management -------------------------------------
  const addLine = useCallback(() => {
    const char = selectedChars[0] || currentShow?.characters[0]?.name || '';
    setDialogue(prev => [...prev, { id: newLineId(), character: char, line: '' }]);
  }, [selectedChars, currentShow]);

  const updateLine = useCallback((id: string, field: 'character' | 'line', value: string) => {
    setDialogue(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  }, []);

  const removeLine = useCallback((id: string) => {
    setDialogue(prev => prev.filter(d => d.id !== id));
  }, []);

  // -- Generate scene ------------------------------------------
  async function handleGenerate() {
    if (!selectedShow) { setError('Select a show'); return; }
    if (!sceneDesc.trim() && dialogue.length === 0) {
      setError('Add a scene description or at least one dialogue line');
      return;
    }

    setGenerating(true);
    setLoading(true);
    setResult(null);
    setError('');

    try {
      const res = await fetch('/api/generate/scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          show: selectedShow,
          artStyle: selectedStyle,
          sceneDescription: sceneDesc,
          dialogue: dialogue.filter(d => d.line.trim()).map(d => ({
            character: d.character,
            line: d.line,
          })),
          characters: selectedChars,
          model: selectedModel,
          aspectRatio,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Scene generation failed');
        return;
      }

      setResult(data);

      // Save to asset library
      const showLabel = currentShow?.title || selectedShow;
      saveAsset({
        type: 'video' as const,
        name: `${showLabel} \u2014 ${sceneDesc.slice(0, 30) || 'Scene'}`,
        url: data.videoUrl,
        provider: data.model,
        prompt: data.prompt?.slice(0, 200),
      });
    } catch {
      setError('Network error \u2014 check your connection');
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  }

  // -- Skeleton while config loads -----------------------------
  if (!configLoaded) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="bg-bg2 border border-border rounded-xl h-32" />
        <div className="bg-bg2 border border-border rounded-xl h-48" />
        <div className="bg-bg2 border border-border rounded-xl h-20" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* -- Header Banner ------------------------------------ */}
      <div className="bg-gradient-to-r from-[#1a0a2e] to-[#0a1628] border border-[#2d1b69] rounded-xl p-4">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl"></span>
          <div>
            <h2 className="text-white font-display text-lg tracking-wider">SCENE GENERATOR</h2>
            <p className="text-[10px] text-muted2">Video + audio generated together in one pass - characters speak in sync</p>
          </div>
        </div>
      </div>

      {/* -- Show Selector ------------------------------------ */}
      <div className="bg-bg2 border border-border rounded-xl p-4">
        <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Select Show</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {shows.map(s => (
            <button key={s.id} onClick={() => setSelectedShow(s.title)}
              className={`py-3 px-2 rounded-lg text-center transition-all ${
                selectedShow === s.title
                  ? 'border-2 border-rip bg-rip/5'
                  : 'border border-border bg-bg3 hover:border-bord2'
              }`}>
              <div className={`text-[11px] font-bold truncate ${selectedShow === s.title ? 'text-rip' : 'text-muted'}`}>
                {s.title}
              </div>
              <div className="text-[8px] text-muted2 mt-0.5">{s.category}  {s.characters.length} chars</div>
            </button>
          ))}
        </div>
      </div>

      {/* -- Art Style ---------------------------------------- */}
      <div className="bg-bg2 border border-border rounded-xl p-4">
        <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Art Style</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {artStyles.map(s => (
            <button key={s.id} onClick={() => setSelectedStyle(s.id)}
              className={`py-2.5 px-3 rounded-lg text-left transition-all ${
                selectedStyle === s.id
                  ? s.id === 'source-faithful'
                    ? 'border-2 border-green-400 bg-green-400/5'
                    : 'border-2 border-purple-400 bg-purple-400/5'
                  : 'border border-border bg-bg3 hover:border-bord2'
              }`}>
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{s.emoji}</span>
                <div className={`text-[10px] font-bold ${
                  selectedStyle === s.id
                    ? s.id === 'source-faithful' ? 'text-green-400' : 'text-purple-400'
                    : 'text-muted'
                }`}>
                  {s.label}
                </div>
              </div>
              <div className="text-[8px] text-muted2 mt-0.5 leading-tight">{s.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* -- Characters --------------------------------------- */}
      {currentShow && currentShow.characters.length > 0 && (
        <div className="bg-bg2 border border-border rounded-xl p-4">
          <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Characters in Scene</div>
          <div className="flex flex-wrap gap-2">
            {currentShow.characters.map(c => (
              <button key={c.id} onClick={() => toggleChar(c.name)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  selectedChars.includes(c.name)
                    ? 'border-2 border-cyan bg-cyan/5'
                    : 'border border-border bg-bg3 hover:border-bord2'
                }`}>
                <span className="text-sm">{c.emoji}</span>
                <div>
                  <div className={`text-[10px] font-bold ${selectedChars.includes(c.name) ? 'text-cyan' : 'text-muted'}`}>
                    {c.name}
                  </div>
                  <div className="text-[8px] text-muted2">{c.role}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* -- Scene Description -------------------------------- */}
      <div className="bg-bg2 border border-border rounded-xl p-4">
        <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Scene Description</div>
        <textarea value={sceneDesc} onChange={e => setSceneDesc(e.target.value)} rows={3}
          placeholder="Describe the scene: setting, action, mood, camera angle..."
          className="w-full bg-bg3 border border-border rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-bord2 placeholder:text-muted2 resize-none leading-relaxed" />
      </div>

      {/* -- Dialogue ----------------------------------------- */}
      <div className="bg-bg2 border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[9px] font-bold text-muted uppercase tracking-widest">Dialogue</div>
          <button onClick={addLine}
            className="text-[10px] font-bold text-cyan hover:text-white transition-colors px-2 py-1 rounded bg-cyan/10 hover:bg-cyan/20">
            + Add Line
          </button>
        </div>

        {dialogue.length === 0 ? (
          <div className="text-center py-6 text-muted2 text-xs">
            Add dialogue lines - characters will speak them in the generated video
          </div>
        ) : (
          <div className="space-y-2">
            {dialogue.map((d, i) => (
              <div key={d.id} className="flex items-start gap-2 bg-bg3 rounded-lg p-3">
                <div className="shrink-0 w-28">
                  <select value={d.character} onChange={e => updateLine(d.id, 'character', e.target.value)}
                    className="w-full bg-bg border border-border rounded px-2 py-1.5 text-[10px] text-white outline-none">
                    {currentShow?.characters.map(c => (
                      <option key={c.id} value={c.name}>{c.emoji} {c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <input value={d.line} onChange={e => updateLine(d.id, 'line', e.target.value)}
                    placeholder={`What does ${d.character} say?`}
                    className="w-full bg-bg border border-border rounded px-3 py-1.5 text-sm text-white outline-none focus:border-bord2 placeholder:text-muted2" />
                </div>
                <button onClick={() => removeLine(d.id)}
                  className="shrink-0 w-7 h-7 rounded flex items-center justify-center text-muted2 hover:text-red-400 hover:bg-red-400/10 transition-colors text-xs">
                  
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* -- Settings Row ------------------------------------- */}
      <div className="grid grid-cols-2 gap-4">
        {/* Aspect Ratio */}
        <div className="bg-bg2 border border-border rounded-xl p-4">
          <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">Aspect Ratio</div>
          <div className="flex gap-2">
            {['16:9', '9:16', '1:1'].map(r => (
              <button key={r} onClick={() => setAspectRatio(r)}
                className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${
                  aspectRatio === r
                    ? 'border-2 border-gold text-gold bg-gold/5'
                    : 'border border-border text-muted bg-bg3'
                }`}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Model */}
        <div className="bg-bg2 border border-border rounded-xl p-4">
          <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-3">AI Model</div>
          <div className="flex gap-2">
            {models.map(m => (
              <button key={m.key} onClick={() => setSelectedModel(m.key)}
                className={`flex-1 py-2 rounded-lg text-center transition-all ${
                  selectedModel === m.key
                    ? 'border-2 border-gold text-gold bg-gold/5'
                    : 'border border-border text-muted bg-bg3'
                }`}>
                <div className={`text-[10px] font-bold ${selectedModel === m.key ? 'text-gold' : 'text-muted'}`}>{m.name}</div>
                <div className="text-[8px] text-muted2">{m.tier}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* -- Error -------------------------------------------- */}
      {error && (
        <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">{error}</p>
      )}

      {/* -- Generate Button ---------------------------------- */}
      <button onClick={handleGenerate} disabled={generating || (!sceneDesc.trim() && dialogue.length === 0)}
        className="w-full py-4 rounded-xl font-display text-xl tracking-widest text-white disabled:opacity-40 transition-all hover:brightness-110"
        style={{ background: 'linear-gradient(90deg, #a855f7, #00d4ff)' }}>
        {generating
          ? '\u23F3  GENERATING SCENE... (video + audio together, ~1-3 min)'
          : '\u{1F3AC}  GENERATE SCENE'}
      </button>

      {/* -- Result ------------------------------------------- */}
      {result?.success && result.videoUrl && (
        <div className="bg-bg3 border border-bord2 rounded-xl overflow-hidden animate-slide-up">
          <video src={result.videoUrl} controls autoPlay className="w-full" />
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-purple-400/20 text-purple-400 uppercase">Scene</span>
              {result.audioSynced && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-green-400/20 text-green-400 uppercase"> Audio Synced</span>
              )}
              <span className="text-[10px] text-muted">via {result.model === 'veo' ? 'Veo 3.1' : result.model === 'seedance-2' ? 'Seedance 2' : result.model}</span>
            </div>
            <div className="flex gap-2">
              <a href={result.videoUrl} download target="_blank" rel="noopener noreferrer"
                className="flex-1 py-2 rounded-lg text-xs font-bold text-center text-cyan bg-cyan/10 border border-cyan/20 hover:bg-cyan/20 transition-all">
                 Download
              </a>
              <button
                className="flex-1 py-2 rounded-lg text-xs font-bold text-gold bg-gold/10 border border-gold/20 hover:bg-gold/20 transition-all">
                 Add to Timeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
