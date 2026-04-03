// lib/nexos.ts
// nexos.ai — OpenAI-compatible AI gateway providing access to 200+ models
// Single API key, single endpoint, all major models

const NEXOS_BASE_URL = process.env.NEXOS_BASE_URL || 'https://api.nexos.ai/v1';

// ── Supported Models ────────────────────────────────────────────
export const NEXOS_MODELS = {
  // Anthropic
  'claude-sonnet-4.5':  'claude-sonnet-4.5',
  'claude-opus-4.6':    'claude-opus-4.6',
  // OpenAI
  'gpt-4.1':            'gpt-4.1',
  'gpt-4.1-mini':       'gpt-4.1-mini',
  'gpt-4.1-nano':       'gpt-4.1-nano',
  // Google
  'gemini-3-flash':     'gemini-3-flash',
  'gemini-3-pro':       'gemini-3-pro',
  // xAI
  'grok-4':             'grok-4',
  'grok-4-mini':        'grok-4-mini',
} as const;

export type NexosModel = keyof typeof NEXOS_MODELS;

// ── Configuration ───────────────────────────────────────────────
export function isNexosConfigured(): boolean {
  const key = process.env.NEXOS_API_KEY;
  return !!key && key.length > 5;
}

export function getNexosConfig() {
  return {
    apiKey:  process.env.NEXOS_API_KEY || '',
    baseUrl: NEXOS_BASE_URL,
  };
}

// ── Types ───────────────────────────────────────────────────────
interface NexosChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface NexosChatOptions {
  model?: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  stop?: string[];
}

interface NexosChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ── Chat Completions ────────────────────────────────────────────
export async function nexosChat(
  messages: NexosChatMessage[],
  options: NexosChatOptions = {},
): Promise<NexosChatResponse> {
  const config = getNexosConfig();
  if (!config.apiKey) {
    throw new Error('NEXOS_API_KEY not configured');
  }

  const model = options.model || 'claude-sonnet-4.5';

  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options.max_tokens ?? 2048,
      temperature: options.temperature,
      top_p: options.top_p,
      stream: options.stream ?? false,
      stop: options.stop,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`nexos.ai API error (${res.status}): ${errText}`);
  }

  return res.json();
}

// ── Streaming Chat Completions ──────────────────────────────────
export async function nexosChatStream(
  messages: NexosChatMessage[],
  options: Omit<NexosChatOptions, 'stream'> = {},
): Promise<ReadableStream<Uint8Array>> {
  const config = getNexosConfig();
  if (!config.apiKey) {
    throw new Error('NEXOS_API_KEY not configured');
  }

  const model = options.model || 'claude-sonnet-4.5';

  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options.max_tokens ?? 2048,
      temperature: options.temperature,
      top_p: options.top_p,
      stream: true,
      stop: options.stop,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`nexos.ai streaming error (${res.status}): ${errText}`);
  }

  if (!res.body) {
    throw new Error('nexos.ai returned no response body for stream');
  }

  return res.body;
}

// ── Simple Text Generation Helper ───────────────────────────────
export async function nexosGenerate(
  prompt: string,
  options: NexosChatOptions & { system?: string } = {},
): Promise<string> {
  const messages: NexosChatMessage[] = [];

  if (options.system) {
    messages.push({ role: 'system', content: options.system });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await nexosChat(messages, options);
  return response.choices[0]?.message?.content || '';
}

// ── Image Generation (OpenAI-compatible) ────────────────────────
export async function nexosImageGenerate(
  prompt: string,
  options: { model?: string; size?: string; quality?: string; n?: number } = {},
): Promise<{ url: string; revised_prompt?: string }> {
  const config = getNexosConfig();
  if (!config.apiKey) {
    throw new Error('NEXOS_API_KEY not configured');
  }

  const res = await fetch(`${config.baseUrl}/images/generations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model || 'dall-e-3',
      prompt,
      n: options.n || 1,
      size: options.size || '1024x1024',
      quality: options.quality || 'standard',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`nexos.ai image generation error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return {
    url: data.data[0]?.url,
    revised_prompt: data.data[0]?.revised_prompt,
  };
}

// ── Audio / TTS (OpenAI-compatible) ─────────────────────────────
export async function nexosTTS(
  text: string,
  options: { model?: string; voice?: string } = {},
): Promise<ArrayBuffer> {
  const config = getNexosConfig();
  if (!config.apiKey) {
    throw new Error('NEXOS_API_KEY not configured');
  }

  const res = await fetch(`${config.baseUrl}/audio/speech`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model || 'tts-1',
      input: text,
      voice: options.voice || 'alloy',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`nexos.ai TTS error (${res.status}): ${errText}`);
  }

  return res.arrayBuffer();
}
