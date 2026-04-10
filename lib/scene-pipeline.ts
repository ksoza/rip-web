// lib/scene-pipeline.ts
// Unified scene generation pipeline - video and audio generated together
// Uses Veo 3.1 (primary) or Seedance 2 (fallback) for synchronized output

import { falGenerate, FAL_VIDEO_MODELS, type FalModel } from './fal';
import { buildScenePrompt, getStylePrompt, type ArtStyleId } from './shows';

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
  /** Which model to use (default: veo for best sync) */
  model?: string;
  /** Optional seed for reproducibility */
  seed?: number;
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

// -- Main generation function ------------------------------------

/**
 * Generate a complete scene - video with synchronized audio - in a single pass.
 * 
 * This is the unified pipeline:
 * 1. Builds a rich prompt from show profile + art style + dialogue + character voice descriptions
 * 2. Sends to Veo 3.1 (or Seedance 2 fallback) which generates video AND audio together
 * 3. Returns a single video URL with everything in sync
 * 
 * No separate audio step. No bolted-on lip sync. One model, one output.
 */
export async function generateScene(input: SceneInput): Promise<SceneResult> {
  const { show, artStyle, sceneDescription, dialogue, characters } = input;
  
  // Select model
  const { key: modelKey, model: selectedModel } = selectModel(input.model);
  const audioCapable = isAudioCapable(modelKey);
  
  // Estimate duration from dialogue if not specified
  const duration = input.duration || estimateDuration(dialogue);
  
  // Build the full prompt with show style, character visuals, dialogue, and audio cues
  const prompt = buildScenePrompt({
    showTitle: show,
    artStyle,
    dialogue,
    sceneDescription,
    characters,
  });

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
          };
        }
      }
      
      return {
        success: false,
        model: modelKey,
        audioSynced: false,
        prompt,
        error: 'Model returned no video output',
      };
    }
    
    return {
      success: true,
      videoUrl: result.video.url,
      // Some models may return audio separately - capture it if present
      audioUrl: (result as any).audio?.url,
      model: modelKey,
      audioSynced: audioCapable,
      prompt,
      requestId: result.request_id,
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
          };
        }
      } catch (fallbackErr) {
        // Both models failed
        return {
          success: false,
          model: modelKey,
          audioSynced: false,
          prompt,
          error: `Both Veo 3.1 and Seedance 2 failed. Veo: ${errorMsg}. Seedance: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`,
        };
      }
    }
    
    return {
      success: false,
      model: modelKey,
      audioSynced: false,
      prompt,
      error: errorMsg,
    };
  }
}
