'use client';
// components/studio/CharacterController.tsx
// Phase 3A -- Character Pose & Expression Controller
// Generate character poses, expressions, and angles from reference images
import { useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { useStudioStore, genId } from '@/lib/store';
import type { Asset, Character } from '@/lib/store';

// -- Types -------------------------------------------------------
type Expression = 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'thinking' | 'laughing' | 'worried' | 'determined' | 'smirk';
type PosePreset = 'standing' | 'sitting' | 'walking' | 'running' | 'pointing' | 'crossed-arms' | 'hands-on-hips' | 'waving' | 'action' | 'custom';
type CameraAngle = 'front' | 'three-quarter' | 'side' | 'back' | 'close-up' | 'full-body' | 'medium-shot';

interface PoseGeneration {
  id: string;
  expression: Expression;
  pose: PosePreset;
  angle: CameraAngle;
  imageUrl?: string;
  loading: boolean;
}

// -- Data --------------------------------------------------------
const EXPRESSIONS: { id: Expression; emoji: string; label: string }[] = [
  { id: 'neutral',    emoji: '\u{1F610}', label: 'Neutral' },
  { id: 'happy',      emoji: '\u{1F60A}', label: 'Happy' },
  { id: 'sad',        emoji: '\u{1F622}', label: 'Sad' },
  { id: 'angry',      emoji: '\u{1F620}', label: 'Angry' },
  { id: 'surprised',  emoji: '\u{1F62E}', label: 'Surprised' },
  { id: 'thinking',   emoji: '\u{1F914}', label: 'Thinking' },
  { id: 'laughing',   emoji: '\u{1F602}', label: 'Laughing' },
  { id: 'worried',    emoji: '\u{1F61F}', label: 'Worried' },
  { id: 'determined', emoji: '\u{1F624}', label: 'Determined' },
  { id: 'smirk',      emoji: '\u{1F60F}', label: 'Smirk' },
];

const POSES: { id: PosePreset; icon: string; label: string }[] = [
  { id: 'standing',       icon: '\u{1F9CD}', label: 'Standing' },
  { id: 'sitting',        icon: '\u{1FA91}', label: 'Sitting' },
  { id: 'walking',        icon: '\u{1F6B6}', label: 'Walking' },
  { id: 'running',        icon: '\u{1F3C3}', label: 'Running' },
  { id: 'pointing',       icon: '\u{1F449}', label: 'Pointing' },
  { id: 'crossed-arms',   icon: '\u{1F4AA}', label: 'Arms Crossed' },
  { id: 'hands-on-hips',  icon: '\u{1F9B8}', label: 'Hands on Hips' },
  { id: 'waving',         icon: '\u{1F44B}', label: 'Waving' },
  { id: 'action',         icon: '\u2694\uFE0F', label: 'Action Pose' },
  { id: 'custom',         icon: '\u270F\uFE0F', label: 'Custom' },
];

const ANGLES: { id: CameraAngle; icon: string; label: string }[] = [
  { id: 'front',          icon: '\u2B06\uFE0F', label: 'Front' },
  { id: 'three-quarter',  icon: '\u2197\uFE0F', label: '3/4 View' },
  { id: 'side',           icon: '\u27A1\uFE0F', label: 'Side' },
  { id: 'back',           icon: '\u2B07\uFE0F', label: 'Back' },
  { id: 'close-up',       icon: '\u{1F50D}', label: 'Close-up' },
  { id: 'full-body',      icon: '\u{1F4CF}', label: 'Full Body' },
  { id: 'medium-shot',    icon: '\u{1F4D0}', label: 'Medium Shot' },
];

interface Props {
  user: User;
  loading: boolean;
  setLoading: (v: boolean) => void;
  error: string;
  setError: (v: string) => void;
  saveAsset: (asset: Omit<Asset, 'id' | 'createdAt'>) => Asset;
  characters: Character[];
  addCharacter: (c: Character) => void;
}

export function CharacterController({ user, loading, setLoading, error, setError, saveAsset, characters, addCharacter }: Props) {
  const { selectCharacter, selectedCharacterId } = useStudioStore();

  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [expression, setExpression] = useState<Expression>('neutral');
  const [pose, setPose] = useState<PosePreset>('standing');
  const [angle, setAngle] = useState<CameraAngle>('front');
  const [customPoseDesc, setCustomPoseDesc] = useState('');
  const [generations, setGenerations] = useState<PoseGeneration[]>([]);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedExpressions, setSelectedExpressions] = useState<Expression[]>([]);

  const selectedChar = characters.find(c => c.id === selectedCharId);

  // -- Build prompt for pose generation --------------------------
  const buildPosePrompt = useCallback((char: Character, expr: Expression, p: PosePreset, ang: CameraAngle): string => {
    const poseDesc = p === 'custom' ? customPoseDesc : p.replace('-', ' ');
    const angleDesc = ang.replace('-', ' ');
    const exprDesc = expr;

    return `${char.style} style character "${char.name}": ${char.description}. ` +
      `Pose: ${poseDesc}. Expression: ${exprDesc}. Camera angle: ${angleDesc}. ` +
      `Consistent character design, ${char.traits.join(', ')}. ` +
      `Clean background, character sheet style, high quality, detailed.`;
  }, [customPoseDesc]);

  // -- Generate single pose --------------------------------------
  const generatePose = useCallback(async (expr?: Expression) => {
    if (!selectedChar) { setError('Select a character first'); return; }

    const useExpr = expr || expression;
    const prompt = buildPosePrompt(selectedChar, useExpr, pose, angle);

    const genId_ = genId('pose');
    const newGen: PoseGeneration = { id: genId_, expression: useExpr, pose, angle, loading: true };
    setGenerations(prev => [newGen, ...prev]);
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, provider: 'flux', size: '1024x1024' }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Generation failed');
      const data = await res.json();

      setGenerations(prev => prev.map(g =>
        g.id === genId_ ? { ...g, imageUrl: data.url, loading: false } : g
      ));

      saveAsset({
        type: 'sprite',
        name: `${selectedChar.name} \u2014 ${useExpr} ${pose} (${angle})`,
        url: data.url,
        provider: data.provider || 'flux',
        prompt,
      });
    } catch (err: any) {
      setGenerations(prev => prev.map(g =>
        g.id === genId_ ? { ...g, loading: false } : g
      ));
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedChar, expression, pose, angle, buildPosePrompt, setLoading, setError, saveAsset]);

  // -- Batch generate expressions --------------------------------
  const generateBatch = useCallback(async () => {
    if (!selectedChar) { setError('Select a character'); return; }
    if (selectedExpressions.length === 0) { setError('Select at least one expression'); return; }

    for (const expr of selectedExpressions) {
      await generatePose(expr);
    }
  }, [selectedChar, selectedExpressions, generatePose, setError]);

  const toggleBatchExpr = (expr: Expression) => {
    setSelectedExpressions(prev =>
      prev.includes(expr) ? prev.filter(e => e !== expr) : [...prev, expr]
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-white tracking-wide">{'\u{1F3AE}'} CHARACTER <span className="text-rip">CONTROLLER</span></h2>
          <p className="text-muted text-xs mt-1">Control poses, expressions & camera angles {'\u2014'} build a character sheet</p>
        </div>
        <button
          onClick={() => setBatchMode(!batchMode)}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${
            batchMode ? 'bg-rip/20 text-rip border border-rip' : 'bg-bg2 text-muted border border-border'
          }`}
        >
          {batchMode ? '\u2705 Batch Mode' : '\u{1F4CB} Batch Mode'}
        </button>
      </div>

      {/* Character Selection */}
      <div>
        <label className="text-[9px] font-bold text-muted uppercase tracking-widest mb-2 block">Select Character</label>
        {characters.length === 0 ? (
          <div className="bg-bg2 border border-border rounded-xl p-6 text-center">
            <div className="text-3xl mb-2">{'\u{1F3A8}'}</div>
            <div className="text-xs text-muted">No characters yet {'\u2014'} create one in the Character tab first</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {characters.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCharId(c.id)}
                className={`flex items-center gap-3 p-3 rounded-xl transition ${
                  selectedCharId === c.id
                    ? 'bg-rip/10 border-2 border-rip'
                    : 'bg-bg2 border border-border hover:border-bord2'
                }`}
              >
                {c.referenceImage ? (
                  <img src={c.referenceImage} alt="" className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-rip/20 flex items-center justify-center text-xl text-rip font-bold">{c.name[0]}</div>
                )}
                <div className="text-left">
                  <div className="text-sm font-bold text-white">{c.name}</div>
                  <div className="text-[9px] text-muted2">{c.style}</div>
                  <div className="text-[8px] text-muted2 mt-0.5">{c.traits.slice(0, 2).join(' \u00B7 ')}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedChar && (
        <>
          {/* Expression Grid */}
          <div>
            <label className="text-[9px] font-bold text-muted uppercase tracking-widest mb-2 block">
              {batchMode ? 'Select Expressions (batch)' : 'Expression'}
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {EXPRESSIONS.map(e => (
                <button
                  key={e.id}
                  onClick={() => batchMode ? toggleBatchExpr(e.id) : setExpression(e.id)}
                  className={`p-2 rounded-lg text-center transition ${
                    batchMode
                      ? selectedExpressions.includes(e.id)
                        ? 'bg-rip/10 border-2 border-rip'
                        : 'bg-bg2 border border-border hover:border-bord2'
                      : expression === e.id
                        ? 'bg-rip/10 border-2 border-rip'
                        : 'bg-bg2 border border-border hover:border-bord2'
                  }`}
                >
                  <div className="text-xl">{e.emoji}</div>
                  <div className="text-[8px] text-muted mt-0.5">{e.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Pose Selection */}
          <div>
            <label className="text-[9px] font-bold text-muted uppercase tracking-widest mb-2 block">Pose</label>
            <div className="grid grid-cols-5 gap-1.5">
              {POSES.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPose(p.id)}
                  className={`p-2 rounded-lg text-center transition ${
                    pose === p.id
                      ? 'bg-purple-500/10 border-2 border-purple-500'
                      : 'bg-bg2 border border-border hover:border-bord2'
                  }`}
                >
                  <div className="text-lg">{p.icon}</div>
                  <div className="text-[8px] text-muted mt-0.5">{p.label}</div>
                </button>
              ))}
            </div>
            {pose === 'custom' && (
              <input
                type="text"
                value={customPoseDesc}
                onChange={e => setCustomPoseDesc(e.target.value)}
                placeholder="Describe the pose..."
                className="w-full mt-2 px-3 py-2 rounded-lg bg-bg3 border border-border text-white text-xs placeholder-muted2 focus:border-purple-500 focus:outline-none"
              />
            )}
          </div>

          {/* Camera Angle */}
          <div>
            <label className="text-[9px] font-bold text-muted uppercase tracking-widest mb-2 block">Camera Angle</label>
            <div className="flex gap-1.5 flex-wrap">
              {ANGLES.map(a => (
                <button
                  key={a.id}
                  onClick={() => setAngle(a.id)}
                  className={`px-3 py-2 rounded-lg text-center transition ${
                    angle === a.id
                      ? 'bg-cyan-500/10 border border-cyan-500 text-cyan-400'
                      : 'bg-bg2 border border-border text-muted hover:border-bord2'
                  }`}
                >
                  <span className="text-xs mr-1">{a.icon}</span>
                  <span className="text-[10px] font-bold">{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              \u26A0\uFE0F {error}
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={() => batchMode ? generateBatch() : generatePose()}
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #a855f7, #ff2d78)', color: 'white' }}
          >
            {loading
              ? '\u23F3 Generating...'
              : batchMode
                ? `\u{1F3A8} Generate ${selectedExpressions.length} Expression${selectedExpressions.length !== 1 ? 's' : ''}`
                : '\u{1F3A8} Generate Pose'
            }
          </button>

          {/* Generated Poses Grid */}
          {generations.length > 0 && (
            <div>
              <label className="text-[9px] font-bold text-muted uppercase tracking-widest mb-2 block">
                Generated Poses ({generations.length})
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {generations.map(g => (
                  <div key={g.id} className="relative rounded-lg overflow-hidden border border-border bg-bg3 group">
                    {g.loading ? (
                      <div className="aspect-square flex items-center justify-center bg-bg2 animate-pulse">
                        <div className="text-2xl">{'\u23F3'}</div>
                      </div>
                    ) : g.imageUrl ? (
                      <img src={g.imageUrl} alt="" className="w-full aspect-square object-cover" />
                    ) : (
                      <div className="aspect-square flex items-center justify-center bg-bg2">
                        <div className="text-2xl">{'\u274C'}</div>
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                      <div className="text-[8px] text-white font-bold">
                        {EXPRESSIONS.find(e => e.id === g.expression)?.emoji} {g.expression}
                      </div>
                      <div className="text-[7px] text-muted2">{g.pose} {'\u00B7'} {g.angle}</div>
                    </div>
                    {/* Hover actions */}
                    {g.imageUrl && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <button onClick={() => {
                          if (g.imageUrl) {
                            saveAsset({ type: 'image', name: `${selectedChar?.name || 'Character'} Face - ${g.expression}`, url: g.imageUrl });
                          }
                        }} className="px-2 py-1 rounded bg-rip text-[9px] font-bold text-white">Use as Face</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
