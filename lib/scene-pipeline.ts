// lib/scene-pipeline.ts
// Unified scene generation pipeline - video and audio generated together
//
// Fallback chain (lowest cost first):
//   1. Self-hosted GPU (LTX-2.3 or Wan 2.1) -- $0.00 (local) or ~$0.00036/sec (RunPod)
//   2. Pollinations video (free, no key, no audio sync) -- $0.00
//   3. HuggingFace free inference (Wan 2.1 1.3B, needs HF_TOKEN) -- $0.00
//   4. fal.ai LTX-2.3 (cheapest paid, native audio sync) -- ~$0.05/sec
//   5. fal.ai Veo 3.1 / Seedance 2 (best quality + audio sync) -- paid
//
// Self-hosted: LTX-2.3 via RunPod Serverless (Option A) or local GPU (Option C)
// fal.ai: LTX-2.3 (default) → Veo 3.1 → Seedance 2 (fallback chain)

import { falGenerate, FAL_VIDEO_MODELS, type FalModel } from './fal';
import { buildScenePrompt, getStylePrompt, type ArtStyleId } from './shows';
import { enrichScenePrompt, isRagflowAvailable } from './ragflow';
import { pollinationsGenerateVideo } from './pollinations';

// ── HuggingFace free inference for video ────────────────────────
// Tries multiple HF models that support inference API. $0 with HF_TOKEN.
// Falls through model list until one succeeds.
const HF_VIDEO_MODELS = [
  { id: 'tencent/HunyuanVideo', label: 'HunyuanVideo' },
  { id: 'genmo/mochi-1-preview', label: 'Mochi' },
  { id: 'Wan-AI/Wan2.1-T2V-1.3B-Diffusers', label: 'Wan 2.1 1.3B' },
];

async function hfFreeVideoGenerate(
  prompt: string,
): Promise<{ url: string } | null> {
  const token = process.env.HF_TOKEN;
  if (!token) return null;

  for (const model of HF_VIDEO_MODELS) {
    const url = `https://router.huggingface.co/hf-inference/models/${model.id}`;
    try {
      console.log(`[scene-pipeline] Trying HuggingFace ${model.label} (free inference)...`);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: prompt }),
        signal: AbortSignal.timeout(180_000), // Video gen takes time
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.warn(`[scene-pipeline] HF ${model.label} failed (HTTP ${res.status}): ${errText.slice(0, 200)}`);
        continue; // Try next model
      }

      const ct = res.headers.get('content-type') || '';
      if (ct.includes('video') || ct.includes('mp4')) {
        const buffer = Buffer.from(await res.arrayBuffer());
        const b64 = buffer.toString('base64');
        const dataUrl = `data:video/mp4;base64,${b64}`;
        console.log(`[scene-pipeline] ✓ HF ${model.label} video generated (${buffer.byteLength} bytes)`);
        return { url: dataUrl };
      }
      console.warn(`[scene-pipeline] HF ${model.label} unexpected content-type: ${ct}`);
    } catch (err) {
      console.warn(`[scene-pipeline] HF ${model.label} error:`, err instanceof Error ? err.message : err);
    }
  }

  console.warn('[scene-pipeline] All HuggingFace video models failed');
  return null;
}
import { generateDialogueAudio } from './kokoro-tts';
import {
  isSelfHostedConfigured,
  checkSelfHostedHealth,
  selfHostedGenerateVideo,
  selfHostedDownloadUrl,
  selfHostedHasAudio,
} from './self-hosted';

// -- Audio-capable model detection -------------------------------

/** Models that generate video WITH synchronized audio in a single pass */
const AUDIO_CAPABLE_MODELS = ['ltx-2.3', 'veo', 'seedance-2'] as const;
type AudioCapableModel = typeof AUDIO_CAPABLE_MODELS[number];

export function isAudioCapable(modelKey: string): boolean {
  return AUDIO_CAPABLE_MODELS.includes(modelKey as AudioCapableModel);
}

