// app/api/generate/faceswap/route.ts
// Face swap for character consistency across scenes
import { NextRequest, NextResponse } from 'next/server';
import { logGeneration } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')!;
    const { sourceUrl, targetUrl } = await req.json();

    if (!sourceUrl || !targetUrl) {
      return NextResponse.json({ error: 'Missing sourceUrl, targetUrl,' }, { status: 400 });
    }

    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'REPLICATE_API_TOKEN not configured. Required for face swap.' }, { status: 503 });
    }

    const createRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'lucataco/faceswap',
        input: { source_image: sourceUrl, target_image: targetUrl },
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      return NextResponse.json({ error: `Replicate error: ${err}` }, { status: 500 });
    }

    let prediction = await createRes.json();

    const deadline = Date.now() + 120000;
    while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 2000));
      const poll = await fetch(prediction.urls.get, { headers: { 'Authorization': `Bearer ${token}` } });
      prediction = await poll.json();
    }

    if (prediction.status === 'failed') {
      return NextResponse.json({ error: prediction.error || 'Face swap failed' }, { status: 500 });
    }

    const output = typeof prediction.output === 'string' ? prediction.output : prediction.output?.[0];

    await logGeneration({ userId, creationType: 'faceswap', model: 'insightface', prompt: `swap: ${sourceUrl.slice(-30)} → ${targetUrl.slice(-30)}`, result: { url: output }, success: true }).catch(() => {});

    return NextResponse.json({ type: 'faceswap', provider: 'insightface', url: output, sourceUrl, targetUrl });
  } catch (err: any) {
    console.error('Face swap error:', err);
    return NextResponse.json({ error: err.message || 'Face swap failed' }, { status: 500 });
  }
}
