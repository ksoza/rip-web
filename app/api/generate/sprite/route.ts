// app/api/generate/sprite/route.ts
// Sprite sheet generation for crisp characters with directional views
import { NextRequest, NextResponse } from 'next/server';
import { logGeneration } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')!;
    const { prompt, characterName, style = 'anime', directions = 'front,back,left,right', provider = 'flux' } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const token = process.env.REPLICATE_API_TOKEN || process.env.OPENAI_API_KEY;
    if (!token) {
      return NextResponse.json({ error: 'No image AI provider configured. Add REPLICATE_API_TOKEN or OPENAI_API_KEY.' }, { status: 503 });
    }

    const spritePrompt = [
      `Character sprite sheet for "${characterName || 'character'}"`,
      `${style} style, clean lines, transparent background`,
      `Views: ${directions.replace(/,/g, ', ')}`,
      `Character description: ${prompt}`,
      'Professional sprite sheet layout, evenly spaced, consistent proportions',
      'White/clean background, full body, high detail',
    ].join('. ');

    let result: { url: string };
    let modelUsed = 'unknown';

    if (process.env.REPLICATE_API_TOKEN) {
      const model = provider === 'seedream' ? 'bytedance/seedream-3' : 'black-forest-labs/flux-1.1-pro';
      modelUsed = model;

      const createRes = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
          'Prefer': 'wait',
        },
        body: JSON.stringify({ model, input: { prompt: spritePrompt, aspect_ratio: '1:1', num_inference_steps: 30 } }),
      });

      if (!createRes.ok) throw new Error(`Replicate error: ${await createRes.text()}`);
      let prediction = await createRes.json();

      if (prediction.status !== 'succeeded') {
        for (let i = 0; i < 60; i++) {
          await new Promise(r => setTimeout(r, 2000));
          const poll = await fetch(prediction.urls.get, { headers: { 'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}` } });
          prediction = await poll.json();
          if (prediction.status === 'succeeded') break;
          if (prediction.status === 'failed') throw new Error(prediction.error);
        }
      }
      result = { url: Array.isArray(prediction.output) ? prediction.output[0] : prediction.output };
    } else {
      modelUsed = 'dall-e-3';
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'dall-e-3', prompt: spritePrompt, n: 1, size: '1024x1024', quality: 'hd' }),
      });
      if (!res.ok) throw new Error(`DALL-E error: ${await res.text()}`);
      const data = await res.json();
      result = { url: data.data[0].url };
    }

    await logGeneration({ userId, creationType: 'sprite', model: modelUsed, prompt: spritePrompt.slice(0, 500), result: { url: result.url }, success: true }).catch(() => {});

    return NextResponse.json({ type: 'sprite', provider, url: result.url, characterName: characterName || 'character', directions: directions.split(','), style });
  } catch (err: any) {
    console.error('Sprite generation error:', err);
    return NextResponse.json({ error: err.message || 'Sprite generation failed' }, { status: 500 });
  }
}