export function getAudioCapableModels(): FalModel[] {
  return AUDIO_CAPABLE_MODELS
    .map(key => FAL_VIDEO_MODELS[key])
    .filter(Boolean);
}

// -- Scene generation input/output types -------------------------

export interface SceneInput {
  /** Show title (must match SHOW_PROFILES key) */
  show: string;
  /** Art style - 'source-faithful' for 1:1 or any other style */
  artStyle: ArtStyleId;
  /** Scene description (setting, action, mood) */
  sceneDescription: string;
  /** Dialogue lines - characters speaking in the scene */
  dialogue: { character: string; line: string }[];
  /** Which characters appear (by name) */
  characters: string[];
  /** Video duration in seconds (default: based on dialogue length) */
  duration?: number;
  /** Aspect ratio (default: 16:9) */
  aspectRatio?: string;
  /** Which model to use (default: auto -- self-hosted first, then fal.ai) */
  model?: string;
  /** Optional seed for reproducibility */
  seed?: number;
  /** Force a specific provider: 'self-hosted' | 'pollinations' | 'fal' | 'auto' (default) */
  provider?: 'self-hosted' | 'pollinations' | 'fal' | 'auto';
}

export interface SceneResult {
  /** Whether generation succeeded */
  success: boolean;
  /** URL to the generated video (includes synced audio) */
  videoUrl?: string;
  /** URL to the audio track (if returned separately by the model) */
  audioUrl?: string;
  /** The model that was used */
  model: string;
  /** Whether audio is baked into the video */
  audioSynced: boolean;
  /** The full prompt that was sent to the model */
  prompt: string;
  /** Generation request ID for tracking */
  requestId?: string;
  /** Error message if failed */
  error?: string;
  /** RAG context injected from RAGflow (if available) */
  ragContext?: string;
  /** Which provider was used: 'self-hosted' | 'pollinations' | 'fal' */
  providerUsed?: string;
  /** Cost of this generation ($0 for self-hosted and pollinations) */
  cost?: number;
  /** Per-line dialogue audio (when video provider doesn't sync audio) */
  dialogueAudio?: {
    lines: {
      character: string;
      line: string;
      audioUrl: string;
      voice: string;
      duration: number;
    }[];
    totalDuration: number;
  };
}

// -- Duration estimation -----------------------------------------

/** Estimate scene duration based on dialogue length (~3 words/sec speaking rate) */
function estimateDuration(dialogue: { character: string; line: string }[]): number {
  if (!dialogue.length) return 5;  // Default 5 seconds for no-dialogue scenes

  const totalWords = dialogue.reduce((sum, d) => sum + d.line.split(/\s+/).length, 0);
  // ~3 words per second of speech + 0.5s pause between lines
  const speechDuration = (totalWords / 3) + (dialogue.length * 0.5);

  // Clamp between 3 and 16 seconds (Veo 3.1 max is ~16s)
  return Math.min(16, Math.max(3, Math.ceil(speechDuration)));
}

// -- Model selection ---------------------------------------------

/** Get the best model for the request, with fallback chain */
function selectModel(preferred?: string): { key: string; model: FalModel } {
  // If user specified a model and it exists, use it
  if (preferred && FAL_VIDEO_MODELS[preferred]) {
    return { key: preferred, model: FAL_VIDEO_MODELS[preferred] };
  }

  // Default: LTX 2.3 (open-source, cheapest, native audio sync)
  if (FAL_VIDEO_MODELS['ltx-2.3']) {
    return { key: 'ltx-2.3', model: FAL_VIDEO_MODELS['ltx-2.3'] };
  }

  // Fallback: Veo 3.1 (best quality audio-video sync)
  if (FAL_VIDEO_MODELS['veo']) {
    return { key: 'veo', model: FAL_VIDEO_MODELS['veo'] };
  }

  // Fallback: Seedance 2
  if (FAL_VIDEO_MODELS['seedance-2']) {
    return { key: 'seedance-2', model: FAL_VIDEO_MODELS['seedance-2'] };
  }

  // Last resort: first available video model
  const [key, model] = Object.entries(FAL_VIDEO_MODELS)[0];
  return { key, model };
}

