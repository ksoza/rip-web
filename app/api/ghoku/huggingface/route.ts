// app/api/ghoku/huggingface/route.ts
// Gh.O.K.U. — HuggingFace Integration: Model Search + Inference
import { NextRequest, NextResponse } from 'next/server';

const HF_API = 'https://huggingface.co/api';
const HF_INFERENCE = 'https://api-inference.huggingface.co/models';

// ── Model Search ────────────────────────────────────────────────
async function searchModels(query: string, task?: string, limit = 20) {
  const params = new URLSearchParams({
    search: query,
    limit: String(limit),
    sort: 'downloads',
    direction: '-1',
  });
  if (task) params.set('pipeline_tag', task);

  const resp = await fetch(`${HF_API}/models?${params}`, {
    headers: { 'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}` },
  });
  if (!resp.ok) throw new Error(`HF search failed: ${resp.status}`);
  return resp.json();
}

// ── Model Info ──────────────────────────────────────────────────
async function getModelInfo(modelId: string) {
  const resp = await fetch(`${HF_API}/models/${modelId}`, {
    headers: { 'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}` },
  });
  if (!resp.ok) throw new Error(`HF model info failed: ${resp.status}`);
  return resp.json();
}

// ── Inference (text generation) ─────────────────────────────────
async function runInference(modelId: string, inputs: string, parameters?: Record<string, unknown>) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) throw new Error('HUGGINGFACE_API_KEY not configured');

  const resp = await fetch(`${HF_INFERENCE}/${modelId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs,
      parameters: {
        max_new_tokens: 512,
        temperature: 0.7,
        return_full_text: false,
        ...parameters,
      },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    // Model loading — return estimated time
    if (resp.status === 503) {
      try {
        const err = JSON.parse(errText);
        return { loading: true, estimated_time: err.estimated_time || 30 };
      } catch {
        return { loading: true, estimated_time: 30 };
      }
    }
    throw new Error(`HF inference failed (${resp.status}): ${errText}`);
  }

  const contentType = resp.headers.get('content-type') || '';

  // Image responses (Stable Diffusion, Flux, etc)
  if (contentType.includes('image')) {
    const buffer = await resp.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return { type: 'image', data: `data:${contentType};base64,${base64}` };
  }

  // Audio responses
  if (contentType.includes('audio')) {
    const buffer = await resp.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return { type: 'audio', data: `data:${contentType};base64,${base64}` };
  }

  // Text / JSON responses
  return resp.json();
}

// ── Trending Models ─────────────────────────────────────────────
async function getTrending(task?: string) {
  const params = new URLSearchParams({
    sort: 'likes7d',
    direction: '-1',
    limit: '12',
  });
  if (task) params.set('pipeline_tag', task);

  const resp = await fetch(`${HF_API}/models?${params}`, {
    headers: { 'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}` },
  });
  if (!resp.ok) throw new Error(`HF trending failed: ${resp.status}`);
  return resp.json();
}

// ── Route Handler ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { action, query, task, modelId, inputs, parameters } = await req.json();

    if (!process.env.HUGGINGFACE_API_KEY) {
      return NextResponse.json(
        { error: 'HUGGINGFACE_API_KEY not configured. Set it in Vercel environment variables.' },
        { status: 200 }
      );
    }

    switch (action) {
      case 'search': {
        const models = await searchModels(query || '', task);
        return NextResponse.json({ models });
      }
      case 'info': {
        if (!modelId) return NextResponse.json({ error: 'modelId required' }, { status: 400 });
        const info = await getModelInfo(modelId);
        return NextResponse.json({ info });
      }
      case 'inference': {
        if (!modelId || !inputs) {
          return NextResponse.json({ error: 'modelId and inputs required' }, { status: 400 });
        }
        const result = await runInference(modelId, inputs, parameters);
        return NextResponse.json({ result });
      }
      case 'trending': {
        const models = await getTrending(task);
        return NextResponse.json({ models });
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    console.error('HuggingFace API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
