// lib/ai-providers.ts
// Unified AI provider abstraction layer
// Organized by cost: $0 FREE providers first, then PAID
// Each provider's API key comes from environment variables

export type Provider = {
  id: string;
  name: string;
  category: 'text' | 'image' | 'video' | 'audio' | 'voice' | 'lipsync' | 'motion' | 'faceswap' | 'sfx' | 'music' | 'sprite';
  envKey: string;
  baseUrl?: string;
  description: string;
  models?: string[];
  cost: 'free' | 'paid';
};

export const AI_PROVIDERS: Provider[] = [
  // ================================================================
  // FREE TIER ($0 COST)
  // ================================================================

  // -- SELF-HOSTED VIDEO (Colab/Kaggle, $0) -----------------------
  {
    id: 'self-hosted-video',
    name: 'Wan 2.1 (Self-Hosted)',
    category: 'video',
    envKey: 'SELF_HOSTED_GPU_URL',
    description: 'Free video generation via Colab/Kaggle GPU. Wan 2.1 1.3B, LTX-Video. $0 cost.',
    models: ['wan-2.1-1.3b', 'ltx-video'],
    cost: 'free',
  },

  // -- SELF-HOSTED VOICE CLONING (XTTS-v2, $0) -------------------
  {
    id: 'self-hosted-xtts',
    name: 'XTTS-v2 (Self-Hosted)',
    category: 'voice',
    envKey: 'SELF_HOSTED_GPU_URL',
    description: 'Free voice cloning from 6s audio sample. 17 languages. Coqui XTTS-v2. $0 cost.',
    models: ['xtts-v2'],
    cost: 'free',
  },

  // -- SELF-HOSTED FAST TTS (Kokoro, $0) --------------------------
  {
    id: 'self-hosted-kokoro',
    name: 'Kokoro TTS (Self-Hosted)',
    category: 'voice',
    envKey: 'SELF_HOSTED_GPU_URL',
    description: 'Fast CPU-only TTS. 82M params, natural speech. $0 cost.',
    models: ['kokoro-82m'],
    cost: 'free',
  },

  // -- VOXCPM (Self-Hosted, $0) -----------------------------------
  {
    id: 'voxcpm',
    name: 'VoxCPM (Self-Hosted)',
    category: 'voice',
    envKey: 'VOXCPM_API_URL',
    description: 'Self-hosted TTS: Voice Design + Voice Cloning. 2B params, 30 langs, zero API cost.',
    models: ['voxcpm-2'],
    cost: 'free',
  },

  // -- POLLINATIONS (FREE image API) ------------------------------
  {
    id: 'pollinations',
    name: 'Pollinations AI',
    category: 'image',
    envKey: '',
    baseUrl: 'https://image.pollinations.ai',
    description: 'Free image generation. No API key, no limits, no signup. FLUX, SDXL, and more.',
    models: ['flux', 'flux-realism', 'flux-anime', 'flux-3d', 'turbo'],
    cost: 'free',
  },

  // ================================================================
  // PAID TIER (Better quality, faster)
  // ================================================================

  // -- NEXOS.AI GATEWAY (200+ models via single key) --------------
  {
    id: 'nexos',
    name: 'nexos.ai Gateway',
    category: 'text',
    envKey: 'NEXOS_API_KEY',
    baseUrl: 'https://api.nexos.ai/v1',
    description: 'AI gateway -- 200+ models via single API key. Claude, GPT-4.1, Gemini 3, Grok 4 and more.',
    models: [
      'claude-sonnet-4.5',
      'claude-opus-4.6',
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4.1-nano',
      'gemini-3-flash',
      'gemini-3-pro',
      'grok-4',
      'grok-4-mini',
    ],
    cost: 'paid',
  },

  // -- TEXT / STORY ------------------------------------------------
  {
    id: 'anthropic',
    name: 'Claude (Anthropic)',
    category: 'text',
    envKey: 'ANTHROPIC_API_KEY',
    description: 'Story writing, scripts, dialogue, character development',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022'],
    cost: 'paid',
  },
  {
    id: 'grok',
    name: 'Grok (xAI)',
    category: 'text',
    envKey: 'XAI_API_KEY',
    baseUrl: 'https://api.x.ai/v1',
    description: 'Witty, unfiltered story generation and dialogue',
    models: ['grok-3', 'grok-3-mini'],
    cost: 'paid',
  },

  // -- IMAGE / CHARACTER ------------------------------------------
  {
    id: 'dalle',
    name: 'DALL-E 3 (OpenAI)',
    category: 'image',
    envKey: 'OPENAI_API_KEY',
    baseUrl: 'https://api.openai.com/v1',
    description: 'High-quality character art and scene illustrations',
    models: ['dall-e-3'],
    cost: 'paid',
  },
  {
    id: 'seedream',
    name: 'Seedream (ByteDance)',
    category: 'image',
    envKey: 'REPLICATE_API_TOKEN',
    description: 'Photorealistic image generation with strong prompt following',
    models: ['bytedance/seedream-3'],
    cost: 'paid',
  },
  {
    id: 'flux',
    name: 'Flux (Black Forest Labs)',
    category: 'image',
    envKey: 'REPLICATE_API_TOKEN',
    description: 'Fast, high-quality image generation',
    models: ['black-forest-labs/flux-1.1-pro'],
    cost: 'paid',
  },

  // -- SPRITE / CHARACTER SHEET -----------------------------------
  {
    id: 'sprite',
    name: 'AI Sprite Creator',
    category: 'sprite',
    envKey: 'REPLICATE_API_TOKEN',
    description: 'Crisp character sprites with multiple directions/poses',
    models: ['black-forest-labs/flux-1.1-pro'],
    cost: 'paid',
  },

  // -- VIDEO (PAID) -----------------------------------------------
  {
    id: 'fal-video',
    name: 'fal.ai Video (Veo 3.1 / Seedance 2)',
    category: 'video',
    envKey: 'FAL_KEY',
    description: 'Industry-best video+audio sync. Veo 3.1, Seedance 2, Kling, Wan via fal.ai.',
    models: ['veo-3.1', 'seedance-2', 'kling-v3', 'wan-2.1', 'minimax-hailuo'],
    cost: 'paid',
  },
  {
    id: 'luma',
    name: 'Luma Dream Machine',
    category: 'video',
    envKey: 'LUMA_API_KEY',
    baseUrl: 'https://api.lumalabs.ai',
    description: 'AI video generation from text or images',
    models: ['dream-machine'],
    cost: 'paid',
  },
  {
    id: 'runway',
    name: 'Runway ML',
    category: 'video',
    envKey: 'RUNWAY_API_KEY',
    baseUrl: 'https://api.dev.runwayml.com/v1',
    description: 'Professional-grade AI video generation and editing',
    models: ['gen-3-alpha', 'gen-3-alpha-turbo'],
    cost: 'paid',
  },
  {
    id: 'kling',
    name: 'Kling',
    category: 'video',
    envKey: 'REPLICATE_API_TOKEN',
    description: 'Advanced video generation with motion control',
    models: ['kwaivgi/kling-v1'],
    cost: 'paid',
  },

  // -- VOICE (PAID) -----------------------------------------------
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    category: 'voice',
    envKey: 'ELEVENLABS_API_KEY',
    baseUrl: 'https://api.elevenlabs.io/v1',
    description: 'Character voices, narration, voice cloning',
    models: ['eleven_multilingual_v2', 'eleven_turbo_v2_5'],
    cost: 'paid',
  },

  // -- LIPSYNC ----------------------------------------------------
  {
    id: 'lipsync',
    name: 'Lip Sync (Wav2Lip)',
    category: 'lipsync',
    envKey: 'REPLICATE_API_TOKEN',
    description: 'Sync character lip movements to any audio',
    models: ['devxpy/cog-wav2lip'],
    cost: 'paid',
  },

  // -- MOTION / POSE CONTROL -------------------------------------
  {
    id: 'motion',
    name: 'Motion Control (TAP / ControlNet)',
    category: 'motion',
    envKey: 'REPLICATE_API_TOKEN',
    description: 'Stick-figure pose control for precise character animation',
    models: ['jagilley/controlnet-pose'],
    cost: 'paid',
  },

  // -- FACE SWAP --------------------------------------------------
  {
    id: 'faceswap',
    name: 'Face Swap (InsightFace)',
    category: 'faceswap',
    envKey: 'REPLICATE_API_TOKEN',
    description: 'Swap faces across scenes for character consistency',
    models: ['lucataco/faceswap'],
    cost: 'paid',
  },

  // -- SOUND EFFECTS ----------------------------------------------
  {
    id: 'audiogen',
    name: 'AudioGen (Meta)',
    category: 'sfx',
    envKey: 'REPLICATE_API_TOKEN',
    description: 'AI-generated sound effects and ambient audio',
    models: ['meta/audiogen'],
    cost: 'paid',
  },

  // -- MUSIC ------------------------------------------------------
  {
    id: 'musicgen',
    name: 'MusicGen (Meta)',
    category: 'music',
    envKey: 'REPLICATE_API_TOKEN',
    description: 'AI-generated background music and scores',
    models: ['meta/musicgen'],
    cost: 'paid',
  },
];