// -- Self-hosted generation attempt ------------------------------

/**
 * Try generating via self-hosted GPU (LTX-2.3 or Wan 2.1).
 * Supports both local server (Option C) and RunPod serverless (Option A).
 * Returns null if self-hosted is not available or fails.
 */
async function trySelfHosted(
  prompt: string,
  duration: number,
  seed?: number,
  ragContext?: string
): Promise<SceneResult | null> {
  if (!isSelfHostedConfigured()) return null;

  // Check health first (cached, fast)
  const health = await checkSelfHostedHealth();
  if (!health || health.status !== 'ok' || !health.models.video) {
    console.log('[scene-pipeline] Self-hosted GPU not healthy or video model not loaded, skipping');
    return null;
  }

  const hasAudio = health.has_audio === true;
  const modelName = health.model_id || health.models.video || 'self-hosted';
  const isLTX = modelName.toLowerCase().includes('ltx');

  try {
    console.log(`[scene-pipeline] Trying self-hosted GPU (${modelName}, $0 cost)...`);
    const result = await selfHostedGenerateVideo({
      prompt,
      width: isLTX ? 768 : 512,
      height: isLTX ? 512 : 512,
      num_frames: isLTX ? Math.min(257, Math.max(24, duration * 24)) : Math.min(48, Math.max(16, duration * 8)),
      num_inference_steps: isLTX ? 30 : 25,
      fps: isLTX ? 24 : undefined,
      seed,
    });

    // Handle RunPod base64 response (convert to data URL)
    const videoUrl = result.video_base64
      ? `data:video/mp4;base64,${result.video_base64}`
      : result.download_url
        ? selfHostedDownloadUrl(result.download_url)
        : null;

    const audioUrl = result.audio_base64
      ? `data:audio/wav;base64,${result.audio_base64}`
      : result.audio_download_url
        ? selfHostedDownloadUrl(result.audio_download_url)
        : undefined;

    if (result.success && videoUrl) {
      return {
        success: true,
        videoUrl,
        audioUrl,
        model: result.model || modelName,
        audioSynced: hasAudio && (result.has_audio === true),
        prompt,
        ragContext: ragContext || undefined,
        providerUsed: 'self-hosted',
        cost: 0,
      };
    }

    console.log('[scene-pipeline] Self-hosted generation returned no video');
    return null;
  } catch (err) {
    console.warn('[scene-pipeline] Self-hosted failed, will fall back:', err);
    return null;
  }
}

// -- Main generation function ------------------------------------

/**
 * Generate a complete scene - video with synchronized audio - in a single pass.
 *
 * Fallback chain:
 *   1. Self-hosted GPU (Wan 2.1 on Colab) -- FREE
 *   2. Pollinations video (free, no key needed) -- FREE (no audio sync)
 *   3. fal.ai Veo 3.1 -- best quality + audio sync, paid
 *   4. fal.ai Seedance 2 -- fallback + audio sync, paid
 *
 * Override with input.provider: 'self-hosted' | 'pollinations' | 'fal' | 'auto'
 */
