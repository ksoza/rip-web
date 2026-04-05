'use client';
// components/studio/LipSyncPanel.tsx
// Phase 3A — Lip Sync Studio: sync audio to character face
// Supports wav2lip, SadTalker, and video-retalking providers
import { useState, useCallback, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { useStudioStore, genId } from '@/lib/store';
import type { Asset, Character } from '@/lib/store';

// ── Types ───────────────────────────────────────────────────────
type LipSyncProvider = 'wav2lip' | 'sadtalker' | 'video-retalking';
type LipSyncStatus = 'idle' | 'uploading' | 'processing' | 'complete' | 'error';

interface LipSyncJob {
  id: string;
  faceUrl: string;
  audioUrl: string;
  provider: LipSyncProvider;
  status: LipSyncStatus;
  outputUrl?: string;
  error?: string;
}

const PROVIDERS: { id: LipSyncProvider; name: string; icon: string; desc: string; quality: string }[] = [
  { id: 'wav2lip',          name: 'Wav2Lip',          icon: '👄', desc: 'Fast, good accuracy',           quality: 'Good' },
  { id: 'sadtalker',        name: 'SadTalker',        icon: '🎭', desc: 'Head movement + expressions',   quality: 'Great' },
  { id: 'video-retalking',  name: 'Video Retalking',  icon: '🎬', desc: 'Best quality, HD output',        quality: 'Best' },
];

// ── Voice providers for TTS ─────────────────────────────────────
const VOICE_STYLES = [
  { id: 'narrator',   label: 'Narrator',     icon: '📖', desc: 'Deep, authoritative' },
  { id: 'character',  label: 'Character',     icon: '🎭', desc: 'Match character voice' },
  { id: 'dramatic',   label: 'Dramatic',      icon: '🎬', desc: 'Intense, emotional' },
  { id: 'casual',     label: 'Casual',        icon: '💬', desc: 'Natural, conversational' },
  { id: 'whisper',    label: 'Whisper',       icon: '🤫', desc: 'Soft, intimate' },
  { id: 'energetic',  label: 'Energetic',     icon: '⚡', desc: 'High energy, excited' },
];

interface Props {
  user: User;
  loading: boolean;
  setLoading: (v: boolean) => void;
  error: string;
  setError: (v: string) => void;
  saveAsset: (asset: Omit<Asset, 'id' | 'createdAt'>) => Asset;
}

export function LipSyncPanel({ user, loading, setLoading, error, setError, saveAsset }: Props) {
  const { characters, assets } = useStudioStore();

  // State
  const [provider, setProvider] = useState<LipSyncProvider>('sadtalker');
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [faceSource, setFaceSource] = useState<'character' | 'upload' | 'asset'>('character');
  const [faceUrl, setFaceUrl] = useState('');
  const [audioSource, setAudioSource] = useState<'tts' | 'upload' | 'asset' | 'record'>('tts');
  const [audioUrl, setAudioUrl] = useState('');
  const [ttsText, setTtsText] = useState('');
  const [ttsVoice, setTtsVoice] = useState('narrator');
  const [job, setJob] = useState<LipSyncJob | null>(null);
  const [history, setHistory] = useState<LipSyncJob[]>([]);

  // Audio recording
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // ── Get face URL from source ──────────────────────────────────
  const selectedChar = characters.find(c => c.id === selectedCharId);
  const effectiveFaceUrl = faceSource === 'character' && selectedChar?.referenceImage
    ? selectedChar.referenceImage
    : faceUrl;

  // ── Audio Recording ───────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (err) {
      setError('Microphone access denied');
    }
  }, [setError]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }, []);

  // ── Generate TTS ──────────────────────────────────────────────
  const generateTTS = useCallback(async () => {
    if (!ttsText.trim()) { setError('Enter dialogue text'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/generate/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: ttsText, voice: ttsVoice, characterId: selectedCharId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'TTS failed');
      const data = await res.json();
      setAudioUrl(data.url);
      saveAsset({ type: 'voice', name: `Voice: ${ttsText.slice(0, 30)}...`, url: data.url, provider: 'elevenlabs', prompt: ttsText });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [ttsText, ttsVoice, selectedCharId, setLoading, setError, saveAsset]);

  // ── Generate Lip Sync ─────────────────────────────────────────
  const generateLipSync = useCallback(async () => {
    if (!effectiveFaceUrl) { setError('Select or upload a face image'); return; }
    if (!audioUrl) { setError('Generate or upload audio first'); return; }

    setLoading(true);
    setError('');
    const newJob: LipSyncJob = {
      id: genId('lipsync'),
      faceUrl: effectiveFaceUrl,
      audioUrl,
      provider,
      status: 'processing',
    };
    setJob(newJob);

    try {
      const res = await fetch('/api/generate/lipsync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faceUrl: effectiveFaceUrl,
          audioUrl,
          provider,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Lip sync failed');
      const data = await res.json();

      const completed: LipSyncJob = { ...newJob, status: 'complete', outputUrl: data.url };
      setJob(completed);
      setHistory(prev => [completed, ...prev]);

      // Save to asset library
      saveAsset({
        type: 'video',
        name: `Lip Sync: ${selectedChar?.name || 'Character'} (${provider})`,
        url: data.url,
        provider,
        prompt: ttsText || 'Audio sync',
      });
    } catch (err: any) {
      setJob({ ...newJob, status: 'error', error: err.message });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [effectiveFaceUrl, audioUrl, provider, selectedChar, ttsText, setLoading, setError, saveAsset]);

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="font-display text-2xl text-white tracking-wide">👄 LIP SYNC <span className="text-rip">STUDIO</span></h2>
        <p className="text-muted text-xs mt-1">Sync dialogue audio to character faces — make them talk</p>
      </div>

      {/* Provider Selection */}
      <div>
        <label className="text-[9px] font-bold text-muted uppercase tracking-widest mb-2 block">Sync Engine</label>
        <div className="grid grid-cols-3 gap-2">
          {PROVIDERS.map(p => (
            <button
              key={p.id}
              onClick={() => setProvider(p.id)}
              className={`p-3 rounded-xl text-left transition-all ${
                provider === p.id
                  ? 'border-2 border-rip bg-rip/5'
                  : 'border border-border bg-bg2 hover:border-bord2'
              }`}
            >
              <div className="text-lg mb-1">{p.icon}</div>
              <div className="text-xs font-bold text-white">{p.name}</div>
              <div className="text-[9px] text-muted2 mt-0.5">{p.desc}</div>
              <div className="text-[8px] text-rip mt-1 font-bold">Quality: {p.quality}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* LEFT: Face Input */}
        <div className="space-y-4">
          <div>
            <label className="text-[9px] font-bold text-muted uppercase tracking-widest mb-2 block">Face Source</label>
            <div className="flex gap-1.5">
              {[
                { id: 'character' as const, label: '🎨 Character', disabled: characters.length === 0 },
                { id: 'asset' as const,     label: '📦 Asset' },
                { id: 'upload' as const,    label: '📤 URL' },
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => !s.disabled && setFaceSource(s.id)}
                  disabled={s.disabled}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${
                    faceSource === s.id
                      ? 'bg-rip/20 text-rip border border-rip'
                      : 'bg-bg2 text-muted border border-border hover:border-bord2'
                  } ${s.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {faceSource === 'character' && (
            <div className="space-y-2">
              <label className="text-[9px] text-muted2 block">Select character from library</label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {characters.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCharId(c.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg transition ${
                      selectedCharId === c.id
                        ? 'bg-rip/10 border border-rip'
                        : 'bg-bg3 border border-border hover:border-bord2'
                    }`}
                  >
                    {c.referenceImage ? (
                      <img src={c.referenceImage} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-rip/20 flex items-center justify-center text-xs text-rip font-bold">{c.name[0]}</div>
                    )}
                    <div className="text-left">
                      <div className="text-xs text-white font-bold">{c.name}</div>
                      <div className="text-[9px] text-muted2">{c.style}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {faceSource === 'asset' && (
            <div className="space-y-2">
              <label className="text-[9px] text-muted2 block">Select from asset library</label>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {assets.filter(a => a.type === 'image' || a.type === 'sprite' || a.type === 'video').map(a => (
                  <button
                    key={a.id}
                    onClick={() => setFaceUrl(a.url || '')}
                    className={`p-1 rounded-lg transition border ${
                      faceUrl === a.url ? 'border-rip' : 'border-border hover:border-bord2'
                    }`}
                  >
                    {a.url && <img src={a.url} alt="" className="w-full aspect-square rounded object-cover" />}
                    <div className="text-[8px] text-muted2 truncate mt-1">{a.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {faceSource === 'upload' && (
            <input
              type="text"
              value={faceUrl}
              onChange={e => setFaceUrl(e.target.value)}
              placeholder="Paste face image or video URL..."
              className="w-full px-3 py-2 rounded-lg bg-bg3 border border-border text-white text-xs placeholder-muted2 focus:border-rip focus:outline-none"
            />
          )}

          {/* Face Preview */}
          {effectiveFaceUrl && (
            <div className="relative rounded-xl overflow-hidden border border-border bg-bg3">
              <img src={effectiveFaceUrl} alt="Face" className="w-full aspect-video object-cover" />
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-[9px] text-white font-bold">
                Face Input
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Audio Input */}
        <div className="space-y-4">
          <div>
            <label className="text-[9px] font-bold text-muted uppercase tracking-widest mb-2 block">Audio Source</label>
            <div className="flex gap-1.5">
              {[
                { id: 'tts' as const,    label: '🗣️ Text-to-Speech' },
                { id: 'record' as const, label: '🎙️ Record' },
                { id: 'asset' as const,  label: '📦 Asset' },
                { id: 'upload' as const, label: '📤 URL' },
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setAudioSource(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${
                    audioSource === s.id
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500'
                      : 'bg-bg2 text-muted border border-border hover:border-bord2'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {audioSource === 'tts' && (
            <div className="space-y-3">
              {/* Voice style */}
              <div className="grid grid-cols-3 gap-1.5">
                {VOICE_STYLES.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setTtsVoice(v.id)}
                    className={`p-2 rounded-lg text-center transition ${
                      ttsVoice === v.id
                        ? 'bg-cyan-500/10 border border-cyan-500 text-cyan-400'
                        : 'bg-bg3 border border-border text-muted hover:border-bord2'
                    }`}
                  >
                    <div className="text-sm">{v.icon}</div>
                    <div className="text-[9px] font-bold mt-0.5">{v.label}</div>
                  </button>
                ))}
              </div>

              {/* Text input */}
              <textarea
                value={ttsText}
                onChange={e => setTtsText(e.target.value)}
                placeholder="Type the dialogue for your character..."
                rows={4}
                className="w-full px-3 py-2 rounded-lg bg-bg3 border border-border text-white text-xs placeholder-muted2 focus:border-cyan-500 focus:outline-none resize-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-muted2">{ttsText.length}/500 chars</span>
                <button
                  onClick={generateTTS}
                  disabled={loading || !ttsText.trim()}
                  className="px-4 py-2 rounded-lg bg-cyan-500 text-black text-xs font-bold hover:bg-cyan-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? '⏳ Generating...' : '🗣️ Generate Voice'}
                </button>
              </div>
            </div>
          )}

          {audioSource === 'record' && (
            <div className="text-center py-8">
              <button
                onClick={recording ? stopRecording : startRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all ${
                  recording
                    ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/30'
                    : 'bg-bg3 border-2 border-rip hover:bg-rip/10'
                }`}
              >
                {recording ? '⏹️' : '🎙️'}
              </button>
              <p className="text-[10px] text-muted mt-3">{recording ? 'Recording... Click to stop' : 'Click to start recording'}</p>
              {audioUrl && !recording && (
                <div className="mt-3">
                  <audio controls src={audioUrl} className="w-full h-8" />
                </div>
              )}
            </div>
          )}

          {audioSource === 'asset' && (
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
              {assets.filter(a => ['audio', 'voice', 'voiceover', 'music'].includes(a.type)).map(a => (
                <button
                  key={a.id}
                  onClick={() => setAudioUrl(a.url || '')}
                  className={`flex items-center gap-2 p-2 rounded-lg transition border ${
                    audioUrl === a.url ? 'border-cyan-500 bg-cyan-500/5' : 'border-border bg-bg3 hover:border-bord2'
                  }`}
                >
                  <div className="w-8 h-8 rounded bg-bg flex items-center justify-center text-xs">🗣️</div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="text-xs text-white truncate">{a.name}</div>
                    <div className="text-[9px] text-muted2">{a.provider}</div>
                  </div>
                </button>
              ))}
              {assets.filter(a => ['audio', 'voice', 'voiceover'].includes(a.type)).length === 0 && (
                <div className="text-center py-4 text-muted2 text-xs">No audio assets yet — generate some in the Audio tab</div>
              )}
            </div>
          )}

          {audioSource === 'upload' && (
            <input
              type="text"
              value={audioUrl}
              onChange={e => setAudioUrl(e.target.value)}
              placeholder="Paste audio file URL..."
              className="w-full px-3 py-2 rounded-lg bg-bg3 border border-border text-white text-xs placeholder-muted2 focus:border-cyan-500 focus:outline-none"
            />
          )}

          {/* Audio preview */}
          {audioUrl && audioSource !== 'record' && (
            <div className="bg-bg3 border border-border rounded-lg p-3">
              <audio controls src={audioUrl} className="w-full h-8" />
              <div className="text-[9px] text-muted2 mt-1">Audio ready for sync</div>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          ⚠️ {error}
        </div>
      )}

      {/* Generate Button */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={generateLipSync}
          disabled={loading || !effectiveFaceUrl || !audioUrl}
          className="flex-1 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, #ff2d78, #a855f7)',
            color: 'white',
          }}
        >
          {loading ? '⏳ Syncing...' : '👄 Generate Lip Sync'}
        </button>
        {job?.status === 'processing' && (
          <div className="text-xs text-muted animate-pulse">Processing (~30-60s)...</div>
        )}
      </div>

      {/* Result Preview */}
      {job?.status === 'complete' && job.outputUrl && (
        <div className="bg-bg2 border border-rip/30 rounded-xl p-4">
          <div className="text-[9px] font-bold text-rip uppercase tracking-widest mb-3">✅ Lip Sync Complete</div>
          <video controls src={job.outputUrl} className="w-full rounded-lg max-h-80 bg-black" />
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                saveAsset({
                  type: 'video',
                  name: `Lip Sync Result (${provider})`,
                  url: job.outputUrl!,
                  provider,
                });
              }}
              className="px-4 py-2 rounded-lg bg-rip/10 border border-rip text-rip text-xs font-bold hover:bg-rip/20"
            >
              📦 Add to Timeline
            </button>
            <a href={job.outputUrl} download className="px-4 py-2 rounded-lg bg-bg3 border border-border text-white text-xs font-bold hover:border-bord2">
              ⬇️ Download
            </a>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <label className="text-[9px] font-bold text-muted uppercase tracking-widest mb-2 block">Recent Syncs</label>
          <div className="space-y-2">
            {history.slice(0, 5).map(h => (
              <div key={h.id} className="flex items-center gap-3 p-2 bg-bg2 border border-border rounded-lg">
                <div className="text-xs">{h.status === 'complete' ? '✅' : '❌'}</div>
                <div className="flex-1">
                  <div className="text-xs text-white">{h.provider}</div>
                  <div className="text-[9px] text-muted2">{h.status}</div>
                </div>
                {h.outputUrl && (
                  <button
                    onClick={() => setJob(h)}
                    className="text-[9px] text-rip font-bold hover:underline"
                  >
                    Preview
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
