// lib/pollinations.ts
// Pollinations.ai — genuinely free AI generation (images, text, video)
// No API key. No signup. No limits. No cost.
// Docs: https://pollinations.ai/
//
// Used as the DEFAULT provider for $0 operation.
// Paid providers (fal.ai, Anthropic, etc.) are optional upgrades.

// ── Image Generation ────────────────────────────────────────────

export interface PollinationsImageOptions {
  width?: number;
  height?: number;
  model?: 'flux' | 'flux-realism' | 'flux-anime' | 'flux-3d' | 'turbo';
  seed?: number;
  nologo?: boolean;
  enhance?: boolean;
}

/**
 * Generate an image via Pollinations (free, no key).
 * Returns a direct image URL — no polling needed.
 */
export function pollinationsImageUrl(
  prompt: string,
  opts: PollinationsImageOptions = {},
): string {
  const params = new URLSearchParams();
  if (opts.width) params.set('width', String(opts.width));
  if (opts.height) params.set('height', String(opts.height));
  if (opts.model) params.set('model', opts.model);
  if (opts.seed !== undefined) params.set('seed', String(opts.seed));
  if (opts.nologo !== false) params.set('nologo', 'true');
  if (opts.enhance) params.set('enhance', 'true');

  const encoded = encodeURIComponent(prompt);
  const qs = params.toString();
  return `https://image.pollinations.ai/prompt/${encoded}${qs ? `?${qs}` : ''}`;
}

/**
 * Generate an image and verify it returns a valid response.
 * Pollinations URLs are live-generated — this confirms the image was created.
 */
export async function pollinationsGenerateImage(
  prompt: string,
  opts: PollinationsImageOptions = {},
): Promise<{ url: string; model: string }> {
  const url = pollinationsImageUrl(prompt, opts);

  // Ping the URL to trigger generation (it generates on first request)
  const res = await fetch(url, {
    method: 'HEAD',
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    throw new Error(`Pollinations image error: HTTP ${res.status}`);
  }

  return { url, model: opts.model || 'flux' };
}

// ── Text / Chat Generation ──────────────────────────────────────

export interface PollinationsTextOptions {
  model?: string;      // Default: 'openai' (routed to best available)
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  seed?: number;
  jsonMode?: boolean;
}

/**
 * Generate text via Pollinations chat API (free, no key).
 * Supports multiple models: openai, mistral, llama, etc.
 */
export async function pollinationsChat(
  messages: { role: string; content: string }[],
  opts: PollinationsTextOptions = {},
): Promise<{ text: string; model: string }> {
  const body: Record<string, unknown> = {
    messages,
    model: opts.model || 'openai',
    seed: opts.seed ?? 42,
    jsonMode: opts.jsonMode ?? false,
  };
  if (opts.temperature !== undefined) body.temperature = opts.temperature;
  if (opts.maxTokens) body.max_tokens = opts.maxTokens;
  if (opts.systemPrompt) {
    // Prepend system message
    body.messages = [
      { role: 'system', content: opts.systemPrompt },
      ...messages,
    ];
  }

  const res = await fetch('https://text.pollinations.ai/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    throw new Error(`Pollinations text error: HTTP ${res.status} — ${await res.text()}`);
  }

  // Response is plain text (not JSON) unless jsonMode is on
  const text = await res.text();
  return { text, model: opts.model || 'openai' };
}

/**
 * Simple text generation (single prompt, no chat history).
 */
export async function pollinationsGenerate(
  prompt: string,
  opts: PollinationsTextOptions = {},
): Promise<{ text: string; model: string }> {
  return pollinationsChat(
    [{ role: 'user', content: prompt }],
    opts,
  );
}

// ── Video Generation ────────────────────────────────────────────

/**
 * Generate a video via Pollinations (free, no key).
 * Uses their video endpoint — returns a URL to the generated video.
 */
export async function pollinationsGenerateVideo(
  prompt: string,
  opts: { model?: string; seed?: number } = {},
): Promise<{ url: string; model: string }> {
  const params = new URLSearchParams();
  if (opts.model) params.set('model', opts.model);
  if (opts.seed !== undefined) params.set('seed', String(opts.seed));
  params.set('nologo', 'true');

  const encoded = encodeURIComponent(prompt);
  const qs = params.toString();
  const url = `https://video.pollinations.ai/prompt/${encoded}${qs ? `?${qs}` : ''}`;

  // Trigger generation
  const res = await fetch(url, {
    method: 'HEAD',
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    throw new Error(`Pollinations video error: HTTP ${res.status}`);
  }

  return { url, model: opts.model || 'default' };
}

// ── Availability ────────────────────────────────────────────────

/** Pollinations is always available — no API key needed */
export function isPollinationsAvailable(): boolean {
  return true;
}
