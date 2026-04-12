// lib/voxcpm.ts
// VoxCPM2 - Self-hosted TTS with Voice Design + Voice Cloning
// 2B params, 30 languages, ~8GB VRAM, RTF ~0.13 on RTX 4090
// Supports: self-hosted Nano-vLLM server, HuggingFace Inference API
//
// Voice Design: describe a voice in text -> generates it (no sample needed)
// Voice Cloning: feed 5-sec reference audio -> speaks as that character
// Both modes keep character voices consistent across episodes

// -- Configuration ------------------------------------------------

/** Self-hosted VoxCPM Nano-vLLM server URL (primary) */
const VOXCPM_SERVER_URL = process.env.VOXCPM_API_URL || '';

/** HuggingFace Inference API (fallback) */
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY || '';
const HF_MODEL = 'openbmb/VoxCPM2';
const HF_INFERENCE_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

/** Generation defaults */
const DEFAULT_CFG = 2.0;
const DEFAULT_STEPS = 10;
const DEFAULT_SAMPLE_RATE = 48000;

// -- Types --------------------------------------------------------

export interface VoxCPMConfig {
  /** Voice description for Voice Design mode */
  voiceDesc?: string;
  /** Reference audio URL for Voice Cloning mode */
  referenceAudioUrl?: string;
  /** Reference audio transcript (improves cloning quality) */
  referenceTranscript?: string;
  /** Style control text (for Controllable Cloning) */
  styleControl?: string;
  /** CFG value (creativity vs accuracy, default 2.0) */
  cfgValue?: number;
  /** Inference timesteps (quality vs speed, default 10) */
  inferenceSteps?: number;
  /** Temperature (randomness, default 0.3 for consistency) */
  temperature?: number;
}

export interface VoxCPMResult {
  success: boolean;
  /** Base64-encoded audio data (WAV format) */
  audioBase64?: string;
  /** Data URL for direct playback */
  audioUrl?: string;
  /** Audio duration in seconds */
  duration?: number;
  /** Sample rate */
  sampleRate?: number;
  /** Which backend was used */
  backend: 'nano-vllm' | 'huggingface' | 'none';
  /** Error message if failed */
  error?: string;
}

export interface CharacterVoiceProfile {
  characterId: string;
  characterName: string;
  showId: string;
  /** VoxCPM voice design prompt (built from voiceDesc) */
  voiceDesignPrompt: string;
  /** Optional: URL to reference audio clip for cloning */
  referenceAudioUrl?: string;
  /** Optional: transcript of the reference audio */
  referenceTranscript?: string;
  /** Style modifiers */
  styleControl?: string;
  /** Fixed seed for voice consistency across generations */
  voiceSeed?: number;
}

// -- Backend detection --------------------------------------------

export function isVoxCPMAvailable(): boolean {
  return !!(VOXCPM_SERVER_URL || HF_API_KEY);
}

export function getVoxCPMBackend(): 'nano-vllm' | 'huggingface' | 'none' {
  if (VOXCPM_SERVER_URL) return 'nano-vllm';
  if (HF_API_KEY) return 'huggingface';
  return 'none';
}

export function getVoxCPMStatus(): {
  available: boolean;
  backend: string;
  serverUrl?: string;
} {
  const backend = getVoxCPMBackend();
  return {
    available: backend !== 'none',
    backend,
    serverUrl: VOXCPM_SERVER_URL || undefined,
  };
}

// -- Voice Design prompt builder ----------------------------------

/**
 * Build a VoxCPM voice design prompt from a character's voiceDesc.
 * Format: "(description)The text to speak."
 * VoxCPM reads the parenthesized description and generates a matching voice.
 */
