// app/api/diagnostic/route.ts
// Deep health check — no auth required
// Tests env vars, Groq, fal.ai, Anthropic connectivity
import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function GET() {
  const checks: Record<string, string> = {};

  const anthropicKey = process.env.ANTHROPIC_API_KEY || '';
  const falKey = process.env.FAL_KEY || '';
  const groqKey = process.env.GROQ_API_KEY || '';

  checks.GROQ_API_KEY = groqKey
    ? `set (${groqKey.length} chars) prefix="${groqKey.slice(0, 8)}..."`
    : 'MISSING';
  checks.ANTHROPIC_API_KEY = anthropicKey
    ? `set (${anthropicKey.length} chars) prefix="${anthropicKey.slice(0, 10)}..."`
    : 'MISSING';
  checks.FAL_KEY = falKey ? `set (${falKey.length} chars)` : 'MISSING';
  checks.HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY ? 'set' : 'MISSING';
  checks.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING';
  checks.SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'MISSING';
  checks.NODE_VERSION = process.version;

  // 1. Test Groq (primary LLM)
  if (groqKey) {
    try {
      const start = Date.now();
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqKey.trim()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          max_tokens: 8,
          messages: [{ role: 'user', content: 'Say OK' }],
        }),
      });
      const elapsed = Date.now() - start;
      if (res.ok) {
        const data = await res.json();
        checks.groq_llm = `OK in ${elapsed}ms — "${data.choices?.[0]?.message?.content?.trim()}"`;
      } else {
        checks.groq_llm = `HTTP ${res.status} in ${elapsed}ms — ${(await res.text()).slice(0, 200)}`;
      }
    } catch (e: any) {
      checks.groq_llm = `FAILED: ${e.message}`;
    }
  }

  // 2. Test fal.ai (image/video gen)
  if (falKey) {
    try {
      const start = Date.now();
      // Just test auth with a tiny cheap request
      const res = await fetch('https://queue.fal.run/fal-ai/flux/schnell', {
        method: 'POST',
        headers: { 'Authorization': `Key ${falKey.trim()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'test', num_images: 1, image_size: { width: 256, height: 256 } }),
      });
      const elapsed = Date.now() - start;
      if (res.ok) {
        checks.fal_ai = `OK in ${elapsed}ms`;
      } else {
        const body = await res.text();
        checks.fal_ai = `HTTP ${res.status} in ${elapsed}ms — ${body.slice(0, 200)}`;
      }
    } catch (e: any) {
      checks.fal_ai = `FAILED: ${e.message}`;
    }
  }

  // 3. Test Anthropic (paid fallback)
  if (anthropicKey) {
    try {
      const start = Date.now();
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey.trim(),
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8,
          messages: [{ role: 'user', content: 'Say OK' }],
        }),
      });
      const elapsed = Date.now() - start;
      const body = await res.text();
      checks.anthropic = `HTTP ${res.status} in ${elapsed}ms — ${body.slice(0, 200)}`;
    } catch (e: any) {
      checks.anthropic = `FAILED: ${e.message}`;
    }
  }

  // 4. Outbound connectivity
  try {
    const start = Date.now();
    const res = await fetch('https://httpbin.org/get');
    checks.outbound = `OK (${res.status}) in ${Date.now() - start}ms`;
  } catch (e: any) {
    checks.outbound = `FAILED: ${e.message}`;
  }

  return NextResponse.json({ ts: new Date().toISOString(), checks });
}
