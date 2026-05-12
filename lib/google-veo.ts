/**
 * Google Veo Video Generation via Gemini API
 *
 * Uses the predictLongRunning endpoint to generate videos.
 * Free tier available for Veo 3.x models (daily quota applies).
 *
 * Flow:
 *   1. POST predictLongRunning → returns operation name
 *   2. Poll GET operations/{name} until done
 *   3. Result contains base64 video data or GCS URI
 */

const GOOGLE_AI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Models to try in order (cheapest/fastest first)
const VEO_MODELS = [
  'veo-3.0-fast-generate-001',   // Fast, free tier
  'veo-3.1-lite-generate-preview', // Lite preview
  'veo-3.0-generate-001',         // Full quality
] as const;

function getGoogleAIKey(): string | null {
  return process.env.GOOGLE_AI_KEY || process.env.GOOGLE_GEMINI_KEY || null;
}

export function isGoogleVeoAvailable(): boolean {
  return !!getGoogleAIKey();
}

interface VeoSubmitResult {
  operationName: string;
  model: string;
}

interface VeoVideoResult {
  status: 'processing' | 'completed' | 'failed';
  videoUrl?: string;     // data:video/mp4;base64,... or https:// URL
  error?: string;
  model?: string;
}

/**
 * Submit a video generation request to Google Veo.
 * Returns an operation name for polling.
 */
export async function submitVeoVideo(
  prompt: string,
  opts?: {
    imageUrl?: string;       // Reference image for image-to-video
    aspectRatio?: string;    // '16:9' (default), '9:16', '1:1'
    durationSeconds?: number; // 5 or 8 (Veo default is ~4-8s)
    model?: string;           // Specific model to try
  }
): Promise<VeoSubmitResult | null> {
  const key = getGoogleAIKey();
  if (!key) return null;

  const modelsToTry = opts?.model
    ? [opts.model]
    : [...VEO_MODELS];

  for (const model of modelsToTry) {
    try {
      console.log(`[google-veo] Submitting to ${model}...`);

      // Build the request body
      const instance: any = { prompt };

      // If we have a reference image, include it
      if (opts?.imageUrl && !opts.imageUrl.startsWith('data:')) {
        try {
          const imgRes = await fetch(opts.imageUrl, {
            signal: AbortSignal.timeout(15_000),
          });
          if (imgRes.ok) {
            const buf = Buffer.from(await imgRes.arrayBuffer());
            instance.image = {
              bytesBase64Encoded: buf.toString('base64'),
              mimeType: 'image/jpeg',
            };
          }
        } catch (e) {
          console.warn('[google-veo] Failed to fetch reference image:', e);
        }
      }

      const body: any = {
        instances: [instance],
        parameters: {
          aspectRatio: opts?.aspectRatio || '16:9',
          sampleCount: 1,
          personGeneration: 'allow_all',
        },
      };

      if (opts?.durationSeconds) {
        body.parameters.durationSeconds = opts.durationSeconds;
      }

      const res = await fetch(
        `${GOOGLE_AI_BASE}/models/${model}:predictLongRunning?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(30_000),
        }
      );

      if (res.status === 429) {
        console.warn(`[google-veo] ${model}: rate limited (429), trying next model...`);
        continue;
      }

      if (res.status === 400) {
        const err = await res.json().catch(() => ({}));
        console.warn(`[google-veo] ${model}: ${err?.error?.message || res.statusText}`);
        continue;
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.warn(`[google-veo] ${model}: HTTP ${res.status} - ${errText.slice(0, 200)}`);
        continue;
      }

      const data = await res.json();

      // predictLongRunning returns an operation
      if (data.name) {
        console.log(`[google-veo] ✓ ${model} accepted, operation: ${data.name}`);
        return {
          operationName: data.name,
          model,
        };
      }

      // Some models might return result directly
      if (data.predictions?.[0]?.video?.uri) {
        // Direct result
        return {
          operationName: '__DIRECT__:' + data.predictions[0].video.uri,
          model,
        };
      }

      console.warn(`[google-veo] ${model}: unexpected response`, JSON.stringify(data).slice(0, 300));
    } catch (err) {
      console.warn(`[google-veo] ${model} error:`, err);
    }
  }

  return null;
}

/**
 * Check the status of a Veo video generation operation.
 */
export async function checkVeoVideo(operationName: string): Promise<VeoVideoResult> {
  const key = getGoogleAIKey();
  if (!key) return { status: 'failed', error: 'No Google AI key' };

  // Handle direct results (from models that return instantly)
  if (operationName.startsWith('__DIRECT__:')) {
    const uri = operationName.replace('__DIRECT__:', '');
    return { status: 'completed', videoUrl: uri };
  }

  try {
    const res = await fetch(
      `${GOOGLE_AI_BASE}/${operationName}?key=${key}`,
      {
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15_000),
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        status: 'failed',
        error: `HTTP ${res.status}: ${errText.slice(0, 200)}`,
      };
    }

    const data = await res.json();

    // Check if operation is done
    if (data.done) {
      // Check for errors
      if (data.error) {
        return {
          status: 'failed',
          error: data.error.message || 'Veo generation failed',
        };
      }

      // Extract video from response
      const response = data.response || data.result;
      if (response?.predictions) {
        for (const pred of response.predictions) {
          if (pred.video?.uri) {
            return { status: 'completed', videoUrl: pred.video.uri };
          }
          if (pred.bytesBase64Encoded) {
            const mimeType = pred.mimeType || 'video/mp4';
            return {
              status: 'completed',
              videoUrl: `data:${mimeType};base64,${pred.bytesBase64Encoded}`,
            };
          }
          // Gemini API may return video in generateVideoResponse format
          if (pred.video?.bytesBase64Encoded) {
            return {
              status: 'completed',
              videoUrl: `data:video/mp4;base64,${pred.video.bytesBase64Encoded}`,
            };
          }
        }
      }

      // Try alternative response formats
      if (response?.generatedSamples) {
        for (const sample of response.generatedSamples) {
          if (sample.video?.uri) {
            return { status: 'completed', videoUrl: sample.video.uri };
          }
          if (sample.video?.bytesBase64Encoded) {
            return {
              status: 'completed',
              videoUrl: `data:video/mp4;base64,${sample.video.bytesBase64Encoded}`,
            };
          }
        }
      }

      return {
        status: 'failed',
        error: 'Veo completed but no video data found in response',
      };
    }

    // Still processing
    const progress = data.metadata?.progress
      ? ` (${Math.round(data.metadata.progress * 100)}%)`
      : '';
    console.log(`[google-veo] Operation still processing${progress}`);
    return { status: 'processing' };
  } catch (err) {
    return {
      status: 'failed',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Submit and poll until complete (sync mode).
 * Timeout: 5 minutes.
 */
export async function generateVeoVideo(
  prompt: string,
  opts?: {
    imageUrl?: string;
    aspectRatio?: string;
    durationSeconds?: number;
  }
): Promise<VeoVideoResult> {
  const submitResult = await submitVeoVideo(prompt, opts);
  if (!submitResult) {
    return { status: 'failed', error: 'All Veo models rejected or unavailable' };
  }

  // Poll until done (max 5 minutes)
  const deadline = Date.now() + 300_000;
  let pollInterval = 5_000;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, pollInterval));
    const result = await checkVeoVideo(submitResult.operationName);

    if (result.status !== 'processing') {
      result.model = submitResult.model;
      return result;
    }

    // Increase poll interval over time
    pollInterval = Math.min(pollInterval + 2_000, 15_000);
  }

  return { status: 'failed', error: 'Veo generation timed out (5 min)', model: submitResult.model };
}
