// lib/vidmuse.ts
// VidMuse — Video-to-Music generation (ksoza/vidmuse fork of ZeyueT/VidMuse)
// 3-tier fallback: HuggingFace (free) → Replicate (paid) → Self-hosted GPU
//
// Free users  → HuggingFace Inference API (slow, $0)
// Paid users  → Replicate (~$0.01/run, baked into subscription fees)
// Self-hosted → highest priority if VIDMUSE_GPU_URL configured

const HF_MODEL_ID = 'HKUSTAudio/VidMuse';
const REPLICATE_MODEL = 'ksoza/vidmuse';

// ── Types ───────────────────────────────────────────────────────

export interface VidMuseInput {
  videoUrl: string;        // URL of video to generate music for
  duration?: number;       // seconds (default 30)
  topK?: number;           // top-k sampling (default 250)
  topP?: number;           // top-p sampling (default 0)
  temperature?: number;    // generation temperature (default 1.0)
  cfgCoef?: number;        // classifier-free guidance (default 3.0)
}

export interface VidMuseResult {
  audioUrl: string;
  provider: 'self-hosted' | 'replicate' | 'huggingface';
  duration: number;
}

// ── Self-Hosted (highest priority, if GPU online) ───────────────

async function trySelfHosted(input: VidMuseInput): Promise<VidMuseResult | null> {
  const gpuUrl = process.env.VIDMUSE_GPU_URL;
  if (!gpuUrl) return null;

  try {
    const res = await fetch(`${gpuUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_url: input.videoUrl,
        duration: input.duration || 30,
        top_k: input.topK || 250,
        top_p: input.topP || 0,
        temperature: input.temperature || 1.0,
        cfg_coef: input.cfgCoef || 3.0,
      }),
      signal: AbortSignal.timeout(300_000), // 5 min max
    });

    if (!res.ok) {
      console.warn(`VidMuse self-hosted error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (data.audio_url) {
      return {
        audioUrl: data.audio_url,
        provider: 'self-hosted',
        duration: data.duration || input.duration || 30,
      };
    }
    return null;
  } catch (err) {
    console.warn('VidMuse self-hosted failed:', err);
    return null;
  }
}

// ── Replicate (paid tier — fast, ~$0.01/run) ────────────────────

async function tryReplicate(input: VidMuseInput): Promise<VidMuseResult | null> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return null;

  try {
    // Create prediction
    const createRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: REPLICATE_MODEL,
        input: {
          video_url: input.videoUrl,
          duration: input.duration || 30,
          top_k: input.topK || 250,
          top_p: input.topP || 0,
          temperature: input.temperature || 1.0,
          cfg_coef: input.cfgCoef || 3.0,
        },
      }),
    });

    if (!createRes.ok) {
      console.warn(`Replicate VidMuse create error: ${createRes.status}`);
      return null;
    }

    let prediction = await createRes.json();
    const deadline = Date.now() + 300_000; // 5 min

    // Poll until completed
    while (
      prediction.status !== 'succeeded' &&
      prediction.status !== 'failed' &&
      prediction.status !== 'canceled' &&
      Date.now() < deadline
    ) {
      await new Promise(r => setTimeout(r, 3000));
      const pollRes = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        { headers: { 'Authorization': `Bearer ${token}` } },
      );
      prediction = await pollRes.json();
    }

    if (prediction.status === 'succeeded' && prediction.output) {
      const audioUrl = typeof prediction.output === 'string'
        ? prediction.output
        : prediction.output.audio || prediction.output[0] || '';
      if (audioUrl) {
        return {
          audioUrl,
          provider: 'replicate',
          duration: input.duration || 30,
        };
      }
    }

    console.warn('Replicate VidMuse failed:', prediction.status, prediction.error);
    return null;
  } catch (err) {
    console.warn('Replicate VidMuse error:', err);
    return null;
  }
}

// ── HuggingFace Inference API (free tier — slow) ────────────────