// -- Helper functions ---------------------------------------------
export function getProvider(id: string): Provider | undefined {
  return AI_PROVIDERS.find(p => p.id === id);
}

export function getProvidersByCategory(category: string): Provider[] {
  return AI_PROVIDERS.filter(p => p.category === category);
}

export function getFreeProviders(): Provider[] {
  return AI_PROVIDERS.filter(p => p.cost === 'free');
}

export function getPaidProviders(): Provider[] {
  return AI_PROVIDERS.filter(p => p.cost === 'paid');
}

export function isProviderConfigured(id: string): boolean {
  const provider = getProvider(id);
  if (!provider) return false;
  // Pollinations needs no API key
  if (provider.id === 'pollinations') return true;
  const key = process.env[provider.envKey];
  return !!key && key.length > 5;
}

export function getConfiguredProviders(): Provider[] {
  return AI_PROVIDERS.filter(p => isProviderConfigured(p.id));
}

export function getConfiguredFreeProviders(): Provider[] {
  return AI_PROVIDERS.filter(p => p.cost === 'free' && isProviderConfigured(p.id));
}

// -- Provider API clients -----------------------------------------

// Replicate API helper (used by many providers)
export async function runReplicate(model: string, input: Record<string, any>): Promise<any> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error('REPLICATE_API_TOKEN not configured');

  // Create prediction
  const createRes = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input,
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Replicate API error: ${err}`);
  }

  const prediction = await createRes.json();

  // Poll for result
  let result = prediction;
  while (result.status !== 'succeeded' && result.status !== 'failed') {
    await new Promise(r => setTimeout(r, 2000));
    const pollRes = await fetch(result.urls.get, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    result = await pollRes.json();
  }

  if (result.status === 'failed') {
    throw new Error(`Replicate prediction failed: ${result.error}`);
  }

  return result.output;
}

// OpenAI API helper (DALL-E)
export async function callOpenAI(endpoint: string, body: Record<string, any>): Promise<any> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not configured');

  const res = await fetch(`https://api.openai.com/v1${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${err}`);
  }

  return res.json();
}

