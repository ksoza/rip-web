// app/api/video-test/route.ts
// Tests ALL video providers: Novita AI, fal.ai, Google Veo
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  const results: Record<string, string> = {};
  results.version = 'video-test-v2';
  results.timestamp = new Date().toISOString();

  const novitaKey = process.env.NOVITA_API_KEY || '';
  const falKey = process.env.FAL_KEY || '';
  const googleKey = process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY || '';

  results.NOVITA_API_KEY = novitaKey ? `set (${novitaKey.length}ch) prefix="${novitaKey.slice(0,8)}"` : 'MISSING';
  results.FAL_KEY = falKey ? `set (${falKey.length}ch)` : 'MISSING';
  results.GOOGLE_AI_KEY = googleKey ? `set (${googleKey.length}ch) prefix="${googleKey.slice(0,8)}"` : 'MISSING';

  // Test 1: Novita AI — submit a tiny Wan t2v job (cheapest)
  if (novitaKey) {
    try {
      const r = await fetch('https://api.novita.ai/v3/async/wan-t2v', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${novitaKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: 'spinning red cube test', width: 480, height: 480, steps: 10, fast_mode: true }),
      });
      const body = await r.text();
      if (r.ok) {
        results.novita_video = `OK — task submitted: ${body.slice(0, 150)}`;
      } else {
        results.novita_video = `HTTP ${r.status} — ${body.slice(0, 200)}`;
      }
    } catch (e: any) { results.novita_video = `ERROR: ${e.message}`; }
  } else {
    results.novita_video = 'SKIP (no key)';
  }

  // Test 2: fal.ai
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

  // Test 3: Google Veo
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
    results.google_veo = 'SKIP (no key)';
  }

  return NextResponse.json(results);
}
