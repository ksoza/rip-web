// app/api/generate/tts/voxcpm/route.ts
// Character TTS via VoxCPM - Voice Design + Voice Cloning
// POST /api/generate/tts/voxcpm
// Body: { text, character?, show?, voiceDesc?, referenceAudioUrl?, referenceTranscript? }

import { NextRequest, NextResponse } from 'next/server';
import {
  generateSpeech,
  generateCharacterSpeech,
  isVoxCPMAvailable,
  getVoxCPMStatus,
  type VoxCPMConfig,
} from '@/lib/voxcpm';
import { SHOW_PROFILES } from '@/lib/shows';
import { logGeneration } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'anonymous';
    const {
      text,
      character,
      show,
      voiceDesc,
      referenceAudioUrl,
      referenceTranscript,
      styleControl,
      cfgValue,
      inferenceSteps,
    } = await req.json();

    if (!text || typeof text !== 'string' || text.length > 5000) {
      return NextResponse.json(
        { error: 'text is required (max 5000 chars)' },
        { status: 400 }
      );
    }

    // Check VoxCPM availability
    const status = getVoxCPMStatus();
    if (!status.available) {
      return NextResponse.json(
        {
          error: 'VoxCPM not configured. Set VOXCPM_API_URL or HUGGINGFACE_API_KEY.',
          status: status,
        },
        { status: 503 }
      );
    }

    // If show + character provided, look up voice description from profiles
    let resolvedVoiceDesc = voiceDesc;
    if (!resolvedVoiceDesc && show && character) {
      const profile = SHOW_PROFILES[show];
      if (profile) {
        const char = profile.characters.find(
          (c) => c.name.toLowerCase() === character.toLowerCase()
        );
        if (char) {
          resolvedVoiceDesc = char.voiceDesc;
        }
      }
    }

    // Generate speech
    const config: VoxCPMConfig = {
      voiceDesc: resolvedVoiceDesc,
      referenceAudioUrl,
      referenceTranscript,
      styleControl,
      cfgValue: cfgValue ?? 2.0,
      inferenceSteps: inferenceSteps ?? 10,
      temperature: 0.3,
    };

    const result = await generateSpeech(text, config);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, backend: result.backend },
        { status: 500 }
      );
    }

    // Log generation
    await logGeneration({
      userId,
      creationType: 'audio',
      model: `voxcpm-${result.backend}`,
      prompt: text.slice(0, 500),
      result: {
        character,
        show,
        duration: result.duration,
        backend: result.backend,
      },
      success: true,
    }).catch(() => {});

    return NextResponse.json({
      type: 'voice',
      provider: 'voxcpm',
      backend: result.backend,
      url: result.audioUrl,
      duration: result.duration,
      sampleRate: result.sampleRate,
      character,
      show,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[VoxCPM TTS]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET /api/generate/tts/voxcpm - Status check
export async function GET() {
  const status = getVoxCPMStatus();
  return NextResponse.json({
    provider: 'voxcpm',
    ...status,
    model: 'VoxCPM2 (2B params)',
    features: [
      'Voice Design (describe voice in text)',
      'Voice Cloning (5-sec reference audio)',
      'Controllable Voice Cloning (clone + style control)',
      '30 languages',
      '48kHz output',
    ],
  });
}
