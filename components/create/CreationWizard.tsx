'use client';
// components/create/CreationWizard.tsx
// Wireframe-aligned pipeline (engine step CUT -- free options auto-selected):
//   Config -> Script -> Storyboard -> Images -> Video -> Result
// Characters auto-detected from prompt + show profile. Optional "Personal Character" field.
import { useState, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { SHOW_PROFILES, ART_STYLES, resolveArtStylePrompt } from '@/lib/shows';
import type { ArtStyleId } from '@/lib/shows';

// ===================================================================
//  TYPES
// ===================================================================

export interface MediaItem {
  id: string;
  title: string;
  category: 'TV Show' | 'Movie' | 'Custom';
  year: string;
  genre: string;
  emoji: string;
  gradient: string;
}

interface ScriptDialogue {
  character: string;
  line: string;
  direction?: string;
}

interface ScriptScene {
  sceneNum: number;
  heading: string;
  description: string;
  action: string;
  dialogue: ScriptDialogue[];
  duration: string;
  mood: string;
  cameraNote: string;
}

interface StoryboardScene {
  id: string;
  sceneNum: number;
  description: string;
  duration: string;
  visual: string;
  emoji: string;
}

type WizardStep =
  | 'config'          // Step 1: Prompt + Personal Character + Tone + Art Style + Format
  | 'script'          // Step 2: Generate & review script
  | 'storyboard'      // Step 3: Approve storyboard
  | 'generating'      // Step 4a: Image generation (progress)
  | 'review-images'   // Step 4b: Review generated images
  | 'review-videos'   // Step 5: Generate & review videos
  | 'result';         // Step 6: Publish or Edit in RIP Studio

interface Props {
  user: User;
  selectedMedia: MediaItem;
  onClose: () => void;
  onOpenEditor: (resultData: ResultData) => void;
  onPublish?: (data: { title?: string; description?: string; thumbnail?: string; mediaUrl?: string; show?: string; genre?: string }) => void;
}

interface ResultData {
  title: string;
  media: MediaItem;
  prompt: string;
  personalCharacter: string;
  tone: string;
  format: string;
  scenes: StoryboardScene[];
  scriptScenes?: ScriptScene[];
  videoUrl?: string;
  thumbnailUrl?: string;
}

// -- Tone & Format Presets ----------------------------------------
const TONES = [
  { id: 'dramatic',   label: 'Dramatic',     emoji: '\u{1F3AD}' },
  { id: 'comedic',    label: 'Comedic',      emoji: '\u{1F602}' },
  { id: 'horror',     label: 'Horror',       emoji: '\u{1F47B}' },
  { id: 'action',     label: 'Action',       emoji: '\u{1F4A5}' },
  { id: 'romantic',   label: 'Romantic',     emoji: '\u2764\uFE0F' },
  { id: 'mystery',    label: 'Mystery',      emoji: '\u{1F50D}' },
  { id: 'scifi',      label: 'Sci-Fi',       emoji: '\u{1F680}' },
  { id: 'wholesome',  label: 'Wholesome',    emoji: '\u{1F970}' },
  { id: 'dark',       label: 'Dark / Gritty', emoji: '\u{1F311}' },
  { id: 'absurd',     label: 'Absurdist',    emoji: '\u{1F92A}' },
];

const FORMATS = [
  { id: 'short',     label: 'Short (15-60s)',  desc: 'TikTok / Reels / Shorts', emoji: '\u{1F4F1}' },
  { id: 'scene',     label: 'Scene (1-3 min)', desc: 'Key moment / clip', emoji: '\u{1F3AC}' },
  { id: 'episode',   label: 'Episode (5-15 min)', desc: 'Full fan episode', emoji: '\u{1F4FA}' },
  { id: 'music_vid', label: 'Music Video',     desc: 'Soundtrack + visuals', emoji: '\u{1F3B5}' },
  { id: 'trailer',   label: 'Trailer',         desc: 'Hype / teaser', emoji: '\u{1F39E}\uFE0F' },
];

// -- Aspect Ratios ------------------------------------------------
const ASPECT_RATIOS = [
  { id: '16:9',  label: '16:9',  desc: 'YouTube / Widescreen',    emoji: '\u{1F5A5}\uFE0F', width: 1024, height: 576 },
  { id: '9:16',  label: '9:16',  desc: 'TikTok / Reels / Shorts', emoji: '\u{1F4F1}', width: 576, height: 1024 },
  { id: '1:1',   label: '1:1',   desc: 'Instagram / Twitter',     emoji: '\u2B1B', width: 1024, height: 1024 },
  { id: '4:3',   label: '4:3',   desc: 'Classic TV',              emoji: '\u{1F4FA}', width: 1024, height: 768 },
  { id: '21:9',  label: '21:9',  desc: 'Ultra-Wide / Cinema',     emoji: '\u{1F39E}\uFE0F', width: 1024, height: 440 },
];

// -- Auto-selected FREE engines (no engine step) ------------------
const AUTO_IMAGE_MODEL = 'pollinations';  // $0, no key needed
const AUTO_VIDEO_MODEL = 'self-hosted';   // $0, Colab/Kaggle Wan 2.1

// -- Social share platforms ----------------------------------------
const SOCIAL_PLATFORMS = [
  { id: 'x',         name: 'X (Twitter)', icon: '\u{1D54F}',     color: '#000' },
  { id: 'facebook',  name: 'Facebook',    icon: 'f',             color: '#1877F2' },
  { id: 'instagram', name: 'Instagram',   icon: '\u{1F4F7}',     color: '#E4405F' },
  { id: 'threads',   name: 'Threads',     icon: '\u{1F9F5}',     color: '#000' },
  { id: 'tiktok',    name: 'TikTok',      icon: '\u{1F3B5}',     color: '#000' },
  { id: 'youtube',   name: 'YouTube',     icon: '\u25B6\uFE0F',  color: '#FF0000' },
  { id: 'reddit',    name: 'Reddit',      icon: '\u{1F916}',     color: '#FF5700' },
];

// ===================================================================
//  MAIN WIZARD COMPONENT
// ===================================================================

export function CreationWizard({ user, selectedMedia, onClose, onOpenEditor, onPublish }: Props) {
  const [step, setStep] = useState<WizardStep>('config');

  // -- Config state (Step 1) --
  const [prompt, setPrompt]                       = useState('');
  const [personalCharacter, setPersonalCharacter] = useState('');
  const [characterImage, setCharacterImage]       = useState<string | null>(null);
  const [characterImageFile, setCharacterImageFile] = useState<File | null>(null);
  const [dragOver, setDragOver]                   = useState(false);
  const characterImageRef                         = useRef<HTMLInputElement>(null);
  const [musicFile, setMusicFile]                 = useState<File | null>(null);
  const [musicUrl, setMusicUrl]                   = useState<string | null>(null);
  const [musicDragOver, setMusicDragOver]         = useState(false);
  const musicInputRef                             = useRef<HTMLInputElement>(null);
  const [tone, setTone]                           = useState('dramatic');
  const [format, setFormat]                       = useState('short');
  const [artStyle, setArtStyle]                   = useState<ArtStyleId>('source-faithful');
  const [aspectRatio, setAspectRatio]             = useState('16:9');
  const [crossover, setCrossover]                 = useState('');
  const [negativePrompt, setNegativePrompt]       = useState('blurry, low quality, distorted, watermark, text, ugly, deformed');
  const [showAdvanced, setShowAdvanced]           = useState(false);

  // -- Script state (Step 2) --
  const [scriptScenes, setScriptScenes] = useState<ScriptScene[]>([]);
  const [scriptTitle, setScriptTitle]   = useState('');
  const [scriptLogline, setScriptLogline] = useState('');
  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptError, setScriptError]     = useState('');
  const [editingScript, setEditingScript] = useState<number | null>(null);
  const [scriptEditText, setScriptEditText] = useState('');

  // -- Storyboard state (Step 3) --
  const [scenes, setScenes]             = useState<StoryboardScene[]>([]);
  const [editingScene, setEditingScene] = useState<string | null>(null);
  const [sceneEditText, setSceneEditText] = useState('');
  const [storyboardLoading, setStoryboardLoading] = useState(false);
  const [storyboardError, setStoryboardError] = useState('');

  // -- Image generation (Step 4) --
  const [sceneImages, setSceneImages]       = useState<Record<string, string>>({});
  const [sceneImageUrls, setSceneImageUrls] = useState<Record<string, string>>({});
  const [genProgress, setGenProgress]       = useState(0);
  const [genStage, setGenStage]             = useState('');
  const [genError, setGenError]             = useState('');
  const [genElapsed, setGenElapsed]         = useState(0);
  const [regeneratingScene, setRegeneratingScene] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // -- Video generation (Step 5) --
  const [sceneVideos, setSceneVideos]         = useState<Record<string, string>>({});
  const [videoGenerating, setVideoGenerating] = useState(false);
  const [videoProgress, setVideoProgress]     = useState(0);
  const [videoStage, setVideoStage]           = useState('');
  const [videoError, setVideoError]           = useState('');

  // -- Result state (Step 6) --
  const [resultData, setResultData]     = useState<ResultData | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareToast, setShareToast]     = useState('');

  // -- Derived --
  const showProfile = SHOW_PROFILES[selectedMedia.title];
  const displayTitle = selectedMedia.category === 'Custom' ? 'Your Original IP' : selectedMedia.title;
  const resolvedStylePrompt = resolveArtStylePrompt(artStyle, selectedMedia.category);

  // -- Character image upload handler --
  function handleCharacterImage(file: File | null) {
    if (!file) { setCharacterImage(null); setCharacterImageFile(null); return; }
    if (!file.type.startsWith('image/')) return;
    setCharacterImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setCharacterImage(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  // -- Music file upload handler --
  function handleMusicFile(file: File | null) {
    if (!file) { setMusicFile(null); setMusicUrl(null); return; }
    const audioTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/flac', 'audio/aac'];
    if (!audioTypes.some(t => file.type.startsWith(t.split('/')[0])) && !file.name.match(/\.(mp3|wav|m4a|ogg|flac|aac|wma)$/i)) {
      alert('Please upload an audio file (mp3, wav, m4a, ogg, flac, aac)');
      return;
    }
    setMusicFile(file);
    setMusicUrl(URL.createObjectURL(file));
  }

  // Step order for progress indicator
  const STEP_ORDER: WizardStep[] = ['config', 'script', 'storyboard', 'generating', 'review-images', 'review-videos', 'result'];
  const STEP_LABELS: Record<string, string> = {
    config: 'Config', script: 'Script', storyboard: 'Storyboard',
    'review-images': 'Images', 'review-videos': 'Video', result: 'Result',
  };
  const VISIBLE_STEPS = STEP_ORDER.filter(s => s !== 'generating');
  const stepIndex = STEP_ORDER.indexOf(step);

  // ===================================================================
  //  PARALLEL BATCH RUNNER
  // ===================================================================
  async function runParallelBatches<T, R>(
    items: T[],
    task: (item: T, index: number) => Promise<R>,
    opts: { concurrency?: number; onProgress?: (completed: number, total: number, result: R | null, index: number, error?: string) => void } = {}
  ): Promise<(R | null)[]> {
    const { concurrency = 3, onProgress } = opts;
    const results: (R | null)[] = new Array(items.length).fill(null);
    let completed = 0;
    for (let batchStart = 0; batchStart < items.length; batchStart += concurrency) {
      const batch = items.slice(batchStart, batchStart + concurrency);
      const promises = batch.map(async (item, bi) => {
        const gi = batchStart + bi;
        try {
          const r = await task(item, gi);
          results[gi] = r;
          completed++;
          onProgress?.(completed, items.length, r, gi);
          return r;
        } catch (err: unknown) {
          completed++;
          const msg = err instanceof Error ? err.message : String(err);
          onProgress?.(completed, items.length, null, gi, msg);
          return null;
        }
      });
      await Promise.allSettled(promises);
    }
    return results;
  }

  // ===================================================================
  //  GENERATE SCRIPT (Step 2)
  // ===================================================================
  async function generateScript() {
    setScriptLoading(true);
    setScriptError('');
    const MAX_RETRIES = 2;
    const TIMEOUT_MS = 55000;

    const payload = JSON.stringify({
      mediaTitle: displayTitle,
      prompt,
      personalCharacter: personalCharacter || undefined,
      characterImageUrl: characterImage || undefined,
      hasMusicUpload: !!musicFile,
      tone: TONES.find(t => t.id === tone)?.label || 'Dramatic',
      format,
      crossover: crossover || undefined,
      artStyle,
      showProfile: showProfile
        ? { visualStyle: showProfile.visualStyle, audioTone: showProfile.audioTone, characters: showProfile.characters.map(c => c.name) }
        : undefined,
    });

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const res = await fetch('/api/create/script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Script generation failed' }));
          throw new Error(errData.error || 'Generation failed (' + res.status + ')');
        }
        const data = await res.json();
        setScriptTitle(data.title || '');
        setScriptLogline(data.logline || '');
        setScriptScenes(data.scenes || []);
        setScriptLoading(false);
        setStep('script');
        return;
      } catch (err: unknown) {
        clearTimeout(timer);
        const e = err instanceof Error ? err : new Error(String(err));
        const isNetwork = e.name === 'AbortError' || e.name === 'TypeError';
        if (isNetwork && attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        if (e.name === 'AbortError') {
          setScriptError('Request timed out -- try a shorter format.');
        } else {
          setScriptError(e.message || 'Failed to generate script');
        }
      }
    }
    setScriptLoading(false);
  }

  // ===================================================================
  //  GENERATE STORYBOARD (Step 3)
  // ===================================================================
  async function generateStoryboard() {
    setStoryboardLoading(true);
    setStoryboardError('');
    try {
      const res = await fetch('/api/create/storyboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaTitle: displayTitle,
          prompt,
          personalCharacter: personalCharacter || undefined,
          tone: TONES.find(t => t.id === tone)?.label || 'Dramatic',
          format,
          crossover: crossover || undefined,
          artStyle,
          artStylePrompt: resolvedStylePrompt,
          scriptScenes: scriptScenes.length > 0 ? scriptScenes : undefined,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'AI generation failed' }));
        throw new Error(errData.error || 'Generation failed (' + res.status + ')');
      }
      const data = await res.json();
      const emojis = ['\u{1F3AC}', '\u{1F4AB}', '\u{1F525}', '\u{1F31F}', '\u{1F3AD}', '\u{1F48E}'];
      const aiScenes: StoryboardScene[] = (data.scenes || []).map((s: Record<string, unknown>, i: number) => ({
        id: 'sc_' + (i + 1),
        sceneNum: (s.sceneNum as number) || i + 1,
        description: (s.description as string) || '',
        duration: (s.duration as string) || '',
        visual: (s.visual as string) || '',
        emoji: (s.emoji as string) || emojis[i % 6],
      }));
      if (aiScenes.length === 0) throw new Error('AI returned no scenes -- try rephrasing');
      setScenes(aiScenes);
      setStep('storyboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStoryboardError(msg || 'Failed to generate storyboard');
    } finally {
      setStoryboardLoading(false);
    }
  }

  // ===================================================================
  //  IMAGE GENERATION (Step 4)
  // ===================================================================
  function buildImagePrompt(sceneVisual: string): string {
    if (!resolvedStylePrompt) return sceneVisual;
    return sceneVisual + ', ' + resolvedStylePrompt;
  }

  async function generateSceneImage(scene: StoryboardScene): Promise<{ image: string; imageUrl?: string } | null> {
    const ar = ASPECT_RATIOS.find(a => a.id === aspectRatio) || ASPECT_RATIOS[0];
    // Extract character names from the matching script scene's dialogue
    const scriptScene = scriptScenes.find(ss => ss.sceneNum === scene.sceneNum);
    const charNames = scriptScene?.dialogue
      ? [...new Set(scriptScene.dialogue.map(d => d.character).filter(Boolean))]
      : [];
    let attempts = 0;
    while (attempts < 3) {
      const res = await fetch('/api/create/imagine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: buildImagePrompt(scene.visual),
          model: AUTO_IMAGE_MODEL,
          sceneId: scene.id,
          negative_prompt: negativePrompt,
          width: ar.width,
          height: ar.height,
          // Pass show context so imagine route can inject 1:1 faithful style
          showTitle: selectedMedia.category === 'Custom' ? undefined : selectedMedia.title,
          artStyle,
          characters: charNames,
        }),
      });
      if (res.status === 503) {
        const data = await res.json().catch(() => ({} as Record<string, unknown>));
        const wait = Math.min(((data.estimated_time as number) || 20) * 1000, 60000);
        await new Promise(r => setTimeout(r, wait));
        attempts++;
        continue;
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({} as Record<string, unknown>));
        throw new Error((errData.error as string) || (errData.details as string) || 'Image generation failed (' + res.status + ')');
      }
      const data = await res.json();
      if (data.image) return { image: data.image, imageUrl: data.imageUrl };
      throw new Error('No image returned');
    }
    return null;
  }

  async function regenerateScene(sceneId: string) {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;
    setRegeneratingScene(sceneId);
    try {
      const result = await generateSceneImage(scene);
      if (result) {
        setSceneImages(prev => ({ ...prev, [sceneId]: result.image }));
        if (result.imageUrl) setSceneImageUrls(prev => ({ ...prev, [sceneId]: result.imageUrl as string }));
      }
    } catch {
      // silently fail on regen
    } finally {
      setRegeneratingScene(null);
    }
  }

  async function startGeneration() {
    setStep('generating');
    setGenProgress(0);
    setGenError('');
    setSceneImages({});
    setSceneImageUrls({});
    setGenElapsed(0);
    elapsedRef.current = setInterval(() => setGenElapsed(prev => prev + 1), 1000);
    const total = scenes.length;
    const CONCURRENCY = Math.min(3, total);
    setGenStage('\u{1F3A8} Generating ' + total + ' scenes (' + CONCURRENCY + ' in parallel)...');
    await runParallelBatches(
      scenes,
      async (scene, idx) => {
        setGenStage('\u{1F3A8} Scene ' + (idx + 1) + '/' + total + ': ' + scene.description.slice(0, 50) + '...');
        const result = await generateSceneImage(scene);
        if (result) {
          setSceneImages(prev => ({ ...prev, [scene.id]: result.image }));
          if (result.imageUrl) setSceneImageUrls(prev => ({ ...prev, [scene.id]: result.imageUrl as string }));
        }
        return result;
      },
      {
        concurrency: CONCURRENCY,
        onProgress: (completed, total, _result, idx, error) => {
          setGenProgress(Math.round((completed / total) * 100));
          if (!_result) setGenError(prev => prev ? prev + '\nScene ' + (idx + 1) + ': ' + (error || 'Unknown') : 'Scene ' + (idx + 1) + ': ' + (error || 'Unknown'));
        },
      }
    );
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    setGenStage('Complete! \u2728');
    setGenProgress(100);
    setTimeout(() => setStep('review-images'), 600);
  }

  // ===================================================================
  //  VIDEO GENERATION (Step 5) -- video + audio in sync
  // ===================================================================
  async function animateScene(scene: StoryboardScene, idx: number, totalScenes: number): Promise<string | null> {
    setVideoStage('\u{1F3AC} Scene ' + (idx + 1) + '/' + totalScenes + ': ' + scene.description.slice(0, 40) + '...');
    try {
      const scriptScene = scriptScenes.find(ss => ss.sceneNum === scene.sceneNum);
      const dialogue = (scriptScene?.dialogue || []).filter(d => d.line?.trim());
      const charNames = [...new Set(dialogue.map(d => d.character))];
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 300000);
      const res = await fetch('/api/generate/scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          show: selectedMedia.category === 'Custom' ? 'custom' : selectedMedia.title,
          artStyle,
          sceneDescription: scene.visual || scene.description,
          dialogue: dialogue.map(d => ({ character: d.character, line: d.line })),
          characters: charNames,
          duration: scene.duration ? parseInt(scene.duration) : undefined,
          aspectRatio,
          videoModel: AUTO_VIDEO_MODEL,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();
      if (data.success && data.videoUrl) {
        setSceneVideos(prev => ({ ...prev, [scene.id]: data.videoUrl }));
        return data.videoUrl;
      }
      setVideoError(prev => (prev ? prev + ' | ' : '') + 'Scene ' + (idx + 1) + ': ' + (data.error || 'No video'));
      return null;
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      const msg = e.name === 'AbortError' ? 'timed out (5 min)' : e.message;
      setVideoError(prev => (prev ? prev + ' | ' : '') + 'Scene ' + (idx + 1) + ': ' + msg);
      return null;
    }
  }

  async function generateVideos() {
    setVideoGenerating(true);
    setVideoProgress(0);
    setVideoError('');
    const total = scenes.length;
    const CONCURRENCY = Math.min(2, total);
    setVideoStage('\u{1F3AC} Generating ' + total + ' videos with synced audio (' + CONCURRENCY + ' in parallel)...');
    await runParallelBatches(
      scenes,
      (scene, idx) => animateScene(scene, idx, total),
      { concurrency: CONCURRENCY, onProgress: (completed, total2) => setVideoProgress(Math.round((completed / total2) * 100)) }
    );
    const count = Object.keys(sceneVideos).length;
    setVideoStage(count > 0 ? count + ' videos ready! \u{1F389}' : 'Video generation finished');
    setVideoGenerating(false);
  }

  // -- Download all images --
  function downloadAllImages() {
    setDownloadingAll(true);
    Object.entries(sceneImages).forEach(([, dataUrl], idx) => {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = displayTitle.replace(/[^a-zA-Z0-9]/g, '_') + '_scene_' + (idx + 1) + '.png';
      link.click();
    });
    setTimeout(() => setDownloadingAll(false), 1000);
  }

  // -- Share handler --
  function handleShare(platformId: string) {
    const platform = SOCIAL_PLATFORMS.find(p => p.id === platformId);
    if (!platform) return;
    setShareToast('Shared to ' + platform.name + '!');
    setShowShareMenu(false);
    setTimeout(() => setShareToast(''), 2500);
  }

  // ===================================================================
  //  RENDER
  // ===================================================================
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex flex-col">
      {/* -- Header ------------------------------------------------ */}
      <div className="shrink-0 border-b border-border bg-bg/95 backdrop-blur px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-muted hover:text-white text-sm transition">{'\u2190'} Back</button>
          <div className="w-px h-5 bg-border" />
          <span className="text-xl">{selectedMedia.emoji}</span>
          <div>
            <h2 className="font-display text-lg text-white tracking-wide">{displayTitle}</h2>
            <p className="text-[10px] text-muted">{selectedMedia.category} {'\u00B7'} {selectedMedia.year} {'\u00B7'} {selectedMedia.genre}</p>
          </div>
        </div>
        {/* Step progress dots */}
        <div className="hidden sm:flex items-center gap-1">
          {VISIBLE_STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              {i > 0 && <div className={'w-4 h-px ' + (
                stepIndex > STEP_ORDER.indexOf(s) ? 'bg-lime'
                : step === s || (step === 'generating' && s === 'review-images') ? 'bg-rip'
                : 'bg-border'
              )} />}
              <div className={'w-2 h-2 rounded-full transition-all ' + (
                stepIndex > STEP_ORDER.indexOf(s) || (s === 'result' && step === 'result') ? 'bg-lime scale-100'
                : step === s || (step === 'generating' && s === 'review-images') ? 'bg-rip scale-125'
                : 'bg-border scale-100'
              )} title={STEP_LABELS[s] || s} />
            </div>
          ))}
        </div>
      </div>

      {/* -- Body (scrollable) ------------------------------------- */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-2xl mx-auto">

          {/* ======================================================
               STEP 1: CONFIG
               Prompt + Personal Character + Tone + Art Style + Format
             ====================================================== */}
          {step === 'config' && (
            <div>
              <h3 className="font-display text-2xl text-white mb-1">Describe Your Vision</h3>
              <p className="text-sm text-muted mb-6">Configure everything in one place -- AI will write a full script from this</p>

              {/* Prompt */}
              <div className="mb-4">
                <label className="text-[9px] font-bold text-muted uppercase tracking-widest block mb-1.5">Your Idea *</label>
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                  placeholder={'e.g. "Walter White and Gus Fring have a chess match that mirrors their power struggle..."'}
                  rows={4}
                  className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-rip placeholder:text-muted2 resize-none" />
              </div>

              {/* Personal Character (optional) + Reference Image Upload */}
              <div className="mb-4">
                <label className="text-[9px] font-bold text-muted uppercase tracking-widest block mb-1.5">
                  {'\u2728'} Personal Character <span className="text-muted2">(optional)</span>
                </label>
                <div className="flex gap-3">
                  {/* Left: image upload area */}
                  <div
                    className={'relative flex-shrink-0 w-28 h-28 rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden group '
                      + (dragOver ? 'border-cyan bg-cyan/10 scale-[1.02]'
                        : characterImage ? 'border-rip/50 bg-rip/5'
                        : 'border-border bg-bg2 hover:border-cyan/50 hover:bg-bg3')}
                    onClick={() => characterImageRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); handleCharacterImage(e.dataTransfer.files?.[0] || null); }}
                  >
                    <input ref={characterImageRef} type="file" accept="image/*" className="hidden"
                      onChange={e => handleCharacterImage(e.target.files?.[0] || null)} />
                    {characterImage ? (
                      <>
                        <img src={characterImage} alt="Character ref" className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-xs font-bold">Change</span>
                        </div>
                        <button onClick={e => { e.stopPropagation(); handleCharacterImage(null); }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white text-[10px] flex items-center justify-center hover:bg-red-500 transition-colors z-10">
                          {'\u2715'}
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl mb-1 text-muted group-hover:text-cyan transition-colors">{'\uD83D\uDDBC\uFE0F'}</span>
                        <span className="text-[9px] text-muted text-center leading-tight group-hover:text-white transition-colors">Upload<br/>Reference</span>
                      </>
                    )}
                  </div>

                  {/* Right: text input + helper */}
                  <div className="flex-1 min-w-0">
                    <input value={personalCharacter} onChange={e => setPersonalCharacter(e.target.value)}
                      placeholder="Add your own character into the story... e.g. 'Alex, a time-traveling detective'"
                      className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan placeholder:text-muted2" />
                    <p className="text-[10px] text-muted mt-1">
                      Show characters are auto-detected from your prompt + {displayTitle} profile. Add your own OC here if you want.
                    </p>
                    {characterImage && (
                      <p className="text-[10px] text-cyan mt-1 flex items-center gap-1">
                        {'\u2705'} Reference image attached — AI will use this as visual reference
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Tone */}
              <div className="mb-4">
                <label className="text-[9px] font-bold text-muted uppercase tracking-widest block mb-2">Tone / Style</label>
                <div className="flex flex-wrap gap-2">
                  {TONES.map(t => (
                    <button key={t.id} onClick={() => setTone(t.id)}
                      className={'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ' + (
                        tone === t.id
                          ? 'bg-rip/15 border border-rip text-rip'
                          : 'bg-bg2 border border-border text-muted hover:text-white'
                      )}>
                      <span>{t.emoji}</span> {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Art Style */}
              <div className="mb-4">
                <label className="text-[9px] font-bold text-muted uppercase tracking-widest block mb-2">{'\u{1F3A8}'} Art Style</label>
                <p className="text-[10px] text-muted mb-2">All styles use the Original 1:1 look as the base, then layer the effect on top</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {ART_STYLES.map(s => (
                    <button key={s.id} onClick={() => setArtStyle(s.id as ArtStyleId)}
                      className={'p-2.5 rounded-xl text-center transition-all ' + (
                        artStyle === s.id
                          ? 'bg-rip/15 border-2 border-rip text-white scale-[1.02]'
                          : 'bg-bg2 border border-border text-muted hover:text-white hover:border-bord2'
                      )}>
                      <span className="text-xl block mb-1">{s.emoji}</span>
                      <span className="text-[10px] font-bold">{s.label}</span>
                      {s.id === 'cartoon-realistic' && (
                        <span className="text-[8px] block text-cyan mt-0.5">
                          {['Cartoon', 'Anime'].includes(selectedMedia.category) ? '+ Realistic' : '+ Cartoon'}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format */}
              <div className="mb-4">
                <label className="text-[9px] font-bold text-muted uppercase tracking-widest block mb-2">Format</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {FORMATS.map(f => (
                    <button key={f.id} onClick={() => setFormat(f.id)}
                      className={'p-3 rounded-xl border text-left transition-all ' + (
                        format === f.id ? 'border-cyan bg-cyan/5' : 'border-border bg-bg2 hover:border-bord2'
                      )}>
                      <div className="text-lg mb-1">{f.emoji}</div>
                      <div className="text-xs font-bold text-white">{f.label}</div>
                      <div className="text-[10px] text-muted">{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Music Upload (shown when Music Video format selected) */}
              {format === 'music_vid' && (
                <div className="mb-4">
                  <label className="text-[9px] font-bold text-muted uppercase tracking-widest block mb-1.5">
                    {'\uD83C\uDFB5'} Your Soundtrack <span className="text-muted2">(optional — AI generates music if empty)</span>
                  </label>
                  <div
                    className={'relative rounded-xl border-2 border-dashed transition-all cursor-pointer p-4 '
                      + (musicDragOver ? 'border-purple bg-purple/10'
                        : musicFile ? 'border-lime/50 bg-lime/5'
                        : 'border-border bg-bg2 hover:border-purple/50 hover:bg-bg3')}
                    onClick={() => musicInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setMusicDragOver(true); }}
                    onDragLeave={() => setMusicDragOver(false)}
                    onDrop={e => { e.preventDefault(); setMusicDragOver(false); handleMusicFile(e.dataTransfer.files?.[0] || null); }}
                  >
                    <input ref={musicInputRef} type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac" className="hidden"
                      onChange={e => handleMusicFile(e.target.files?.[0] || null)} />
                    {musicFile ? (
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-purple/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-2xl">{'\uD83C\uDFB6'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-bold truncate">{musicFile.name}</p>
                          <p className="text-[10px] text-muted">{(musicFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                          {musicUrl && (
                            <audio src={musicUrl} controls className="mt-2 w-full h-8"
                              style={{ filter: 'invert(1) hue-rotate(180deg)', opacity: 0.7 }} />
                          )}
                        </div>
                        <button onClick={e => { e.stopPropagation(); handleMusicFile(null); }}
                          className="w-7 h-7 rounded-full bg-black/50 text-white text-xs flex items-center justify-center hover:bg-red-500 transition-colors flex-shrink-0">
                          {'\u2715'}
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-2">
                        <span className="text-3xl block mb-2">{'\uD83C\uDFB5'}</span>
                        <p className="text-sm text-muted">Drag & drop your audio file here</p>
                        <p className="text-[10px] text-muted2 mt-1">MP3, WAV, M4A, OGG, FLAC • or click to browse</p>
                        <p className="text-[10px] text-purple mt-2">No file? VidMuse AI will generate a soundtrack from your visuals</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Aspect Ratio */}
              <div className="mb-4">
                <label className="text-[10px] text-muted font-bold uppercase tracking-widest block mb-2">{'\u{1F4D0}'} Aspect Ratio</label>
                <div className="flex flex-wrap gap-2">
                  {ASPECT_RATIOS.map(a => (
                    <button key={a.id} onClick={() => setAspectRatio(a.id)}
                      className={'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ' + (
                        aspectRatio === a.id
                          ? 'bg-cyan/15 border border-cyan text-cyan'
                          : 'bg-bg2 border border-border text-muted hover:text-white'
                      )}>
                      <span>{a.emoji}</span> {a.label}
                      <span className="text-[9px] text-muted font-normal hidden sm:inline">{'\u00B7'} {a.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Crossover (optional) */}
              <div className="mb-4">
                <label className="text-[9px] font-bold text-muted uppercase tracking-widest block mb-1.5">Crossover <span className="text-muted2">(optional)</span></label>
                <input value={crossover} onChange={e => setCrossover(e.target.value)}
                  placeholder="Mix with another IP... e.g. 'SpongeBob meets Breaking Bad'"
                  className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-rip placeholder:text-muted2" />
              </div>

              {/* Advanced (negative prompt, etc) */}
              <div className="mb-6 bg-bg2 border border-border rounded-xl p-4">
                <button onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center justify-between w-full text-left">
                  <span className="text-[9px] text-muted uppercase tracking-widest font-bold">{'\u2699\uFE0F'} Advanced Options</span>
                  <span className="text-xs text-muted">{showAdvanced ? '\u25B2' : '\u25BC'}</span>
                </button>
                {showAdvanced && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <label className="text-[10px] text-muted font-bold block mb-1">Negative Prompt</label>
                    <textarea value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)}
                      placeholder="Things to avoid..."
                      className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-xs text-white placeholder:text-muted/50 resize-none focus:border-lime/50 focus:outline-none"
                      rows={2} />
                  </div>
                )}
              </div>

              {/* Pipeline summary */}
              <div className="mb-6 text-[10px] text-muted bg-bg2 border border-lime/20 rounded-xl p-3">
                <div className="font-bold text-white text-xs mb-1">{'\u26A1'} Free Pipeline (auto-selected)</div>
                {'\u{1F4DD}'} <span className="text-purple font-bold">Claude Sonnet</span> {'\u2192 '}
                {'\u270D\uFE0F'} <span className="text-orange-400 font-bold">Script</span> {'\u2192 '}
                {'\u{1F3A8}'} <span className="text-lime font-bold">Pollinations</span> {'\u2192 '}
                {'\u{1F3AC}'} <span className="text-cyan font-bold">Self-Hosted Wan 2.1</span> {'\u2192 '}
                {'\u{1F3AF}'} <span className="text-rip font-bold">{ART_STYLES.find(s => s.id === artStyle)?.label || 'Original'}</span>
              </div>

              {/* Script error from previous attempt */}
              {scriptError && (
                <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2">
                  <span>{'\u274C'}</span>
                  <p className="text-xs text-red-400">{scriptError}</p>
                  <button onClick={() => setScriptError('')} className="ml-auto text-muted hover:text-white text-xs">{'\u2715'}</button>
                </div>
              )}

              {/* Generate Script button */}
              <button onClick={generateScript}
                disabled={!prompt.trim() || scriptLoading}
                className={'w-full py-3.5 rounded-xl font-display text-lg tracking-wide transition-all ' + (
                  prompt.trim() && !scriptLoading ? 'text-white hover:brightness-110' : 'text-muted bg-bg3 border border-border cursor-not-allowed'
                )}
                style={prompt.trim() && !scriptLoading ? { background: 'linear-gradient(90deg,#ff2d78,#a855f7)' } : {}}>
                {scriptLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">{'\u270D\uFE0F'}</span> AI Writing Script...
                  </span>
                ) : prompt.trim() ? 'Generate Script \u2192' : 'Describe your idea to continue'}
              </button>
            </div>
          )}

          {/* ======================================================
               STEP 2: SCRIPT REVIEW
             ====================================================== */}
          {step === 'script' && (
            <div>
              <h3 className="font-display text-2xl text-white mb-1">{scriptTitle || 'Your Script'}</h3>
              {scriptLogline && <p className="text-sm text-muted italic mb-4">{scriptLogline}</p>}

              {/* Script metadata */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-2 py-1 rounded-full bg-rip/10 border border-rip/30 text-rip text-[10px] font-bold">
                  {TONES.find(t => t.id === tone)?.emoji} {TONES.find(t => t.id === tone)?.label}
                </span>
                <span className="px-2 py-1 rounded-full bg-cyan/10 border border-cyan/30 text-cyan text-[10px] font-bold">
                  {ART_STYLES.find(s => s.id === artStyle)?.emoji || ''} {ART_STYLES.find(s => s.id === artStyle)?.label}
                </span>
                <span className="px-2 py-1 rounded-full bg-lime/10 border border-lime/30 text-lime text-[10px] font-bold">
                  {scriptScenes.length} scenes
                </span>
                {personalCharacter && (
                  <span className="px-2 py-1 rounded-full bg-purple/10 border border-purple/30 text-purple text-[10px] font-bold">
                    {'\u2728'} {personalCharacter}
                  </span>
                )}
              </div>

              {/* Scene cards */}
              <div className="space-y-3 mb-6">
                {scriptScenes.map((scene, i) => (
                  <div key={i} className="bg-bg2 border border-border rounded-xl p-4 hover:border-bord2 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-rip/20 flex items-center justify-center text-xs font-bold text-rip">{scene.sceneNum}</span>
                        <h4 className="text-sm font-bold text-white">{scene.heading}</h4>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted">
                        <span>{scene.duration}</span>
                        <span>{'\u00B7'}</span>
                        <span>{scene.mood}</span>
                      </div>
                    </div>

                    {editingScript === i ? (
                      <div>
                        <textarea value={scriptEditText} onChange={e => setScriptEditText(e.target.value)}
                          className="w-full bg-bg3 border border-rip/30 rounded-lg px-3 py-2 text-xs text-white resize-none focus:outline-none"
                          rows={4} />
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => {
                            const updated = [...scriptScenes];
                            updated[i] = { ...updated[i], description: scriptEditText };
                            setScriptScenes(updated);
                            setEditingScript(null);
                          }} className="px-3 py-1.5 rounded-lg bg-lime/10 border border-lime text-lime text-[10px] font-bold">Save</button>
                          <button onClick={() => setEditingScript(null)}
                            className="px-3 py-1.5 rounded-lg bg-bg3 border border-border text-muted text-[10px] font-bold">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-muted mb-2">{scene.description}</p>
                        {scene.action && <p className="text-xs text-cyan/70 italic mb-2">{scene.action}</p>}
                        {scene.dialogue?.length > 0 && (
                          <div className="space-y-1 mt-2 pt-2 border-t border-border/50">
                            {scene.dialogue.map((d, di) => (
                              <div key={di} className="flex gap-2">
                                <span className="text-[10px] font-bold text-rip uppercase shrink-0">{d.character}</span>
                                <span className="text-[11px] text-white">{d.line}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {scene.cameraNote && (
                          <p className="text-[10px] text-muted mt-2">{'\u{1F3A5}'} {scene.cameraNote}</p>
                        )}
                        <button onClick={() => { setEditingScript(i); setScriptEditText(scene.description); }}
                          className="mt-2 text-[10px] text-muted hover:text-rip transition">{'\u270F\uFE0F'} Edit</button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex gap-3">
                <button onClick={() => setStep('config')}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-muted border border-border hover:border-bord2 transition-all">
                  {'\u2190'} Config
                </button>
                <button onClick={generateStoryboard}
                  disabled={storyboardLoading}
                  className="flex-1 py-3.5 rounded-xl font-display text-lg tracking-wide text-white transition-all hover:brightness-110"
                  style={{ background: 'linear-gradient(90deg,#ff2d78,#a855f7)' }}>
                  {storyboardLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">{'\u{1F3A8}'}</span> Building Storyboard...
                    </span>
                  ) : 'Approve & Build Storyboard \u2192'}
                </button>
              </div>
              {storyboardError && (
                <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                  <p className="text-xs text-red-400">{storyboardError}</p>
                </div>
              )}
            </div>
          )}

          {/* ======================================================
               STEP 3: APPROVE STORYBOARD
             ====================================================== */}
          {step === 'storyboard' && (
            <div>
              <h3 className="font-display text-2xl text-white mb-1">Approve Storyboard</h3>
              <p className="text-sm text-muted mb-6">Review and edit scene visuals before generation. Click a scene to edit its visual prompt.</p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {scenes.map((scene) => (
                  <div key={scene.id}
                    className={'p-3 rounded-xl border transition-all ' + (
                      editingScene === scene.id ? 'border-rip bg-rip/5' : 'border-border bg-bg2 hover:border-bord2'
                    )}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{scene.emoji}</span>
                      <div>
                        <span className="text-[10px] font-bold text-white">Scene {scene.sceneNum}</span>
                        <span className="text-[10px] text-muted ml-2">{scene.duration}</span>
                      </div>
                    </div>

                    {editingScene === scene.id ? (
                      <div>
                        <textarea value={sceneEditText} onChange={e => setSceneEditText(e.target.value)}
                          className="w-full bg-bg3 border border-rip/30 rounded-lg px-3 py-2 text-[11px] text-white resize-none focus:outline-none"
                          rows={3} />
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => {
                            setScenes(prev => prev.map(s => s.id === scene.id ? { ...s, visual: sceneEditText, description: sceneEditText } : s));
                            setEditingScene(null);
                          }} className="px-2 py-1 rounded bg-lime/10 border border-lime text-lime text-[9px] font-bold">Save</button>
                          <button onClick={() => setEditingScene(null)}
                            className="px-2 py-1 rounded bg-bg3 border border-border text-muted text-[9px] font-bold">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-[11px] text-muted line-clamp-3">{scene.visual || scene.description}</p>
                        <button onClick={() => { setEditingScene(scene.id); setSceneEditText(scene.visual || scene.description); }}
                          className="mt-2 text-[10px] text-muted hover:text-rip transition">{'\u270F\uFE0F'} Edit visual</button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex gap-3">
                <button onClick={() => setStep('script')}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-muted border border-border hover:border-bord2 transition-all">
                  {'\u2190'} Script
                </button>
                <button onClick={startGeneration}
                  className="flex-1 py-3.5 rounded-xl font-display text-lg tracking-wide text-white transition-all hover:brightness-110"
                  style={{ background: 'linear-gradient(90deg,#ff2d78,#a855f7)' }}>
                  Generate Images {'\u2192'}
                </button>
              </div>
            </div>
          )}

          {/* ======================================================
               STEP 4a: GENERATING IMAGES (progress)
             ====================================================== */}
          {step === 'generating' && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 animate-pulse">{'\u{1F3A8}'}</div>
              <h3 className="font-display text-2xl text-white mb-2">
                Bringing {displayTitle} to life...
              </h3>
              <p className="text-sm text-muted mb-6">{genStage}</p>
              <div className="max-w-sm mx-auto mb-4">
                <div className="h-2 bg-bg3 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: genProgress + '%', background: 'linear-gradient(90deg,#ff2d78,#a855f7)' }} />
                </div>
                <div className="flex justify-between mt-1.5 text-[10px] text-muted">
                  <span>{genProgress}%</span>
                  <span>{genElapsed}s</span>
                </div>
              </div>
              {genError && (
                <div className="text-left max-w-sm mx-auto bg-red-500/10 border border-red-500/30 rounded-xl p-3 mt-4">
                  <p className="text-[10px] text-red-400 whitespace-pre-wrap">{genError}</p>
                </div>
              )}
            </div>
          )}

          {/* ======================================================
               STEP 4b: REVIEW IMAGES
             ====================================================== */}
          {step === 'review-images' && (
            <div>
              <h3 className="font-display text-2xl text-white mb-1">Review Images</h3>
              <p className="text-sm text-muted mb-4">Approve your scenes or regenerate any you don&apos;t like</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {scenes.map((scene, i) => (
                  <div key={scene.id} className="relative group">
                    {sceneImages[scene.id] ? (
                      <img src={sceneImages[scene.id]} alt={'Scene ' + (i + 1)}
                        className="aspect-video object-cover rounded-xl border border-border group-hover:border-rip transition-all" />
                    ) : (
                      <div className="aspect-video bg-bg3 border border-border rounded-xl flex items-center justify-center text-2xl opacity-40">
                        {scene.emoji}
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent rounded-b-xl">
                      <span className="text-[10px] text-white font-bold">Scene {scene.sceneNum}</span>
                      <p className="text-[9px] text-white/60 line-clamp-1">{scene.description.slice(0, 60)}</p>
                    </div>
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => regenerateScene(scene.id)}
                        disabled={regeneratingScene === scene.id}
                        title="Regenerate"
                        className="w-7 h-7 rounded-lg bg-black/70 backdrop-blur border border-white/20 flex items-center justify-center text-xs hover:border-rip transition-all disabled:animate-spin">
                        {'\u{1F504}'}
                      </button>
                    </div>
                    {regeneratingScene === scene.id && (
                      <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
                        <span className="text-2xl animate-spin">{'\u{1F3A8}'}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex gap-3">
                <button onClick={() => setStep('storyboard')}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-muted border border-border hover:border-bord2 transition-all">
                  {'\u2190'} Storyboard
                </button>
                <button onClick={() => {
                  setStep('review-videos');
                  generateVideos();
                }}
                  disabled={Object.keys(sceneImages).length === 0}
                  className="flex-1 py-3.5 rounded-xl font-display text-lg tracking-wide text-white transition-all hover:brightness-110 disabled:opacity-50"
                  style={{ background: 'linear-gradient(90deg,#00d4ff,#a855f7)' }}>
                  Generate Video + Audio {'\u2192'}
                </button>
              </div>
            </div>
          )}

          {/* ======================================================
               STEP 5: GENERATE & REVIEW VIDEOS
             ====================================================== */}
          {step === 'review-videos' && (
            <div>
              <h3 className="font-display text-2xl text-white mb-1">Generate Video</h3>
              <p className="text-sm text-muted mb-4">Video + audio generated in sync -- characters speak when they&apos;re supposed to</p>

              {/* Progress */}
              {videoGenerating && (
                <div className="mb-6">
                  <div className="h-2 bg-bg3 rounded-full overflow-hidden mb-2">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: videoProgress + '%', background: 'linear-gradient(90deg,#00d4ff,#a855f7)' }} />
                  </div>
                  <p className="text-xs text-muted">{videoStage}</p>
                </div>
              )}

              {videoError && (
                <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                  <p className="text-xs text-red-400">{videoError}</p>
                </div>
              )}

              {/* Video grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {scenes.map((scene, i) => (
                  <div key={scene.id} className="relative">
                    {sceneVideos[scene.id] ? (
                      <video src={sceneVideos[scene.id]}
                        className="aspect-video object-cover rounded-xl border border-lime/30"
                        controls muted loop playsInline />
                    ) : sceneImages[scene.id] ? (
                      <div className="relative">
                        <img src={sceneImages[scene.id]} alt={'Scene ' + (i + 1)}
                          className="aspect-video object-cover rounded-xl border border-border opacity-50" />
                        {videoGenerating && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-2xl animate-spin">{'\u{1F3AC}'}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="aspect-video bg-bg3 border border-border rounded-xl flex items-center justify-center text-2xl opacity-40">
                        {scene.emoji}
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent rounded-b-xl">
                      <span className="text-[10px] text-white font-bold">Scene {scene.sceneNum}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex gap-3">
                <button onClick={() => setStep('review-images')}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-muted border border-border hover:border-bord2 transition-all">
                  {'\u2190'} Images
                </button>
                <button onClick={() => {
                  const rd: ResultData = {
                    title: scriptTitle || displayTitle + ': ' + prompt.slice(0, 40),
                    media: selectedMedia,
                    prompt,
                    personalCharacter,
                    tone,
                    format,
                    scenes,
                    scriptScenes,
                    videoUrl: Object.values(sceneVideos)[0],
                    thumbnailUrl: Object.values(sceneImages)[0],
                  };
                  setResultData(rd);
                  setStep('result');
                }}
                  disabled={videoGenerating}
                  className="flex-1 py-3.5 rounded-xl font-display text-lg tracking-wide text-white transition-all hover:brightness-110 disabled:opacity-50"
                  style={{ background: 'linear-gradient(90deg,#ff2d78,#a855f7)' }}>
                  {videoGenerating ? 'Generating...' : 'Review Result \u2192'}
                </button>
              </div>
            </div>
          )}

          {/* ======================================================
               STEP 6: RESULT -- Publish or Edit in RIP Studio
             ====================================================== */}
          {step === 'result' && resultData && (
            <div>
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">{'\u{1F389}'}</div>
                <h3 className="font-display text-3xl text-white mb-1">Your Creation is Ready!</h3>
                <p className="text-sm text-muted">{resultData.media.title}</p>
              </div>

              {/* Preview card */}
              <div className="bg-bg2 border border-border rounded-2xl overflow-hidden mb-6">
                <div className="aspect-video flex items-center justify-center relative overflow-hidden"
                  style={Object.keys(sceneImages).length > 0 ? {} : { background: resultData.media.gradient }}>
                  {Object.keys(sceneVideos).length > 0 ? (
                    <video src={Object.values(sceneVideos)[0]}
                      className="w-full h-full object-cover" controls autoPlay muted loop playsInline />
                  ) : Object.keys(sceneImages).length > 0 ? (
                    <img src={sceneImages[scenes[0]?.id] || Object.values(sceneImages)[0]}
                      alt="Hero scene" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-8xl opacity-30">{resultData.media.emoji}</span>
                  )}
                  <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
                    <span className="px-2 py-1 rounded-full bg-black/50 backdrop-blur text-white text-[10px] font-bold">{resultData.media.category}</span>
                    <span className="px-2 py-1 rounded-full bg-black/50 backdrop-blur text-white text-[10px] font-bold">{TONES.find(t => t.id === resultData.tone)?.label}</span>
                    <span className="px-2 py-1 rounded-full bg-rip/40 backdrop-blur text-white text-[10px] font-bold">{'\u{1F3A8}'} {ART_STYLES.find(s => s.id === artStyle)?.label}</span>
                  </div>
                  <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/40 backdrop-blur text-white/70 text-[8px] font-mono">
                    FAN-MADE {'\u00B7'} remixip.icu
                  </div>
                </div>
                <div className="p-4">
                  <h4 className="font-display text-xl text-white mb-1">{resultData.title}</h4>
                  <p className="text-xs text-muted">{resultData.prompt.slice(0, 100)}...</p>
                </div>
              </div>

              {/* Primary actions: Publish or Edit in RIP Studio */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button onClick={() => {
                  if (onPublish && resultData) {
                    onPublish({
                      title: resultData.title,
                      description: prompt,
                      thumbnail: sceneImages[scenes[0]?.id] || Object.values(sceneImages)[0],
                      mediaUrl: sceneVideos[scenes[0]?.id] || Object.values(sceneVideos)[0],
                      show: resultData.media.title,
                      genre: resultData.media.category,
                    });
                  }
                }}
                  className="py-4 rounded-xl font-display text-lg tracking-wide text-white transition-all hover:brightness-110"
                  style={{ background: 'linear-gradient(90deg,#ff2d78,#a855f7,#00d4ff)' }}>
                  {'\u263D'} Publish
                </button>
                <button onClick={() => onOpenEditor(resultData)}
                  className="py-4 rounded-xl font-display text-lg tracking-wide text-white border-2 border-cyan bg-cyan/10 hover:bg-cyan/20 transition-all">
                  {'\u2702\uFE0F'} Edit in RIP Studio
                </button>
              </div>

              {/* Social share on publish */}
              <div className="bg-bg2 border border-border rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{'\u{1F4E4}'}</span>
                  <span className="text-[9px] text-muted uppercase tracking-widest font-bold">Share Across Social Media</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SOCIAL_PLATFORMS.map(p => (
                    <button key={p.id} onClick={() => handleShare(p.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bg3 border border-border text-xs text-muted hover:text-white hover:border-bord2 transition-all">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                        style={{ backgroundColor: (p.color || '#333') + '30', color: p.color || '#fff' }}>{p.icon}</span>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Secondary actions */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button onClick={downloadAllImages} disabled={downloadingAll}
                  className="p-3 bg-bg2 border border-border rounded-xl hover:border-lime transition-all text-left disabled:opacity-50">
                  <span className="text-lg block mb-1">{downloadingAll ? '\u23F3' : '\u2B07\uFE0F'}</span>
                  <div className="text-xs font-bold text-white">Download All</div>
                  <div className="text-[10px] text-muted">{Object.keys(sceneImages).length} images + {Object.keys(sceneVideos).length} videos</div>
                </button>
                <button onClick={() => {
                  if (onPublish && resultData) {
                    onPublish({
                      title: resultData.title,
                      description: prompt,
                      thumbnail: sceneImages[scenes[0]?.id] || Object.values(sceneImages)[0],
                      mediaUrl: sceneVideos[scenes[0]?.id] || Object.values(sceneVideos)[0],
                      show: resultData.media.title,
                      genre: resultData.media.category,
                    });
                  }
                }} className="p-3 bg-bg2 border border-border rounded-xl hover:border-purple transition-all text-left">
                  <span className="text-lg block mb-1">{'\u{1F48E}'}</span>
                  <div className="text-xs font-bold text-white">Mint NFT</div>
                  <div className="text-[10px] text-muted">Solo or Collection</div>
                </button>
              </div>

              <p className="text-center text-[10px] text-muted">
                Published creations appear on RxTV / RxMovies with a shareable link and optional NFT minting
              </p>

              {/* Toast */}
              {shareToast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-lime text-black px-4 py-2 rounded-full text-xs font-bold shadow-2xl z-[200] animate-bounce">
                  {shareToast}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
