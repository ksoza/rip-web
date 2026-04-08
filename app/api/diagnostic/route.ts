// app/api/diagnostic/route.ts
// Deep health check — no auth required
// Tests env vars, Groq, fal.ai image gen, Anthropic
import { NextResponse } from 'next/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic'; // Prevent Vercel caching

export async function GET() {
  const checks: Record<string, string> = {};

  const anthropicKey = process.env.ANTHROPIC_API_KEY || '';
  const falKey = process.env.FAL_KEY || '';
  const groqKey = process.env.GROQ_API_KEY || '';
  const hfKey = process.env.HUGGINGFACE_API_KEY || '';

  checks.GROQ_API_KEY = groqKey
    ? `set (${groqKey.length} chars) prefix="${groqKey.slice(0, 8)}..."`
    : 'MISSING';
  checks.ANTHROPIC_API_KEY = anthropicKey
    ? `set (${anthropicKey.length} chars) prefix="${anthropicKey.slice(0, 10)}..."`
    : 'MISSING';
  checks.FAL_KEY = falKey
    ? `set (${falKey.length} chars) prefix="${falKey.slice(0, 8)}..." suffix="...${falKey.slice(-4)}"`
    : 'MISSING';
  checks.HUGGINGFACE_API_KEY = hfKey
    ? `set (${hfKey.length} chars) prefix="${hfKey.slice(0, 6)}..."`
    : 'MISSING';
  checks.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING';
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

  // 2. Test fal.ai — ACTUAL image generation (flux/schnell, cheapest)
  if (falKey) {
    try {
      const start = Date.now();
      const res = await fetch('https://queue.fal.run/fal-ai/flux/schnell', {
        method: 'POST',
        headers: { 'Authorization': `Key ${falKey.trim()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'a red circle on white background, simple test',
          num_images: 1,
          image_size: { width: 256, height: 256 },
        }),
      });
      const elapsed = Date.now() - start;
      const body = await res.text();
      if (res.ok) {
        try {
          const data = JSON.parse(body);
          if (data.images?.[0]?.url) {
            checks.fal_image_gen = `OK in ${elapsed}ms — image URL: ${data.images[0].url.slice(0, 60)}...`;
          } else if (data.request_id) {
            // Queued — check status
            const statusRes = await fetch(
              `https://queue.fal.run/fal-ai/flux/schnell/requests/${data.request_id}/status`,
              { headers: { 'Authorization': `Key ${falKey.trim()}` } }
            );
            const status = await statusRes.json();
            checks.fal_image_gen = `QUEUED in ${elapsed}ms — request_id: ${data.request_id}, status: ${status.status || 'unknown'}`;
          } else {
            checks.fal_image_gen = `UNEXPECTED in ${elapsed}ms — ${body.slice(0, 200)}`;
          }
        } catch {
          checks.fal_image_gen = `OK(${res.status}) in ${elapsed}ms but parse error — ${body.slice(0, 200)}`;
        }
      } else {
        checks.fal_image_gen = `HTTP ${res.status} in ${elapsed}ms — ${body.slice(0, 300)}`;
      }
    } catch (e: any) {
      checks.fal_image_gen = `FAILED: ${e.message}`;
    }
  }

  // 3. Test HuggingFace (image fallback)
  if (hfKey) {
    try {
      const start = Date.now();
      const res = await fetch('https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${hfKey.trim()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: 'a blue square on white background, simple test' }),
      });
      const elapsed = Date.now() - start;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('image')) {
        checks.huggingface_image = `OK in ${elapsed}ms — returned image (${ct})`;
      } else {
        const body = await res.text();
        checks.huggingface_image = `HTTP ${res.status} in ${elapsed}ms (${ct}) — ${body.slice(0, 200)}`;
      }
    } catch (e: any) {
      checks.huggingface_image = `FAILED: ${e.message}`;
    }
  }

  // 4. Test Anthropic (paid fallback LLM)
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

  // 5. Outbound connectivity
  try {
    const start = Date.now();
    const res = await fetch('https://httpbin.org/get');
    checks.outbound = `OK (${res.status}) in ${Date.now() - start}ms`;
  } catch (e: any) {
    checks.outbound = `FAILED: ${e.message}`;
  }

  return NextResponse.json({ ts: new Date().toISOString(), checks });
}
