// lib/scene-pipeline.ts
// Unified scene generation pipeline — IMAGE → VIDEO → AUDIO
//
// Pipeline:
//   1. Generate scene IMAGE from description (Pollinations FLUX, free)
//   2. Animate image into VIDEO (HuggingFace SVD i2v / fal.ai / self-hosted)
//   3. Generate dialogue AUDIO via TTS (Kokoro, free)
//
// The image is generated first so video accurately depicts the described scene.
// Fallback video chain: HF SVD i2v → self-hosted GPU → fal.ai queue

import { falGenerate, falSubmitToQueue, falCheckStatus, FAL_VIDEO_MODELS, type FalModel, type FalVideoInput, type FalQueueJob, type FalResult } from './fal';
import { buildScenePrompt, getStylePrompt, SHOW_PROFILES, type ArtStyleId } from './shows';
import { enrichScenePrompt, isRagflowAvailable } from './ragflow';
import { pollinationsGenerateImage, type PollinationsImageOptions } from './pollinations';
// Bedrock + Wan2.1 removed per user request — using IMAGE→VIDEO→AUDIO pipeline instead

// ── HuggingFace free inference for video ────────────────────────
// Tries multiple HF models that support inference API. $0 with HF_TOKEN.
// Falls through model list until one succeeds.
const HF_VIDEO_MODELS = [
  { id: 'Wan-AI/Wan2.1-T2V-1.3B', label: 'Wan 2.1 1.3B' },
  { id: 'genmo/mochi-1-preview', label: 'Mochi' },
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
  /** Pre-generated scene image URL (skip step 1 if provided) */
  sceneImageUrl?: string;
}

export interface SceneResult {
  /** Whether generation succeeded */
  success: boolean;
  /** URL to the scene still image (generated in step 1) */
  sceneImageUrl?: string;
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
  /** Async queue info — when present, client must poll for the result */
  falJob?: {
    requestId: string;
    statusUrl: string;
    responseUrl: string;
    modelId: string;
    modelKey: string;
    audioCapable: boolean;
  };
  /** Bedrock async job info — when present, client must poll for the result */
  bedrockJob?: {
    invocationArn: string;
    s3OutputPrefix: string;
    modelId: string;
  };
}

/**
 * Submit a scene for generation but return immediately (non-blocking).
 * Free providers (self-hosted, pollinations, huggingface) are tried synchronously first.
 * If those fail, the job is submitted to fal.ai's queue and job info is returned
 * for client-side polling via the /api/generate/scene/poll endpoint.
 */
export async function submitScene(input: SceneInput): Promise<SceneResult> {
  // Run the synchronous parts: prompt building + free providers
  // Then submit to fal.ai queue without waiting for the result
  return generateScene(input, { asyncFal: true });
}

/**
 * Check the status of a queued fal.ai scene job.
 * Called by the poll endpoint.
 */
