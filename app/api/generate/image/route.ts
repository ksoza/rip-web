// app/api/generate/image/route.ts
// Image generation: DALL·E 3, Seedream, Flux via Replicate, or nexos.ai gateway
import { NextRequest, NextResponse } from 'next/server';
import { isNexosConfigured, nexosImageGenerate } from '@/lib/nexos';
import { logGeneration } from '@/lib/db';

async function generateWithDalle(prompt: string, options: any = {}) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not configured');

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: options.size || '1024x1024',
      quality: options.quality || 'standard',
      style: options.style || 'vivid',
    }),
  });
  if (!res.ok) throw new Error(`DALL·E error: ${await res.text()}`);
  const data = await res.json();
  return { url: data.data[0].url, revised_prompt: data.data[0].revised_prompt };
}

async function generateWithReplicate(model: string, prompt: string, options: any = {}) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error('REPLICATE_API_TOKEN not configured');

  const input: any = { prompt, ...options };

  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'wait' },
    body: JSON.stringify({ model, input }),
  });
  if (!res.ok) throw new Error(`Replicate error: ${await res.text()}`);
  const prediction = await res.json();

  // If still processing, poll
  if (prediction.status === 'processing' || prediction.status === 'starting') {
    let result = prediction;
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const poll = await fetch(result.urls.get, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      result = await poll.json();
      if (result.status === 'succeeded') return { url: Array.isArray(result.output) ? result.output[0] : result.output };
      if (result.status === 'failed') throw new Error(result.error || 'Generation failed');
    }
    throw new Error('Generation timed out');
  }

  return { url: Array.isArray(prediction.output) ? prediction.output[0] : prediction.output };
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')!;
    const { prompt, provider, style, size, characterRef, options } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    // Build enhanced prompt for character consistency
    let enhancedPrompt = prompt;
    if (characterRef) {
      enhancedPrompt = `${characterRef.style} style. Character: ${characterRef.name} - ${characterRef.description}. Traits: ${characterRef.traits?.join(', ')}. Scene: ${prompt}`;
    }

    let result;
    const selectedProvider = provider || 'dalle';

    // Route through nexos.ai if configured and provider supports it (DALL·E compatible)
    if (selectedProvider === 'dalle' && isNexosConfigured()) {
      result = await nexosImageGenerate(enhancedPrompt, { size, quality: options?.quality });
    } else {
      switch (selectedProvider) {
        case 'dalle':
          result = await generateWithDalle(enhancedPrompt, { size, style, ...options });
          break;
        case 'seedream':
          result = await generateWithReplicate('bytedance/seedream-3', enhancedPrompt, {
            aspect_ratio: size === '1792x1024' ? '16:9' : size === '1024x1792' ? '9:16' : '1:1',
            ...options,
          });
          break;
        case 'flux':
          result = await generateWithReplicate('black-forest-labs/flux-1.1-pro', enhancedPrompt, {
            aspect_ratio: size === '1792x1024' ? '16:9' : size === '1024x1792' ? '9:16' : '1:1',
            ...options,
          });
          break;
        case 'nexos':
          // Explicitly using nexos.ai for image gen
          if (!isNexosConfigured()) {
            return NextResponse.json({ error: 'NEXOS_API_KEY not configured' }, { status: 503 });
          }
          result = await nexosImageGenerate(enhancedPrompt, { size, quality: options?.quality });
          break;
        default:
          return NextResponse.json({ error: `Unknown provider: ${selectedProvider}` }, { status: 400 });
      }
    }

    // Log generation
    await logGeneration({
      userId,
      creationType: 'image',
      model: selectedProvider,
      prompt: enhancedPrompt.slice(0, 500),
      result: { url: result.url },
      success: true,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      url: result.url,
      provider: provider || 'dalle',
      revised_prompt: (result as any).revised_prompt,
    });
  } catch (err: any) {
    console.error('Image generation error:', err);
    const msg = err.message || 'Image generation failed';
    const isConfig = msg.includes('not configured');
    return NextResponse.json(
      { error: msg, configError: isConfig },
      { status: isConfig ? 503 : 500 }
    );
  }
}
