// lib/groq.ts
// Groq — free tier LLM inference (14,400 requests/day)
// Lightning-fast inference on Llama 3, Mixtral, Gemma
// Free tier: no credit card, generous limits
// Docs: https://console.groq.com/docs
//
// Fallback chain: Pollinations → Groq → Paid APIs

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

// Available free models (sorted by capability)
export const GROQ_MODELS = {
  'llama-3.3-70b': { id: 'llama-3.3-70b-versatile', context: 128_000, speed: 'fast' },
  'llama-3.1-8b': { id: 'llama-3.1-8b-instant', context: 128_000, speed: 'fastest' },
  'mixtral-8x7b': { id: 'mixtral-8x7b-32768', context: 32_768, speed: 'fast' },
  'gemma2-9b': { id: 'gemma2-9b-it', context: 8_192, speed: 'fast' },
} as const;

export type GroqModelKey = keyof typeof GROQ_MODELS;

export interface GroqChatOptions {
  model?: GroqModelKey;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Check if Groq API key is configured */
export function isGroqConfigured(): boolean {
  return !!GROQ_API_KEY && GROQ_API_KEY.length > 10;
}

/**
 * Chat completion via Groq (free tier).
 * Uses OpenAI-compatible API format.
 */
export async function groqChat(
  messages: GroqMessage[],
  opts: GroqChatOptions = {},
): Promise<{ text: string; model: string; usage?: { prompt_tokens: number; completion_tokens: number } }> {
  if (!isGroqConfigured()) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const modelKey = opts.model || 'llama-3.3-70b';
  const modelConfig = GROQ_MODELS[modelKey];
  if (!modelConfig) throw new Error(`Unknown Groq model: ${modelKey}`);

  const allMessages: GroqMessage[] = [];
  if (opts.systemPrompt) {
    allMessages.push({ role: 'system', content: opts.systemPrompt });
  }
  allMessages.push(...messages);

  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelConfig.id,
      messages: allMessages,
      max_tokens: opts.maxTokens || 2048,
      temperature: opts.temperature ?? 0.7,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq error ${res.status}: ${body}`);
  }

  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content || '',
    model: modelConfig.id,
    usage: data.usage,
  };
}

/**
 * Simple text generation (single prompt).
 */
export async function groqGenerate(
  prompt: string,
  opts: GroqChatOptions = {},
): Promise<{ text: string; model: string }> {
  return groqChat([{ role: 'user', content: prompt }], opts);
}
