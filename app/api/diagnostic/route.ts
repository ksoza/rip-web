// app/api/diagnostic/route.ts
// Deep health check — tests all providers: Groq, Novita AI, fal.ai, HuggingFace, Google AI, Anthropic
import { NextResponse } from 'next/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, string> = {};

  const groqKey = process.env.GROQ_API_KEY || '';
  const anthropicKey = process.env.ANTHROPIC_API_KEY || '';
  const falKey = process.env.FAL_KEY || '';
  const hfKey = process.env.HUGGINGFACE_API_KEY || '';
  const googleKey = process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY || '';
  const novitaKey = process.env.NOVITA_API_KEY || '';

  checks.GROQ_API_KEY = groqKey ? `set (${groqKey.length} chars)` : 'MISSING';
  checks.NOVITA_API_KEY = novitaKey ? `set (${novitaKey.length} chars) prefix="${novitaKey.slice(0, 8)}..."` : 'MISSING — add NOVITA_API_KEY for video gen';
  checks.FAL_KEY = falKey ? `set (${falKey.length} chars)` : 'MISSING';
  checks.HUGGINGFACE_API_KEY = hfKey ? `set (${hfKey.length} chars)` : 'MISSING';
  checks.GOOGLE_AI_KEY = googleKey ? `set (${googleKey.length} chars) prefix="${googleKey.slice(0, 8)}..."` : 'MISSING';
  checks.ANTHROPIC_API_KEY = anthropicKey ? `set (${anthropicKey.length} chars)` : 'MISSING';
  checks.NODE_VERSION = process.version;

  // 1. Test Groq (LLM)
  if (groqKey) {
    try {
      const start = Date.now();
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqKey.trim()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'meta-llama/llama-4-scout-17b-16e-instruct', max_tokens: 8, messages: [{ role: 'user', content: 'Say OK' }] }),
      });
      const elapsed = Date.now() - start;
      if (res.ok) {
        const data = await res.json();
        checks.groq_llm = `OK in ${elapsed}ms — "${data.choices?.[0]?.message?.content?.trim()}"`;
      } else {
        checks.groq_llm = `HTTP ${res.status} in ${elapsed}ms — ${(await res.text()).slice(0, 200)}`;
      }
    } catch (e: any) { checks.groq_llm = `FAILED: ${e.message}`; }
  }

  // 2. Test Novita AI (video — Wan is cheapest to test, $0.03)
  if (novitaKey) {
    try {
      const start = Date.now();
      // Use correct Wan format: size not width/height
      const res = await fetch('https://api.novita.ai/v3/async/wan-t2v', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${novitaKey.trim()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'diagnostic test spinning cube', size: '832*480', steps: 10, fast_mode: true }),
      });
      const elapsed = Date.now() - start;
      const body = await res.text();
      if (res.ok) {
        try {
          const data = JSON.parse(body);
          checks.novita_video = `OK in ${elapsed}ms — task: ${data.task_id} (Wan t2v, balance OK!)`;
        } catch {
          checks.novita_video = `OK in ${elapsed}ms — ${body.slice(0, 100)}`;
        }
      } else if (body.includes('NOT_ENOUGH_BALANCE')) {
        checks.novita_video = `AUTH OK but $0 balance in ${elapsed}ms — top up at novita.ai/billing`;
      } else {
        checks.novita_video = `HTTP ${res.status} in ${elapsed}ms — ${body.slice(0, 200)}`;
      }
    } catch (e: any) { checks.novita_video = `FAILED: ${e.message}`; }
  }

  // 3. Test HuggingFace (image gen — free)
  if (hfKey) {
    try {
      const start = Date.now();
      const res = await fetch('https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${hfKey.trim()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: 'blue square on white' }),
      });
      const elapsed = Date.now() - start;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('image')) {
        checks.hf_image = `OK in ${elapsed}ms — returned image`;
      } else {
        checks.hf_image = `HTTP ${res.status} in ${elapsed}ms (${ct}) — ${(await res.text()).slice(0, 200)}`;
      }
    } catch (e: any) { checks.hf_image = `FAILED: ${e.message}`; }
  }

  // 4. Test fal.ai
  if (falKey) {
    try {
      const start = Date.now();
      const res = await fetch('https://queue.fal.run/fal-ai/flux/schnell', {
        method: 'POST',
        headers: { 'Authorization': `Key ${falKey.trim()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'test', num_images: 1, image_size: { width: 256, height: 256 } }),
      });
      const elapsed = Date.now() - start;
      const body = await res.text();
      checks.fal_ai = `HTTP ${res.status} in ${elapsed}ms — ${body.slice(0, 200)}`;
    } catch (e: any) { checks.fal_ai = `FAILED: ${e.message}`; }
  }

  // 5. Test Google Veo
  if (googleKey) {
    try {
      const start = Date.now();
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-lite-generate-preview:predictLongRunning?key=${googleKey.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instances: [{ prompt: 'spinning red cube' }], parameters: { sampleCount: 1 } }),
        }
      );
      const elapsed = Date.now() - start;
      const body = await res.text();
      if (res.ok) {
        try {
          const data = JSON.parse(body);
          checks.google_veo = `OK in ${elapsed}ms — operation: ${data.name || 'started'}`;
        } catch { checks.google_veo = `OK(${res.status}) in ${elapsed}ms — ${body.slice(0, 200)}`; }
      } else {
        checks.google_veo = `HTTP ${res.status} in ${elapsed}ms — ${body.slice(0, 200)}`;
      }
    } catch (e: any) { checks.google_veo = `FAILED: ${e.message}`; }
  }

  // 6. Anthropic
  if (anthropicKey) {
    try {
      const start = Date.now();
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': anthropicKey.trim(), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 8, messages: [{ role: 'user', content: 'Say OK' }] }),
      });
      checks.anthropic = `HTTP ${res.status} in ${Date.now() - start}ms — ${(await res.text()).slice(0, 200)}`;
    } catch (e: any) { checks.anthropic = `FAILED: ${e.message}`; }
  }

  return NextResponse.json({ ts: new Date().toISOString(), version: 'v7-novita-fixed', checks });
}
