// app/api/generate/tts/route.ts
// Phase 3A — Text-to-Speech API using ElevenLabs
// Generates character voice audio from dialogue text
import { NextRequest, NextResponse } from 'next/server';
import { logGeneration } from '@/lib/db';

// ── Voice Presets (mapped to ElevenLabs voice IDs) ──────────────
const VOICE_PRESETS: Record<string, { voiceId: string; name: string; settings?: any }> = {
  narrator:  { voiceId: 'pNInz6obpgDQGcFmaJgB', name: 'Adam',    settings: { stability: 0.7, similarity_boost: 0.8 } },
  character: { voiceId: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella',   settings: { stability: 0.5, similarity_boost: 0.9 } },
  dramatic:  { voiceId: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel',  settings: { stability: 0.6, similarity_boost: 0.85 } },
  casual:    { voiceId: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh',    settings: { stability: 0.55, similarity_boost: 0.75 } },
  whisper:   { voiceId: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli',    settings: { stability: 0.8, similarity_boost: 0.7 } },
  energetic: { voiceId: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam',     settings: { stability: 0.4, similarity_boost: 0.85 } },
};

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')!;
    const { text, voice = 'narrator', characterId } = await req.json();

    if (!text || typeof text !== 'string' || text.length > 5000) {
      return NextResponse.json({ error: 'text is required (max 5000 chars)' }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 503 });
    }

    const preset = VOICE_PRESETS[voice] || VOICE_PRESETS.narrator;
    const voiceId = preset.voiceId;

    // ── Call ElevenLabs TTS API ──────────────────────────────────
    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: preset.settings || {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.5,
          use_speaker_boost: true,
        },
      }),
    });

    if (!ttsRes.ok) {
      const errText = await ttsRes.text();
      console.error('ElevenLabs error:', errText);
      return NextResponse.json({ error: `ElevenLabs error: ${ttsRes.status}` }, { status: 500 });
    }

    // Convert audio to base64 data URL (or upload to storage)
    const audioBuffer = await ttsRes.arrayBuffer();
    const base64 = Buffer.from(audioBuffer).toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${base64}`;

    // Log generation
    await logGeneration({
      userId,
      creationType: 'audio',
      model: 'elevenlabs-tts',
      prompt: text.slice(0, 200),
      result: { voice, voiceName: preset.name, characterId, textLength: text.length },
      success: true,
    }).catch(() => {});

    return NextResponse.json({
      type: 'tts',
      provider: 'elevenlabs',
      voice: preset.name,
      url: audioUrl,
      duration: Math.ceil(text.length / 15), // Rough estimate: ~15 chars/sec
    });

  } catch (err: any) {
    console.error('TTS error:', err);
    return NextResponse.json({ error: err.message || 'TTS generation failed' }, { status: 500 });
  }
}
