// app/api/generate/video/route.ts
// Video generation via Luma Dream Machine, Runway ML, Kling
// nexos.ai can be used for prompt enhancement before video generation
import { NextRequest, NextResponse } from 'next/server';
import { isNexosConfigured, nexosGenerate } from '@/lib/nexos';
import { logGeneration } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')!;
    const { prompt, provider = 'luma', imageUrl, duration = 5, aspectRatio = '16:9' } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    let result: { url: string; id: string; duration: number };

    switch (provider) {
      case 'luma': {
        const key = process.env.LUMA_API_KEY;
        if (!key) return NextResponse.json({ error: 'LUMA_API_KEY not configured. Add your Luma Dream Machine API key.' }, { status: 500 });

        const body: any = {
          prompt,
          aspect_ratio: aspectRatio,
          loop: false,
        };
        if (imageUrl) {
          body.keyframes = { frame0: { type: 'image', url: imageUrl } };
        }

        const createRes = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!createRes.ok) {
          const err = await createRes.text();
          return NextResponse.json({ error: `Luma error: ${err}` }, { status: 500 });
        }

        let gen = await createRes.json();

        // Poll for completion (max 5 min for video)
        const deadline = Date.now() + 300000;
        while (gen.state !== 'completed' && gen.state !== 'failed' && Date.now() < deadline) {
          await new Promise(r => setTimeout(r, 5000));
          const pollRes = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${gen.id}`, {
            headers: { 'Authorization': `Bearer ${key}` },
          });
          gen = await pollRes.json();
        }

        if (gen.state === 'failed') {
          return NextResponse.json({ error: gen.failure_reason || 'Video generation failed' }, { status: 500 });
        }

        result = {
          url: gen.assets?.video || gen.video?.url || '',
          id: gen.id,
          duration: 5,
        };
        break;
      }

      case 'runway': {
        const key = process.env.RUNWAY_API_KEY;
        if (!key) return NextResponse.json({ error: 'RUNWAY_API_KEY not configured. Add your Runway ML API key.' }, { status: 500 });

        const body: any = {
          promptText: prompt,
          model: 'gen3a_turbo',
          duration: Math.min(duration, 10),
          watermark: false,
        };
        if (imageUrl) body.promptImage = imageUrl;

        const createRes = await fetch('https://api.dev.runwayml.com/v1/image_to_video', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'X-Runway-Version': '2024-11-06',
          },
          body: JSON.stringify(body),
        });

        if (!createRes.ok) {
          const err = await createRes.text();
          return NextResponse.json({ error: `Runway error: ${err}` }, { status: 500 });
        }

        let task = await createRes.json();

        // Poll for completion
        const deadline = Date.now() + 300000;
        while (task.status !== 'SUCCEEDED' && task.status !== 'FAILED' && Date.now() < deadline) {
          await new Promise(r => setTimeout(r, 5000));
          const pollRes = await fetch(`https://api.dev.runwayml.com/v1/tasks/${task.id}`, {
            headers: { 'Authorization': `Bearer ${key}`, 'X-Runway-Version': '2024-11-06' },
          });
          task = await pollRes.json();
        }

        if (task.status === 'FAILED') {
          return NextResponse.json({ error: 'Runway generation failed' }, { status: 500 });
        }

        result = {
          url: task.output?.[0] || '',
          id: task.id,
          duration,
        };
        break;
      }

      case 'kling': {
        const token = process.env.REPLICATE_API_TOKEN;
        if (!token) return NextResponse.json({ error: 'REPLICATE_API_TOKEN not configured' }, { status: 500 });

        const createRes = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'kwaivgi/kling-v1',
            input: { prompt, duration: String(duration) },
          }),
        });

        if (!createRes.ok) {
          const err = await createRes.text();
          return NextResponse.json({ error: `Replicate error: ${err}` }, { status: 500 });
        }

        let prediction = await createRes.json();
        const deadline = Date.now() + 300000;
        while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && Date.now() < deadline) {
          await new Promise(r => setTimeout(r, 5000));
          const pollRes = await fetch(prediction.urls.get, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          prediction = await pollRes.json();
        }

        if (prediction.status === 'failed') {
          return NextResponse.json({ error: prediction.error || 'Failed' }, { status: 500 });
        }

        const output = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
        result = { url: output, id: prediction.id, duration };
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown video provider: ${provider}` }, { status: 400 });
    }

    // Log generation
    await logGeneration({
      userId,
      creationType: 'video',
      model: provider,
      prompt: prompt.slice(0, 500),
      result: { url: result.url, id: result.id },
      success: true,
    }).catch(() => {});

    return NextResponse.json({ type: 'video', provider, ...result, prompt });

  } catch (err: any) {
    console.error('Video generation error:', err);
    return NextResponse.json({ error: 'Video generation failed' }, { status: 500 });
  }
}