export async function generateScene(input: SceneInput): Promise<SceneResult> {
  const { show, artStyle, sceneDescription, dialogue, characters } = input;
  const provider = input.provider || 'auto';

  // Select fal.ai model (used if self-hosted not available)
  const { key: modelKey, model: selectedModel } = selectModel(input.model);
  const audioCapable = isAudioCapable(modelKey);

  // Estimate duration from dialogue if not specified
  const duration = input.duration || estimateDuration(dialogue);

  // Enrich scene description with RAG knowledge (if RAGflow is configured)
  let enrichedDescription = sceneDescription;
  let ragContext = '';
  if (isRagflowAvailable()) {
    try {
      const rag = await enrichScenePrompt(
        show.toLowerCase().replace(/\s+/g, '-'),
        show,
        sceneDescription,
        characters
      );
      enrichedDescription = rag.enrichedPrompt;
      ragContext = rag.ragContext;
    } catch (err) {
      // RAGflow is optional -- log and continue without it
      console.warn('[scene-pipeline] RAGflow enrichment failed, using base prompt:', err);
    }
  }

  // Build the full prompt with show style, character visuals, dialogue, and audio cues
  const prompt = buildScenePrompt({
    showTitle: show,
    artStyle,
    dialogue,
    sceneDescription: enrichedDescription,
    characters,
  });

  // -- Try self-hosted first (FREE) ----------------------------
  if (provider === 'self-hosted' || provider === 'auto') {
    const selfHostedResult = await trySelfHosted(prompt, duration, input.seed, ragContext);
    if (selfHostedResult) {
      console.log('[scene-pipeline] Generated via self-hosted GPU ($0 cost)');
      return selfHostedResult;
    }
    if (provider === 'self-hosted') {
      return {
        success: false,
        model: 'wan-2.1-self-hosted',
        audioSynced: false,
        prompt,
        error: 'Self-hosted GPU is not available. Check SELF_HOSTED_GPU_URL or start the Colab notebook.',
        providerUsed: 'self-hosted',
        cost: 0,
      };
    }
  }

  // -- Try Pollinations video + Kokoro TTS (FREE, $0) ----------
  if (provider === 'pollinations' || provider === 'auto') {
    try {
      console.log('[scene-pipeline] Trying Pollinations video ($0 cost)...');
      const polResult = await pollinationsGenerateVideo(prompt);
      if (polResult.url) {
        console.log('[scene-pipeline] Video generated via Pollinations ($0 cost)');

        // Generate character dialogue audio via Kokoro TTS (free)
        let dialogueResult: SceneResult['dialogueAudio'] = undefined;
        let mainAudioUrl: string | undefined = undefined;
        if (dialogue.length > 0) {
          try {
            console.log(`[scene-pipeline] Generating TTS audio for ${dialogue.length} dialogue lines via Kokoro...`);
            const ttsResult = await generateDialogueAudio(dialogue);
            if (ttsResult.lines.some(l => l.audioUrl)) {
              dialogueResult = {
                lines: ttsResult.lines,
                totalDuration: ttsResult.totalDuration,
              };
              mainAudioUrl = ttsResult.audioUrl;
              console.log(`[scene-pipeline] Kokoro TTS: ${ttsResult.lines.filter(l => l.audioUrl).length}/${dialogue.length} lines generated (${ttsResult.totalDuration.toFixed(1)}s total)`);
            }
          } catch (ttsErr) {
            // TTS is optional — video still works without it
            console.warn('[scene-pipeline] Kokoro TTS failed (video still usable):', ttsErr);
          }
        }

        return {
          success: true,
          videoUrl: polResult.url,
          audioUrl: mainAudioUrl,
          model: 'pollinations',
          audioSynced: false, // Audio is separate, not baked into video
          prompt,
          ragContext: ragContext || undefined,
          providerUsed: 'pollinations',
          cost: 0,
          dialogueAudio: dialogueResult,
        };
      }
    } catch (polErr) {
      console.warn('[scene-pipeline] Pollinations video failed:', polErr);
    }
    if (provider === 'pollinations') {
      return {
        success: false,
        model: 'pollinations',
        audioSynced: false,
        prompt,
        error: 'Pollinations video generation failed. The service may be temporarily unavailable.',
        providerUsed: 'pollinations',
        cost: 0,
      };
    }
  }

  // -- Try HuggingFace free inference (Wan 2.1 1.3B, $0 with HF_TOKEN) ---
  if (provider === 'auto') {
    const hfResult = await hfFreeVideoGenerate(prompt);
    if (hfResult?.url) {
      // Generate dialogue audio via Kokoro TTS
      let dialogueResult: SceneResult['dialogueAudio'] = undefined;
      let mainAudioUrl: string | undefined = undefined;
      if (dialogue.length > 0) {
        try {
          const ttsResult = await generateDialogueAudio(dialogue);
          if (ttsResult.lines.some(l => l.audioUrl)) {
            dialogueResult = { lines: ttsResult.lines, totalDuration: ttsResult.totalDuration };
            mainAudioUrl = ttsResult.audioUrl;
          }
        } catch {
          // TTS optional
        }
      }

      return {
        success: true,
        videoUrl: hfResult.url,
        audioUrl: mainAudioUrl,
        model: 'wan2.1-1.3b',
        audioSynced: false,
        prompt,
        ragContext: ragContext || undefined,
        providerUsed: 'huggingface',
        cost: 0,
        dialogueAudio: dialogueResult,
      };
    }
  }

  // -- Fall back to fal.ai (paid, best quality + audio sync) ---
  try {
    // Generate via fal.ai - audio-capable models return video with baked-in audio
    const result = await falGenerate(selectedModel.id, {
      prompt,
      duration: String(duration),
      aspect_ratio: input.aspectRatio || '16:9',
      seed: input.seed,
    });

    if (!result.video?.url) {
      // If primary model failed or returned no video, try next audio-capable model
      const fallbackKey = AUDIO_CAPABLE_MODELS.find(k => k !== modelKey && FAL_VIDEO_MODELS[k]);
      if (fallbackKey && FAL_VIDEO_MODELS[fallbackKey]) {
        console.log(`[scene-pipeline] ${modelKey} returned no video, falling back to ${fallbackKey}`);
        const fallback = await falGenerate(FAL_VIDEO_MODELS[fallbackKey].id, {
          prompt,
          duration: String(duration),
          aspect_ratio: input.aspectRatio || '16:9',
          seed: input.seed,
        });

        if (fallback.video?.url) {
          return {
            success: true,
            videoUrl: fallback.video.url,
            audioUrl: (fallback as any).audio?.url,
            model: fallbackKey,
            audioSynced: true,
            prompt,
            requestId: fallback.request_id,
            ragContext: ragContext || undefined,
            providerUsed: 'fal',
          };
        }
      }

      return {
        success: false,
        model: modelKey,
        audioSynced: false,
        prompt,
        error: 'Model returned no video output',
        providerUsed: 'fal',
      };
    }

    return {
      success: true,
      videoUrl: result.video.url,
      audioUrl: (result as any).audio?.url,
      model: modelKey,
      audioSynced: audioCapable,
      prompt,
      requestId: result.request_id,
      ragContext: ragContext || undefined,
      providerUsed: 'fal',
    };

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    // Auto-fallback: try next audio-capable model in the chain
    const fallbackKey = AUDIO_CAPABLE_MODELS.find(k => k !== modelKey && FAL_VIDEO_MODELS[k]);
    if (fallbackKey && FAL_VIDEO_MODELS[fallbackKey]) {
      try {
        console.log(`[scene-pipeline] ${modelKey} failed (${errorMsg}), falling back to ${fallbackKey}`);
        const fallback = await falGenerate(FAL_VIDEO_MODELS[fallbackKey].id, {
          prompt,
          duration: String(duration),
          aspect_ratio: input.aspectRatio || '16:9',
          seed: input.seed,
        });

        if (fallback.video?.url) {
          return {
            success: true,
            videoUrl: fallback.video.url,
            audioUrl: (fallback as any).audio?.url,
            model: fallbackKey,
            audioSynced: true,
            prompt,
            requestId: fallback.request_id,
            ragContext: ragContext || undefined,
            providerUsed: 'fal',
          };
        }
      } catch (fallbackErr) {
        return {
          success: false,
          model: modelKey,
          audioSynced: false,
          prompt,
          error: `All providers failed. Self-hosted: unavailable. Pollinations: unavailable. HuggingFace: ${process.env.HF_TOKEN ? 'unavailable' : 'no HF_TOKEN set'}. ${modelKey}: ${errorMsg}. ${fallbackKey}: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`,
          providerUsed: 'fal',
        };
      }
    }

    return {
      success: false,
      model: modelKey,
      audioSynced: false,
      prompt,
      error: errorMsg,
      providerUsed: 'fal',
    };
  }
}
