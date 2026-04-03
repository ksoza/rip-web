// app/api/generate/lipsync/route.ts
// Lip sync generation: sync character video/image to audio
import { NextRequest, NextResponse } from 'next/server';
import { logGeneration } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')!;
    const { faceUrl, audioUrl, provider = 'wav2lip' } = await req.json();

    if (!faceUrl || !audioUrl) {
      return NextResponse.json({ error: 'Missing faceUrl, audioUrl,' }, { status: 400 });
    }

    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'REPLICATE_API_TOKEN not configured. Required for lip sync.' }, { status: 503 });
    }

    const createRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'devxpy/cog-wav2lip',
        input: { face: faceUrl, audio: audioUrl, pads: '0 10 0 0', smooth: true, fps: 25 },
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      return NextResponse.json({ error: `Replicate error: ${err}` }, { status: 500 });
    }

    let prediction = await createRes.json();

    const deadline = Date.now() + 300000;
    while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 3000));
      const poll = await fetch(prediction.urls.get, { headers: { 'Authorization': `Bearer ${token}` } });
      prediction = await poll.json();
    }

    if (prediction.status === 'failed') {
      return NextResponse.json({ error: prediction.error || 'Lip sync failed' }, { status: 500 });
    }

    const output = typeof prediction.output === 'string' ? prediction.output : prediction.output?.[0];

    await logGeneration({ userId, creationType: 'lipsync', model: 'wav2lip', result: { url: output }, success: true }).catch(() => {});

    return NextResponse.json({ type: 'lipsync', provider: 'wav2lip', url: output, faceUrl, audioUrl });
  } catch (err: any) {
    console.error('Lipsync error:', err);
    return NextResponse.json({ error: err.message || 'Lip sync failed' }, { status: 500 });
  }
}