async function tryHuggingFace(input: VidMuseInput): Promise<VidMuseResult | null> {
  // HF Inference API for custom models — use serverless endpoint
  const hfToken = process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN;
  const apiUrl = `https://api-inference.huggingface.co/models/${HF_MODEL_ID}`;

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        ...(hfToken ? { 'Authorization': `Bearer ${hfToken}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: input.videoUrl,
        parameters: {
          duration: input.duration || 30,
          top_k: input.topK || 250,
          temperature: input.temperature || 1.0,
          cfg_coef: input.cfgCoef || 3.0,
        },
      }),
      signal: AbortSignal.timeout(600_000), // 10 min (slow on free)
    });

    if (res.status === 503) {
      // Model loading — wait and retry once
      console.log('VidMuse HF model loading, retrying in 30s...');
      await new Promise(r => setTimeout(r, 30_000));
      const retryRes = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          ...(hfToken ? { 'Authorization': `Bearer ${hfToken}` } : {}),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: input.videoUrl,
          parameters: {
            duration: input.duration || 30,
            top_k: input.topK || 250,
            temperature: input.temperature || 1.0,
          },
        }),
        signal: AbortSignal.timeout(600_000),
      });

      if (!retryRes.ok) {
        console.warn(`VidMuse HF retry failed: ${retryRes.status}`);
        return null;
      }

      const blob = await retryRes.blob();
      // Convert blob to data URL or use a temp storage approach
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      return {
        audioUrl: `data:audio/wav;base64,${base64}`,
        provider: 'huggingface',
        duration: input.duration || 30,
      };
    }

    if (!res.ok) {
      console.warn(`VidMuse HF error: ${res.status} ${await res.text()}`);
      return null;
    }

    // Response is audio binary
    const blob = await res.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return {
      audioUrl: `data:audio/wav;base64,${base64}`,
      provider: 'huggingface',
      duration: input.duration || 30,
    };
  } catch (err) {
    console.warn('VidMuse HF error:', err);
    return null;
  }
}

// ── Main: 3-tier fallback chain ─────────────────────────────────

export async function generateMusicFromVideo(
  input: VidMuseInput,
  userTier: string = 'free',
): Promise<VidMuseResult> {
  const errors: string[] = [];

  // 1. Self-hosted GPU (always highest priority — $0 if configured)
  const selfResult = await trySelfHosted(input);
  if (selfResult) return selfResult;
  if (process.env.VIDMUSE_GPU_URL) errors.push('self-hosted offline');

  // 2. Replicate (paid tiers only — cost baked into subscription)
  if (userTier !== 'free') {
    const repResult = await tryReplicate(input);
    if (repResult) return repResult;
    if (process.env.REPLICATE_API_TOKEN) errors.push('Replicate failed');
  }

  // 3. HuggingFace Inference API (free — available to everyone)
  const hfResult = await tryHuggingFace(input);
  if (hfResult) return hfResult;
  errors.push('HuggingFace unavailable');

  throw new Error(
    `VidMuse: all providers failed. ${errors.join(', ')}. ` +
    'Configure VIDMUSE_GPU_URL for self-hosted, REPLICATE_API_TOKEN for Replicate, ' +
    'or HF_TOKEN for HuggingFace.'
  );
}

// ── Config check ────────────────────────────────────────────────

export function isVidMuseConfigured(): boolean {
  return !!(
    process.env.VIDMUSE_GPU_URL ||
    process.env.REPLICATE_API_TOKEN ||
    process.env.HF_TOKEN ||
    process.env.HUGGINGFACE_TOKEN
  );
}

export function getVidMuseStatus(): {
  selfHosted: boolean;
  replicate: boolean;
  huggingface: boolean;
} {
  return {
    selfHosted: !!process.env.VIDMUSE_GPU_URL,
    replicate: !!process.env.REPLICATE_API_TOKEN,
    huggingface: !!(process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN),
  };
}