// xAI (Grok) API helper
export async function callGrok(messages: { role: string; content: string }[], model = 'grok-3'): Promise<string> {
  const key = process.env.XAI_API_KEY;
  if (!key) throw new Error('XAI_API_KEY not configured');

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, max_tokens: 2048 }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Grok API error: ${err}`);
  }

  const data = await res.json();
  return data.choices[0]?.message?.content || '';
}

// ElevenLabs TTS helper
export async function callElevenLabs(text: string, voiceId: string, model = 'eleven_multilingual_v2'): Promise<ArrayBuffer> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('ELEVENLABS_API_KEY not configured');

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: model,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs API error: ${err}`);
  }

  return res.arrayBuffer();
}

// Luma Dream Machine helper
export async function callLuma(prompt: string, options: { aspect_ratio?: string; loop?: boolean } = {}): Promise<any> {
  const key = process.env.LUMA_API_KEY;
  if (!key) throw new Error('LUMA_API_KEY not configured');

  const res = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      aspect_ratio: options.aspect_ratio || '16:9',
      loop: options.loop || false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Luma API error: ${err}`);
  }

  const generation = await res.json();

  // Poll for completion
  let result = generation;
  while (result.state !== 'completed' && result.state !== 'failed') {
    await new Promise(r => setTimeout(r, 3000));
    const pollRes = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${result.id}`, {
      headers: { 'Authorization': `Bearer ${key}` },
    });
    result = await pollRes.json();
  }

  if (result.state === 'failed') {
    throw new Error(`Luma generation failed: ${result.failure_reason}`);
  }

  return result;
}

