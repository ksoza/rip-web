// app/api/create/narrate/route.ts
// Text-to-Speech narration via HuggingFace (free, no extra API key needed)
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

// Free TTS models on HuggingFace
const TTS_MODELS: Record<string, string> = {
  'narrator':    'facebook/mms-tts-eng',
  'cinematic':   'facebook/mms-tts-eng',
  'dramatic':    'facebook/mms-tts-eng',
};

export async function POST(req: NextRequest) {
  try {
    const { text, voice = 'narrator', sceneId } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'HUGGINGFACE_API_KEY not configured' }, { status: 500 });
    }

    const modelId = TTS_MODELS[voice] || TTS_MODELS['narrator'];

    const res = await fetch(`https://api-inference.huggingface.co/models/${modelId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text }),
    });

    if (res.status === 503) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({
        loading: true,
        estimated_time: data.estimated_time || 20,
        sceneId,
      }, { status: 503 });
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error(`TTS error (${res.status}):`, errText);
      return NextResponse.json({ error: `TTS failed: ${res.status}` }, { status: 500 });
    }

    const contentType = res.headers.get('content-type') || 'audio/wav';

    if (contentType.includes('audio') || contentType.includes('octet-stream')) {
      const buffer = await res.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      return NextResponse.json({
        audio: `data:audio/wav;base64,${base64}`,
        sceneId,
      });
    }

    return NextResponse.json({ error: 'Unexpected TTS response format' }, { status: 500 });

  } catch (error: any) {
    console.error('TTS error:', error);
    return NextResponse.json({ error: error.message || 'TTS failed' }, { status: 500 });
  }
}
