// app/api/create/video-test/route.ts
// Quick test to verify video fallback chain is deployed
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  const results: Record<string, string> = {};
  results.version = 'video-test-v1';
  results.timestamp = new Date().toISOString();

  const falKey = process.env.FAL_KEY || '';
  const googleKey = process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY || '';
  const hfKey = process.env.HUGGINGFACE_API_KEY || '';

  results.FAL_KEY = falKey ? `set (${falKey.length}ch)` : 'MISSING';
  results.GOOGLE_AI_KEY = googleKey ? `set (${googleKey.length}ch) prefix="${googleKey.slice(0,8)}"` : 'MISSING — video gen needs this';
  results.HUGGINGFACE_API_KEY = hfKey ? `set (${hfKey.length}ch)` : 'MISSING';

  // Test 1: fal.ai
  if (falKey) {
    try {
      const r = await fetch('https://queue.fal.run/fal-ai/wan/v2.1/1.3b', {
        method: 'POST',
        headers: { 'Authorization': `Key ${falKey.trim()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'test', duration: 2 }),
      });
      results.fal_video = `HTTP ${r.status} — ${(await r.text()).slice(0, 150)}`;
    } catch (e: any) { results.fal_video = `ERROR: ${e.message}`; }
  } else {
    results.fal_video = 'SKIP (no key)';
  }

  // Test 2: Google Veo
  if (googleKey) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-lite-generate-preview:predictLongRunning?key=${googleKey.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instances: [{ prompt: 'spinning red cube test' }], parameters: { sampleCount: 1 } }),
        }
      );
      results.google_veo = `HTTP ${r.status} — ${(await r.text()).slice(0, 150)}`;
    } catch (e: any) { results.google_veo = `ERROR: ${e.message}`; }
  } else {
    results.google_veo = 'SKIP (no GOOGLE_AI_KEY)';
  }

  // Test 3: HuggingFace SVD
  if (hfKey) {
    try {
      const r = await fetch(
        'https://router.huggingface.co/hf-inference/models/stabilityai/stable-video-diffusion-img2vid-xt',
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${hfKey.trim()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs: 'https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/diffusers/svd/rocket.png' }),
        }
      );
      const ct = r.headers.get('content-type') || '';
      if (ct.includes('video')) {
        results.hf_svd = `OK — returned video (${ct})`;
      } else {
        results.hf_svd = `HTTP ${r.status} (${ct}) — ${(await r.text()).slice(0, 150)}`;
      }
    } catch (e: any) { results.hf_svd = `ERROR: ${e.message}`; }
  } else {
    results.hf_svd = 'SKIP (no key)';
  }

  return NextResponse.json(results);
}