// nexos.ai gateway helper (OpenAI-compatible)
export async function callNexos(
  messages: { role: string; content: string }[],
  model = 'claude-sonnet-4.5',
  maxTokens = 2048,
): Promise<string> {
  const key = process.env.NEXOS_API_KEY;
  if (!key) throw new Error('NEXOS_API_KEY not configured');

  const baseUrl = process.env.NEXOS_BASE_URL || 'https://api.nexos.ai/v1';

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`nexos.ai API error: ${err}`);
  }

  const data = await res.json();
  return data.choices[0]?.message?.content || '';
}

// Runway ML helper
export async function callRunway(prompt: string, options: { model?: string; duration?: number; image_url?: string } = {}): Promise<any> {
  const key = process.env.RUNWAY_API_KEY;
  if (!key) throw new Error('RUNWAY_API_KEY not configured');

  const body: any = {
    promptText: prompt,
    model: options.model || 'gen3a_turbo',
    duration: options.duration || 5,
  };
  if (options.image_url) {
    body.promptImage = options.image_url;
  }

  const res = await fetch('https://api.dev.runwayml.com/v1/image_to_video', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'X-Runway-Version': '2024-11-06',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Runway API error: ${err}`);
  }

  const task = await res.json();

  // Poll for completion
  let result = task;
  while (result.status !== 'SUCCEEDED' && result.status !== 'FAILED') {
    await new Promise(r => setTimeout(r, 5000));
    const pollRes = await fetch(`https://api.dev.runwayml.com/v1/tasks/${result.id}`, {
      headers: {
        'Authorization': `Bearer ${key}`,
        'X-Runway-Version': '2024-11-06',
      },
    });
    result = await pollRes.json();
  }

  if (result.status === 'FAILED') {
    throw new Error(`Runway generation failed: ${result.failure}`);
  }

  return result;
}

// -- Voice provider preference helper -----------------------------
// Returns the best available voice: Self-hosted -> VoxCPM -> ElevenLabs -> nexos
export function getPreferredVoiceProvider(): Provider | undefined {
  // $0 first: self-hosted XTTS-v2
  const xtts = getProvider('self-hosted-xtts');
  if (xtts && isProviderConfigured('self-hosted-xtts')) return xtts;

  // $0: self-hosted Kokoro
  const kokoro = getProvider('self-hosted-kokoro');
  if (kokoro && isProviderConfigured('self-hosted-kokoro')) return kokoro;

  // $0: VoxCPM
  const voxcpm = getProvider('voxcpm');
  if (voxcpm && isProviderConfigured('voxcpm')) return voxcpm;

  // Paid: ElevenLabs
  const elevenlabs = getProvider('elevenlabs');
  if (elevenlabs && isProviderConfigured('elevenlabs')) return elevenlabs;

  // Paid: nexos
  const nexos = getProvider('nexos');
  if (nexos && isProviderConfigured('nexos')) return nexos;

  return undefined;
}

// -- Video provider preference helper -----------------------------
// Returns the best available video: Self-hosted -> fal.ai -> Luma -> Runway
export function getPreferredVideoProvider(): Provider | undefined {
  // $0 first: self-hosted Wan 2.1
  const selfHosted = getProvider('self-hosted-video');
  if (selfHosted && isProviderConfigured('self-hosted-video')) return selfHosted;

  // Paid: fal.ai (Veo, Seedance, etc)
  const fal = getProvider('fal-video');
  if (fal && isProviderConfigured('fal-video')) return fal;

  // Paid: Luma
  const luma = getProvider('luma');
  if (luma && isProviderConfigured('luma')) return luma;

  // Paid: Runway
  const runway = getProvider('runway');
  if (runway && isProviderConfigured('runway')) return runway;

  return undefined;
}

// -- Provider preference helper -----------------------------------
// Returns the best available text provider: nexos.ai first, then direct providers
export function getPreferredTextProvider(): Provider | undefined {
  const nexos = getProvider('nexos');
  if (nexos && isProviderConfigured('nexos')) return nexos;

  const anthropic = getProvider('anthropic');
  if (anthropic && isProviderConfigured('anthropic')) return anthropic;

  const grok = getProvider('grok');
  if (grok && isProviderConfigured('grok')) return grok;

  return undefined;
}

// Check if nexos.ai is configured and should be used as the default gateway
export function shouldUseNexos(): boolean {
  return isProviderConfigured('nexos');
}
