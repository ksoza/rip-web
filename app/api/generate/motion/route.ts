// app/api/generate/motion/route.ts
// TAP-style stick figure → precise character control via ControlNet
import { NextRequest, NextResponse } from 'next/server';
import { logGeneration } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')!;
    const { prompt, poseImageUrl, characterRef, options } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'REPLICATE_API_TOKEN not configured. Required for motion control.' }, { status: 503 });
    }

    const input: Record<string, any> = {
      prompt,
      num_samples: '1',
      image_resolution: '512',
      ddim_steps: options?.steps || 20,
      scale: options?.guidanceScale || 9,
    };

    if (poseImageUrl) {
      input.image = poseImageUrl;
    }

    const createRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'jagilley/controlnet-pose', input }),
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
      return NextResponse.json({ error: prediction.error || 'Motion generation failed' }, { status: 500 });
    }

    const output = Array.isArray(prediction.output) ? prediction.output : [prediction.output];

    await logGeneration({ userId, creationType: 'motion', model: 'controlnet-pose', prompt: prompt.slice(0, 500), result: { url: output[output.length - 1] }, success: true }).catch(() => {});

    return NextResponse.json({ type: 'motion', provider: 'controlnet-pose', url: output[output.length - 1], urls: output, prompt });
  } catch (err: any) {
    console.error('Motion control error:', err);
    return NextResponse.json({ error: err.message || 'Motion control failed' }, { status: 500 });
  }
}
