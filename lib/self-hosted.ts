// lib/self-hosted.ts
// Self-hosted GPU provider client for RemixIP
// Connects to a free Google Colab/Kaggle GPU running Wan 2.1 + XTTS-v2
//
// Cost: $0.00 (free Colab T4 16GB or Kaggle P100 16GB)
// Tradeoff: Slower generation, 12hr session limits
//
// Endpoints:
//   POST /generate/video   - Wan 2.1 text-to-video
//   POST /generate/voice   - XTTS-v2 voice cloning
//   POST /generate/tts     - Kokoro fast TTS
//   GET  /health           - GPU status
//   GET  /models           - Available models

const SELF_HOSTED_URL = process.env.SELF_HOSTED_GPU_URL || '';
const SELF_HOSTED_SECRET = process.env.SELF_HOSTED_GPU_SECRET || 'remixip-free-gpu-2026';

// -- Types -------------------------------------------------------

export interface SelfHostedVideoRequest {
  prompt: string;
  width?: number;
  height?: number;
  num_frames?: number;
  num_inference_steps?: number;
  seed?: number;
}

export interface SelfHostedVideoResult {
  success: boolean;
  video_path?: string;
  download_url?: string;
  model?: string;
  duration_seconds?: number;
  frames?: number;
  resolution?: string;
  error?: string;
}

export interface SelfHostedVoiceRequest {
  text: string;
  language?: string;
  reference_audio_url?: string;
}

export interface SelfHostedVoiceResult {
  success: boolean;
  audio_path?: string;
  download_url?: string;
  model?: string;
  cloned?: boolean;
  duration_seconds?: number;
  error?: string;
}

export interface SelfHostedHealthResult {
  status: string;
  gpu: string;
  vram_gb: number;
  models: {
    video: string | null;
    voice_clone: string | null;
    tts_fast: string | null;
  };
}

// -- Availability check ------------------------------------------

/** Check if self-hosted GPU is configured and reachable */
export function isSelfHostedConfigured(): boolean {
  return !!SELF_HOSTED_URL && SELF_HOSTED_URL.startsWith('http');
}

let _healthCache: { result: SelfHostedHealthResult; timestamp: number } | null = null;
const HEALTH_CACHE_MS = 30_000; // Cache health for 30s

export async function checkSelfHostedHealth(): Promise<SelfHostedHealthResult | null> {
  if (!isSelfHostedConfigured()) return null;

  // Return cached result if fresh
  if (_healthCache && Date.now() - _healthCache.timestamp < HEALTH_CACHE_MS) {
    return _healthCache.result;
  }

  try {
    const res = await fetch(`${SELF_HOSTED_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const data = await res.json() as SelfHostedHealthResult;
    _healthCache = { result: data, timestamp: Date.now() };
    return data;
  } catch {
    _healthCache = null;
    return null;
  }
}

// -- API calls ---------------------------------------------------

async function selfHostedFetch<T>(
  endpoint: string,
  body: Record<string, unknown>,
  timeoutMs = 300_000 // 5 min default for video gen
): Promise<T> {
  if (!isSelfHostedConfigured()) {
    throw new Error('Self-hosted GPU not configured. Set SELF_HOSTED_GPU_URL env var.');
  }

  const res = await fetch(`${SELF_HOSTED_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SELF_HOSTED_SECRET}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Self-hosted API error: ${res.status}`);
  }
  return data as T;
}

/** Generate video using Wan 2.1 on self-hosted GPU */
export async function selfHostedGenerateVideo(
  opts: SelfHostedVideoRequest
): Promise<SelfHostedVideoResult> {
  return selfHostedFetch<SelfHostedVideoResult>('/generate/video', {
    prompt: opts.prompt,
    width: opts.width || 512,
    height: opts.height || 512,
    num_frames: opts.num_frames || 16,
    num_inference_steps: opts.num_inference_steps || 25,
    seed: opts.seed,
  });
}

/** Clone a voice using XTTS-v2 on self-hosted GPU */
export async function selfHostedCloneVoice(
  opts: SelfHostedVoiceRequest
): Promise<SelfHostedVoiceResult> {
  return selfHostedFetch<SelfHostedVoiceResult>('/generate/voice', {
    text: opts.text,
    language: opts.language || 'en',
    reference_audio_url: opts.reference_audio_url,
  });
}

/** Fast TTS using Kokoro on self-hosted GPU */
export async function selfHostedTTS(
  text: string
): Promise<SelfHostedVoiceResult> {
  return selfHostedFetch<SelfHostedVoiceResult>('/generate/tts', { text });
}

/** Get the full download URL for a self-hosted file */
export function selfHostedDownloadUrl(downloadPath: string): string {
  return `${SELF_HOSTED_URL}${downloadPath}`;
}