export async function checkSceneJob(
  statusUrl: string,
  responseUrl: string,
  modelKey: string,
  audioCapable: boolean,
  prompt: string,
): Promise<SceneResult> {
  const check = await falCheckStatus(statusUrl, responseUrl);

  if (check.status === 'COMPLETED' && check.result) {
    if (!check.result.video?.url) {
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
      videoUrl: check.result.video.url,
      audioUrl: check.result.audio?.url,
      model: modelKey,
      audioSynced: audioCapable,
      prompt,
      requestId: check.result.request_id,
      providerUsed: 'fal',
    };
  }

  if (check.status === 'FAILED') {
    return {
      success: false,
      model: modelKey,
      audioSynced: false,
      prompt,
      error: check.error || 'fal.ai generation failed',
      providerUsed: 'fal',
    };
  }

  // Still processing — return a "pending" result
  return {
    success: false,
    model: modelKey,
    audioSynced: false,
    prompt,
    error: '__PENDING__',
    providerUsed: 'fal',
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

// -- Duration formatting per model --------------------------------

/** Valid durations for Veo 3.1 — API only accepts these exact strings */
const VEO_VALID_DURATIONS = ['4s', '6s', '8s'] as const;

/**
 * Format duration for fal.ai models. Each model has different requirements:
 *   - Veo 3.1: only accepts '4s', '6s', or '8s' (string with 's' suffix)
 *   - LTX 2.3: accepts number of seconds (omit — uses model default)
 *   - Seedance, Kling, etc.: accept numeric seconds as string
 */
function formatDurationForModel(modelKey: string, durationSec: number): string | number | undefined {
  if (modelKey === 'veo') {
    // Snap to nearest valid Veo duration
    if (durationSec <= 5) return '4s';
    if (durationSec <= 7) return '6s';
    return '8s';
  }
  if (modelKey === 'ltx-2.3' || modelKey === 'ltx-2.3-audio') {
    // LTX-2.3 works best without explicit duration (uses its default)
    // If we do send it, it expects a number
    return undefined;
  }
  // Other models: numeric string
  return String(durationSec);
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

// -- Main generation function ------------------------------------

/**
 * Generate a complete scene: IMAGE → VIDEO → AUDIO
 *
 * Pipeline:
 *   Step 1: Generate scene IMAGE from description (Pollinations FLUX, free)
 *   Step 2: Generate VIDEO — prefers image-to-video when image is available
 *           Fallback chain: HuggingFace i2v → fal.ai queue (if key set)
 *   Step 3: Generate dialogue AUDIO via Kokoro TTS (free)
 *
 * The scene image is ALWAYS generated first so the video matches the description.
 */
export async function generateScene(input: SceneInput, opts?: { asyncFal?: boolean }): Promise<SceneResult> {
  const { show, artStyle, sceneDescription, dialogue, characters } = input;
  const provider = input.provider || 'auto';

  // Select fal.ai model (used if free providers don't work)
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

  // ══════════════════════════════════════════════════════════════
  // STEP 1: Generate scene IMAGE (Pollinations FLUX, free)
  // ══════════════════════════════════════════════════════════════
  let sceneImageUrl = input.sceneImageUrl || '';
  if (!sceneImageUrl && sceneDescription) {
    try {
      console.log('[scene-pipeline] Step 1: Generating scene image via Pollinations FLUX...');
      const showProfile = SHOW_PROFILES[show];
      const visualStyle = showProfile?.visualStyle || '';
      const charNames = characters.join(', ');

      // Build image prompt: show style + scene description + characters
      const imagePrompt = [
        visualStyle ? `${show} visual style, ${visualStyle}` : `Scene from ${show}`,
        enrichedDescription || sceneDescription,
        charNames ? `Characters: ${charNames}` : '',
        'cinematic composition, high detail, dramatic lighting',
      ].filter(Boolean).join('. ');

      const imgResult = await pollinationsGenerateImage(imagePrompt, {
        width: 1280,
        height: 720,
        model: 'flux',
        nologo: true,
      });
      sceneImageUrl = imgResult.url;
      console.log(`[scene-pipeline] ✓ Scene image generated`);
    } catch (imgErr) {
      console.warn('[scene-pipeline] Scene image generation failed (continuing without):', imgErr);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // STEP 2: Generate VIDEO (image-to-video preferred, text-to-video fallback)
  // ══════════════════════════════════════════════════════════════
  console.log(`[scene-pipeline] Step 2: Generating video (image available: ${!!sceneImageUrl})...`);

  // -- In async mode, skip slow free providers (they'd timeout Lambda) --
  const skipFreeProviders = opts?.asyncFal && provider === 'auto';

  // -- 2a. Try HuggingFace image-to-video (SVD, free with HF_TOKEN) --
  if (!skipFreeProviders && sceneImageUrl && process.env.HF_TOKEN && provider !== 'fal') {
    try {
      console.log('[scene-pipeline] Trying HuggingFace SVD image-to-video ($0 cost)...');
      const svdResult = await hfImageToVideo(sceneImageUrl);
      if (svdResult?.url) {
        console.log('[scene-pipeline] ✓ Video generated via HuggingFace SVD');

        // Step 3: TTS audio
        const { dialogueResult, mainAudioUrl } = await generateTTSIfNeeded(dialogue);

        return {
          success: true,
          sceneImageUrl,
          videoUrl: svdResult.url,
          audioUrl: mainAudioUrl,
          model: 'svd-i2v',
          audioSynced: false,
          prompt,
          ragContext: ragContext || undefined,
          providerUsed: 'huggingface',
          cost: 0,
          dialogueAudio: dialogueResult,
        };
      }
    } catch (svdErr) {
      console.warn('[scene-pipeline] HuggingFace SVD failed:', svdErr);
    }
  }

  // -- 2b. Try HuggingFace text-to-video free models --
  if (!skipFreeProviders && provider !== 'fal') {
    const hfResult = await hfFreeVideoGenerate(prompt);
    if (hfResult?.url) {
      console.log('[scene-pipeline] ✓ Video generated via HuggingFace free inference');

      const { dialogueResult, mainAudioUrl } = await generateTTSIfNeeded(dialogue);

      return {
        success: true,
        sceneImageUrl: sceneImageUrl || undefined,
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

  // -- 2c. Fall back to fal.ai (paid, best quality + audio sync) ---
  let errorMsg = '';
  try {
    const falInput: FalVideoInput = {
      prompt,
      aspect_ratio: input.aspectRatio || '16:9',
      seed: input.seed,
    };

    // Pass scene image for image-to-video if available and model supports it
    if (sceneImageUrl) {
      falInput.image_url = sceneImageUrl;
    }

    const formattedDuration = formatDurationForModel(modelKey, duration);
    if (formattedDuration !== undefined) {
      falInput.duration = formattedDuration;
    }

    console.log(`[scene-pipeline] Trying fal.ai ${modelKey} (${selectedModel.id}), async=${!!opts?.asyncFal}...`);

    // ASYNC MODE: Submit to queue and return immediately for client-side polling
    if (opts?.asyncFal) {
      const submitResult = await falSubmitToQueue(selectedModel.id, falInput);

      // If it was a sync response (instant result), return it directly
      if ('video' in submitResult || 'images' in submitResult) {
        const syncResult = submitResult as FalResult;
        if (syncResult.video?.url) {
          const { dialogueResult, mainAudioUrl } = await generateTTSIfNeeded(dialogue);
          return {
            success: true,
            sceneImageUrl: sceneImageUrl || undefined,
            videoUrl: syncResult.video.url,
            audioUrl: syncResult.audio?.url || mainAudioUrl,
            model: modelKey,
            audioSynced: audioCapable,
            prompt,
            requestId: syncResult.request_id,
            ragContext: ragContext || undefined,
            providerUsed: 'fal',
            dialogueAudio: dialogueResult,
          };
        }
      }

      // Queue response — return job info for client to poll
      const job = submitResult as FalQueueJob;
      return {
        success: false, // Not done yet
        sceneImageUrl: sceneImageUrl || undefined,
        model: modelKey,
        audioSynced: false,
        prompt,
        error: '__QUEUED__',
        providerUsed: 'fal',
        requestId: job.requestId,
        falJob: {
          requestId: job.requestId,
          statusUrl: job.statusUrl,
          responseUrl: job.responseUrl,
          modelId: job.modelId,
          modelKey,
          audioCapable,
        },
      };
    }

    // SYNC MODE: Submit and poll until done
    const result = await falGenerate(selectedModel.id, falInput);

    if (result.video?.url) {
      const { dialogueResult, mainAudioUrl } = await generateTTSIfNeeded(dialogue);
      return {
        success: true,
        sceneImageUrl: sceneImageUrl || undefined,
        videoUrl: result.video.url,
        audioUrl: result.audio?.url || mainAudioUrl,
        model: modelKey,
        audioSynced: audioCapable,
        prompt,
        requestId: result.request_id,
        ragContext: ragContext || undefined,
        providerUsed: 'fal',
        dialogueAudio: dialogueResult,
      };
    }

    // Primary model failed — try fallback audio-capable model
    const fallbackKey = AUDIO_CAPABLE_MODELS.find(k => k !== modelKey && FAL_VIDEO_MODELS[k]);
    if (fallbackKey && FAL_VIDEO_MODELS[fallbackKey]) {
      console.log(`[scene-pipeline] ${modelKey} returned no video, falling back to ${fallbackKey}`);
      const fbInput: FalVideoInput = {
        prompt,
        aspect_ratio: input.aspectRatio || '16:9',
        seed: input.seed,
      };
      if (sceneImageUrl) fbInput.image_url = sceneImageUrl;
      const fbDuration = formatDurationForModel(fallbackKey, duration);
      if (fbDuration !== undefined) fbInput.duration = fbDuration;

      const fallback = await falGenerate(FAL_VIDEO_MODELS[fallbackKey].id, fbInput);
      if (fallback.video?.url) {
        const { dialogueResult, mainAudioUrl } = await generateTTSIfNeeded(dialogue);
        return {
          success: true,
          sceneImageUrl: sceneImageUrl || undefined,
          videoUrl: fallback.video.url,
          audioUrl: (fallback as any).audio?.url || mainAudioUrl,
          model: fallbackKey,
          audioSynced: isAudioCapable(fallbackKey),
          prompt,
          requestId: fallback.request_id,
          ragContext: ragContext || undefined,
          providerUsed: 'fal',
          dialogueAudio: dialogueResult,
        };
      }
    }

    errorMsg = `${modelKey} returned no video data`;
  } catch (falErr: any) {
    errorMsg = falErr instanceof Error ? falErr.message : String(falErr);
    console.error(`[scene-pipeline] fal.ai ${modelKey} error:`, errorMsg);

    // Try a different fal model on failure
    const fallbackKey = AUDIO_CAPABLE_MODELS.find(k => k !== modelKey && FAL_VIDEO_MODELS[k]);
    if (fallbackKey && FAL_VIDEO_MODELS[fallbackKey]) {
      try {
        console.log(`[scene-pipeline] Trying fallback fal.ai model: ${fallbackKey}`);
        const fbInput: FalVideoInput = {
          prompt,
          aspect_ratio: input.aspectRatio || '16:9',
          seed: input.seed,
        };
        if (sceneImageUrl) fbInput.image_url = sceneImageUrl;
        const fbDuration = formatDurationForModel(fallbackKey, duration);
        if (fbDuration !== undefined) fbInput.duration = fbDuration;

        if (opts?.asyncFal) {
          const job = await falSubmitToQueue(FAL_VIDEO_MODELS[fallbackKey].id, fbInput) as FalQueueJob;
          return {
            success: false,
            sceneImageUrl: sceneImageUrl || undefined,
            model: fallbackKey,
            audioSynced: false,
            prompt,
            error: '__QUEUED__',
            providerUsed: 'fal',
            requestId: job.requestId,
            falJob: {
              requestId: job.requestId,
              statusUrl: job.statusUrl,
              responseUrl: job.responseUrl,
              modelId: job.modelId,
              modelKey: fallbackKey,
              audioCapable: isAudioCapable(fallbackKey),
            },
          };
        }

        const fallback = await falGenerate(FAL_VIDEO_MODELS[fallbackKey].id, fbInput);
        if (fallback.video?.url) {
          const { dialogueResult, mainAudioUrl } = await generateTTSIfNeeded(dialogue);
          return {
            success: true,
            sceneImageUrl: sceneImageUrl || undefined,
            videoUrl: fallback.video.url,
            audioUrl: (fallback as any).audio?.url || mainAudioUrl,
            model: fallbackKey,
            audioSynced: isAudioCapable(fallbackKey),
            prompt,
            requestId: fallback.request_id,
            ragContext: ragContext || undefined,
            providerUsed: 'fal',
            dialogueAudio: dialogueResult,
          };
        }
      } catch (fallbackErr) {
        console.error(`[scene-pipeline] Fallback ${fallbackKey} also failed:`, fallbackErr);
      }
    }
  }

  // All providers failed
  return {
    success: false,
    sceneImageUrl: sceneImageUrl || undefined,
    model: modelKey,
    audioSynced: false,
    prompt,
    error: `All video providers failed. HuggingFace: ${process.env.HF_TOKEN ? 'unavailable' : 'no HF_TOKEN set'}. fal.ai: ${errorMsg || 'not available'}`,
    providerUsed: 'fal',
  };
}

// ── HuggingFace Stable Video Diffusion — image-to-video (free) ──
async function hfImageToVideo(imageUrl: string): Promise<{ url: string } | null> {
  const token = process.env.HF_TOKEN;
  if (!token) return null;

  // Use HuggingFace Inference API for Stable Video Diffusion
  // SVD takes an image and generates a short video from it
  const models = [
    'stabilityai/stable-video-diffusion-img2vid-xt',
    'stabilityai/stable-video-diffusion-img2vid',
  ];

  for (const model of models) {
    try {
      console.log(`[scene-pipeline] Trying HF i2v model: ${model}`);

      // First, download the image as bytes
      const imgRes = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(30_000),
      });
      if (!imgRes.ok) {
        console.warn(`[scene-pipeline] Failed to download scene image: ${imgRes.status}`);
        continue;
      }
      const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

      // Send to HuggingFace Inference API
      const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
        },
        body: imgBuffer,
        signal: AbortSignal.timeout(120_000),
      });

      if (res.status === 503) {
        // Model loading — could wait, but let's move on
        console.log(`[scene-pipeline] HF model ${model} is loading, skipping`);
        continue;
      }

      if (!res.ok) {
        console.warn(`[scene-pipeline] HF i2v ${model} error: ${res.status} ${await res.text().catch(() => '')}`);
        continue;
      }

      // Response is video bytes — convert to data URL
      const videoBuffer = Buffer.from(await res.arrayBuffer());
      if (videoBuffer.length < 1000) {
        console.warn(`[scene-pipeline] HF i2v returned tiny response (${videoBuffer.length} bytes), skipping`);
        continue;
      }

      const videoBase64 = videoBuffer.toString('base64');
      const videoUrl = `data:video/mp4;base64,${videoBase64}`;
      console.log(`[scene-pipeline] ✓ HF i2v ${model}: ${videoBuffer.length} bytes`);
      return { url: videoUrl };
    } catch (err) {
      console.warn(`[scene-pipeline] HF i2v ${model} failed:`, err);
    }
  }
  return null;
}

// ── Helper: generate TTS audio if dialogue exists ──────────────
async function generateTTSIfNeeded(dialogue: { character: string; line: string }[]): Promise<{
  dialogueResult: SceneResult['dialogueAudio'];
  mainAudioUrl: string | undefined;
}> {
  if (dialogue.length === 0) {
    return { dialogueResult: undefined, mainAudioUrl: undefined };
  }

  try {
    console.log(`[scene-pipeline] Step 3: Generating TTS audio for ${dialogue.length} dialogue lines via Kokoro...`);
    const ttsResult = await generateDialogueAudio(dialogue);
    if (ttsResult.lines.some(l => l.audioUrl)) {
      console.log(`[scene-pipeline] ✓ Kokoro TTS: ${ttsResult.lines.filter(l => l.audioUrl).length}/${dialogue.length} lines (${ttsResult.totalDuration.toFixed(1)}s)`);
      return {
        dialogueResult: {
          lines: ttsResult.lines,
          totalDuration: ttsResult.totalDuration,
        },
        mainAudioUrl: ttsResult.audioUrl,
      };
    }
  } catch (ttsErr) {
    console.warn('[scene-pipeline] Kokoro TTS failed (video still usable):', ttsErr);
  }

  return { dialogueResult: undefined, mainAudioUrl: undefined };
}
