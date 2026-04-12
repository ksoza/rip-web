// lib/scene-pipeline.ts
// Unified scene generation pipeline - video and audio generated together
//
// Fallback chain (lowest cost first):
//   1. Self-hosted GPU (Wan 2.1 on Colab/Kaggle) -- $0.00
//   2. fal.ai (Veo 3.1 / Seedance 2) -- paid, best quality
//
// Self-hosted: Wan 2.1 via free Google Colab T4 or Kaggle P100
// fal.ai: Veo 3.1 (primary) or Seedance 2 (fallback) for synchronized output

import { falGenerate, FAL_VIDEO_MODELS, type FalModel } from './fal';
import { buildScenePrompt, getStylePrompt, type ArtStyleId } from './shows';
import { enrichScenePrompt, isRagflowAvailable } from './ragflow';
import {
  isSelfHostedConfigured,
  checkSelfHostedHealth,
  selfHostedGenerateVideo,
  selfHostedDownloadUrl,
} from './self-hosted';

// -- Audio-capable model detection -------------------------------

/** Models that generate video WITH synchronized audio in a single pass */
const AUDIO_CAPABLE_MODELS = ['veo', 'seedance-2'] as const;
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
  /** Force a specific provider: 'self-hosted' | 'fal' | 'auto' (default) */
  provider?: 'self-hosted' | 'fal' | 'auto';
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
  /** Which provider was used: 'self-hosted' | 'fal' */
  providerUsed?: string;
  /** Cost of this generation ($0 for self-hosted) */
  cost?: number;
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

  // Default: Veo 3.1 (best audio-video sync)
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
 * Try generating via self-hosted GPU (Wan 2.1 on Colab/Kaggle).
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

  try {
    console.log('[scene-pipeline] Trying self-hosted GPU (Wan 2.1, $0 cost)...');
    const result = await selfHostedGenerateVideo({
      prompt,
      width: 512,
      height: 512,
      num_frames: Math.min(48, Math.max(16, duration * 8)),
      num_inference_steps: 25,
      seed,
    });

    if (result.success && result.download_url) {
      return {
        success: true,
        videoUrl: selfHostedDownloadUrl(result.download_url),
        model: result.model || 'wan-2.1-self-hosted',
        audioSynced: false, // Wan 2.1 does not generate audio
        prompt,
        ragContext: ragContext || undefined,
        providerUsed: 'self-hosted',
        cost: 0,
      };
    }

    console.log('[scene-pipeline] Self-hosted generation returned no video');
    return null;
  } catch (err) {
    console.warn('[scene-pipeline] Self-hosted failed, will fall back to fal.ai:', err);
    return null;
  }
}

// -- Main generation function ------------------------------------

/**
 * Generate a complete scene - video with synchronized audio - in a single pass.
 *
 * Fallback chain:
 *   1. Self-hosted GPU (Wan 2.1 on Colab) -- FREE
 *   2. fal.ai Veo 3.1 -- best quality, paid
 *   3. fal.ai Seedance 2 -- fallback, paid
 *
 * Override with input.provider: 'self-hosted' | 'fal' | 'auto'
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

  // -- Fall back to fal.ai (paid) ------------------------------
  try {
    // Generate via fal.ai - audio-capable models return video with baked-in audio
    const result = await falGenerate(selectedModel.id, {
      prompt,
      duration: String(duration),
      aspect_ratio: input.aspectRatio || '16:9',
      seed: input.seed,
    });

    if (!result.video?.url) {
      // If primary model failed or returned no video, try fallback
      if (modelKey === 'veo' && FAL_VIDEO_MODELS['seedance-2']) {
        console.log('[scene-pipeline] Veo 3.1 returned no video, falling back to Seedance 2');
        const fallback = await falGenerate(FAL_VIDEO_MODELS['seedance-2'].id, {
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
            model: 'seedance-2',
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

    // Auto-fallback: if primary model fails, try the other audio-capable model
    if (modelKey === 'veo' && FAL_VIDEO_MODELS['seedance-2']) {
      try {
        console.log(`[scene-pipeline] Veo 3.1 failed (${errorMsg}), falling back to Seedance 2`);
        const fallback = await falGenerate(FAL_VIDEO_MODELS['seedance-2'].id, {
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
            model: 'seedance-2',
            audioSynced: true,
            prompt,
            requestId: fallback.request_id,
            ragContext: ragContext || undefined,
            providerUsed: 'fal',
          };
        }
      } catch (fallbackErr) {
        // Both models failed
        return {
          success: false,
          model: modelKey,
          audioSynced: false,
          prompt,
          error: `All providers failed. Self-hosted: unavailable. Veo: ${errorMsg}. Seedance: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`,
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
