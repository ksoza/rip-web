// lib/self-hosted.ts
// Self-hosted GPU provider client for RemixIP
//
// Supports two modes:
//   A) RunPod Serverless — set RUNPOD_MODE=true + SELF_HOSTED_GPU_URL
//   C) Local GPU server  — set SELF_HOSTED_GPU_URL to your server
//
// Models: LTX-2.3 (video + native audio sync) or Wan 2.1 (video only)
// Cost: $0.00 (local) or ~$0.00036/sec (RunPod serverless)
//
// Endpoints (local server):
//   POST /generate/video   - LTX-2.3 or Wan 2.1 text-to-video
//   POST /generate/voice   - XTTS-v2 voice cloning
//   POST /generate/tts     - Kokoro fast TTS
//   GET  /health           - GPU status + model info
//   GET  /models           - Available models

const SELF_HOSTED_URL = process.env.SELF_HOSTED_GPU_URL || '';
const SELF_HOSTED_SECRET = process.env.SELF_HOSTED_GPU_SECRET || 'remixip-free-gpu-2026';
const IS_RUNPOD = process.env.RUNPOD_MODE === 'true';

// -- Types -------------------------------------------------------

export interface SelfHostedVideoRequest {
  prompt: string;
  width?: number;
  height?: number;
  num_frames?: number;
  num_inference_steps?: number;
  fps?: number;
  seed?: number;
}

export interface SelfHostedVideoResult {
  success: boolean;
  video_path?: string;
  download_url?: string;
  video_base64?: string;      // RunPod serverless returns base64
  audio_download_url?: string;
  audio_base64?: string;       // RunPod serverless returns base64
  has_audio?: boolean;
  model?: string;
  duration_seconds?: number;
  frames?: number;
  resolution?: string;
  generation_time?: number;
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
  has_audio?: boolean;  // true if loaded model supports native audio sync
  model_id?: string;
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
    if (IS_RUNPOD) {
      // RunPod serverless doesn't have a /health endpoint — check via /health or assume healthy
      // RunPod manages availability; if the endpoint exists, it's healthy
      const res = await fetch(`${SELF_HOSTED_URL}/health`, {
        headers: { 'Authorization': `Bearer ${SELF_HOSTED_SECRET}` },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const data = await res.json() as SelfHostedHealthResult;
        _healthCache = { result: data, timestamp: Date.now() };
        return data;
      }
      // RunPod might not have /health, return synthetic health
      const synthetic: SelfHostedHealthResult = {
        status: 'ok',
        gpu: 'runpod-serverless',
        vram_gb: 24,
        models: { video: 'Lightricks/LTX-Video', voice_clone: null, tts_fast: null },
        has_audio: true,
        model_id: 'Lightricks/LTX-Video',
      };
      _healthCache = { result: synthetic, timestamp: Date.now() };
      return synthetic;
    }

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

/** Check if the self-hosted model supports native audio sync */
export async function selfHostedHasAudio(): Promise<boolean> {
  const health = await checkSelfHostedHealth();
  return health?.has_audio === true;
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

  if (IS_RUNPOD) {
    return runpodFetch<T>(body, timeoutMs);
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

/** RunPod serverless async job submission + polling */
async function runpodFetch<T>(
  input: Record<string, unknown>,
  timeoutMs: number
): Promise<T> {
  // Submit job
  const submitRes = await fetch(`${SELF_HOSTED_URL}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SELF_HOSTED_SECRET}`,
    },
    body: JSON.stringify({ input }),
  });

  if (!submitRes.ok) {
    const err = await submitRes.text();
    throw new Error(`RunPod submit failed: ${submitRes.status} ${err}`);
  }

  const { id: jobId } = await submitRes.json() as { id: string };
  console.log(`[self-hosted] RunPod job submitted: ${jobId}`);

  // Poll for completion
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 3000)); // Poll every 3s

    const statusRes = await fetch(`${SELF_HOSTED_URL}/status/${jobId}`, {
      headers: { 'Authorization': `Bearer ${SELF_HOSTED_SECRET}` },
    });

    if (!statusRes.ok) continue;

    const status = await statusRes.json() as {
      status: string;
      output?: T;
      error?: string;
    };

    if (status.status === 'COMPLETED' && status.output) {
      return status.output;
    }
    if (status.status === 'FAILED') {
      throw new Error(`RunPod job failed: ${status.error || 'unknown error'}`);
    }
    // IN_QUEUE, IN_PROGRESS — keep polling
  }

  throw new Error('RunPod job timed out');
}

/** Generate video using LTX-2.3 (or Wan 2.1) on self-hosted GPU */
export async function selfHostedGenerateVideo(
  opts: SelfHostedVideoRequest
): Promise<SelfHostedVideoResult> {
  return selfHostedFetch<SelfHostedVideoResult>('/generate/video', {
    prompt: opts.prompt,
    width: opts.width || 768,
    height: opts.height || 512,
    num_frames: opts.num_frames || 97,
    num_inference_steps: opts.num_inference_steps || 30,
    fps: opts.fps || 24,
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
  if (IS_RUNPOD) {
    // RunPod returns base64 — this shouldn't be called in RunPod mode
    return downloadPath;
  }
  return `${SELF_HOSTED_URL}${downloadPath}`;
}