export function buildVoiceDesignPrompt(voiceDesc: string): string {
  // Clean up the description for VoxCPM's format
  // Remove quotes, trim, ensure it's a good voice description
  const cleaned = voiceDesc
    .replace(/"/g, '')
    .replace(/'/g, '')
    .trim();
  return cleaned;
}

/**
 * Build the full VoxCPM input text with voice design prefix.
 * e.g., "(deep gravelly voice, calm authority)Say my name."
 */
function buildDesignInput(text: string, voiceDesc: string): string {
  const desc = buildVoiceDesignPrompt(voiceDesc);
  return `(${desc})${text}`;
}

// -- Nano-vLLM backend -------------------------------------------

async function generateNanoVLLM(
  text: string,
  config: VoxCPMConfig
): Promise<VoxCPMResult> {
  if (!VOXCPM_SERVER_URL) {
    return { success: false, backend: 'nano-vllm', error: 'VOXCPM_API_URL not configured' };
  }

  try {
    const body: Record<string, unknown> = {
      cfg_value: config.cfgValue ?? DEFAULT_CFG,
      inference_timesteps: config.inferenceSteps ?? DEFAULT_STEPS,
      temperature: config.temperature ?? 0.3,
      output_format: 'wav',
    };

    if (config.referenceAudioUrl) {
      // Voice Cloning mode
      body.text = text;
      body.reference_audio_url = config.referenceAudioUrl;
      if (config.referenceTranscript) {
        body.reference_transcript = config.referenceTranscript;
      }
      if (config.styleControl) {
        body.style_control = config.styleControl;
      }
    } else if (config.voiceDesc) {
      // Voice Design mode - prepend description in parentheses
      body.text = buildDesignInput(text, config.voiceDesc);
    } else {
      // Plain TTS (default voice)
      body.text = text;
    }

    const res = await fetch(`${VOXCPM_SERVER_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, backend: 'nano-vllm', error: `Nano-vLLM error ${res.status}: ${errText}` };
    }

    // Response is audio binary (WAV)
    const audioBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(audioBuffer).toString('base64');
    const audioUrl = `data:audio/wav;base64,${base64}`;

    // Estimate duration from WAV file size
    // WAV at 48kHz, 16-bit, mono = 96000 bytes/sec
    const estimatedDuration = audioBuffer.byteLength / 96000;

    return {
      success: true,
      audioBase64: base64,
      audioUrl,
      duration: Math.round(estimatedDuration * 10) / 10,
      sampleRate: DEFAULT_SAMPLE_RATE,
      backend: 'nano-vllm',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, backend: 'nano-vllm', error: `Nano-vLLM request failed: ${msg}` };
  }
}

// -- HuggingFace Inference backend --------------------------------

async function generateHuggingFace(
  text: string,
  config: VoxCPMConfig
): Promise<VoxCPMResult> {
  if (!HF_API_KEY) {
    return { success: false, backend: 'huggingface', error: 'HUGGINGFACE_API_KEY not configured' };
  }

  try {
    // Build input text with voice design if available
    let inputText = text;
    if (config.voiceDesc && !config.referenceAudioUrl) {
      inputText = buildDesignInput(text, config.voiceDesc);
    }

    const body: Record<string, unknown> = {
      inputs: inputText,
      parameters: {
        cfg_value: config.cfgValue ?? DEFAULT_CFG,
        inference_timesteps: config.inferenceSteps ?? DEFAULT_STEPS,
      },
    };

    const res = await fetch(HF_INFERENCE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      // Check for common HF errors
      if (res.status === 503) {
        return { success: false, backend: 'huggingface', error: 'Model is loading on HuggingFace (may take 2-5 min). Try again shortly.' };
      }
      if (res.status === 429) {
        return { success: false, backend: 'huggingface', error: 'HuggingFace rate limit or credits exhausted.' };
      }
      return { success: false, backend: 'huggingface', error: `HuggingFace error ${res.status}: ${errText}` };
    }

    const audioBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(audioBuffer).toString('base64');

    // HF may return FLAC or WAV depending on model config
    const contentType = res.headers.get('content-type') || 'audio/wav';
    const mimeType = contentType.includes('flac') ? 'audio/flac' : 'audio/wav';
    const audioUrl = `data:${mimeType};base64,${base64}`;

    const estimatedDuration = audioBuffer.byteLength / 96000;

    return {
      success: true,
      audioBase64: base64,
      audioUrl,
      duration: Math.round(estimatedDuration * 10) / 10,
      sampleRate: DEFAULT_SAMPLE_RATE,
      backend: 'huggingface',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, backend: 'huggingface', error: `HuggingFace request failed: ${msg}` };
  }
}

// -- Main generation function -------------------------------------

/**
 * Generate speech audio using VoxCPM.
 * Tries self-hosted Nano-vLLM first, falls back to HuggingFace.
 *
 * @param text - The text to speak
 * @param config - Voice configuration (design, cloning, or plain)
 * @returns VoxCPMResult with audio data
 *
 * @example Voice Design (from description):
 *   generateSpeech("Say my name.", {
 *     voiceDesc: "calm, calculated, menacing, measured delivery"
 *   })
 *
 * @example Voice Cloning (from reference):
 *   generateSpeech("I am the one who knocks.", {
 *     referenceAudioUrl: "https://example.com/walter-white-sample.wav"
 *   })
 */
export async function generateSpeech(
  text: string,
  config: VoxCPMConfig = {}
): Promise<VoxCPMResult> {
  // Try Nano-vLLM first (self-hosted, no cost)
  if (VOXCPM_SERVER_URL) {
    const result = await generateNanoVLLM(text, config);
    if (result.success) return result;
    console.warn('[VoxCPM] Nano-vLLM failed, trying HuggingFace fallback:', result.error);
  }

  // Fallback to HuggingFace
  if (HF_API_KEY) {
    const result = await generateHuggingFace(text, config);
    if (result.success) return result;
    console.warn('[VoxCPM] HuggingFace failed:', result.error);
    return result;
  }

  return {
    success: false,
    backend: 'none',
    error: 'No VoxCPM backend available. Set VOXCPM_API_URL (self-hosted) or HUGGINGFACE_API_KEY.',
  };
}

// -- Character voice helper ---------------------------------------

/**
 * Generate speech for a specific character using their show profile.
 * Automatically uses the character's voiceDesc for Voice Design.
 *
 * @param text - Dialogue line
 * @param characterName - Character name (e.g., "Walter White")
 * @param showCharacters - Characters array from SHOW_PROFILES
 */
export async function generateCharacterSpeech(
  text: string,
  characterName: string,
  voiceDesc: string,
  options?: {
    referenceAudioUrl?: string;
    referenceTranscript?: string;
  }
): Promise<VoxCPMResult> {
  const config: VoxCPMConfig = {
    voiceDesc,
    temperature: 0.3, // Lower temp for voice consistency
    ...options,
  };

  // If reference audio provided, prefer cloning over design
  if (options?.referenceAudioUrl) {
    config.voiceDesc = undefined; // Cloning mode takes priority
    config.referenceAudioUrl = options.referenceAudioUrl;
    config.referenceTranscript = options.referenceTranscript;
  }

  return generateSpeech(text, config);
}

// -- Batch generation (for full scenes) ---------------------------

export interface DialogueLine {
  character: string;
  line: string;
  voiceDesc: string;
  referenceAudioUrl?: string;
}

/**
 * Generate speech for an entire scene's dialogue.
 * Processes lines sequentially for consistent timing.
 */
export async function generateSceneDialogue(
  dialogue: DialogueLine[]
): Promise<{
  success: boolean;
  results: VoxCPMResult[];
  totalDuration: number;
  errors: string[];
}> {
  const results: VoxCPMResult[] = [];
  const errors: string[] = [];
  let totalDuration = 0;

  for (const line of dialogue) {
    const result = await generateCharacterSpeech(
      line.line,
      line.character,
      line.voiceDesc,
      line.referenceAudioUrl ? { referenceAudioUrl: line.referenceAudioUrl } : undefined
    );

    results.push(result);

    if (result.success && result.duration) {
      totalDuration += result.duration;
    } else if (!result.success) {
      errors.push(`${line.character}: ${result.error}`);
    }
  }

  return {
    success: errors.length === 0,
    results,
    totalDuration: Math.round(totalDuration * 10) / 10,
    errors,
  };
}
