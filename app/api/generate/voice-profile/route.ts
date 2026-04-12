// app/api/generate/voice-profile/route.ts
// Character voice profile management for VoxCPM
// GET  /api/generate/voice-profile?show=...&character=...
// POST /api/generate/voice-profile - Create/update voice profile
// PUT  /api/generate/voice-profile - Preview voice with current settings

import { NextRequest, NextResponse } from 'next/server';
import { SHOW_PROFILES, type ShowCharacter } from '@/lib/shows';
import { generateCharacterSpeech, isVoxCPMAvailable, buildVoiceDesignPrompt } from '@/lib/voxcpm';

// -- GET: List character voice profiles for a show ----------------

export async function GET(req: NextRequest) {
  const show = req.nextUrl.searchParams.get('show');
  const character = req.nextUrl.searchParams.get('character');

  if (!show) {
    // Return all shows with character voice info
    const shows = Object.entries(SHOW_PROFILES).map(([name, profile]) => ({
      show: name,
      id: profile.id,
      category: profile.category,
      audioTone: profile.audioTone,
      characters: profile.characters.map((c) => ({
        id: c.id,
        name: c.name,
        role: c.role,
        voiceDesc: c.voiceDesc,
        voxcpmPrompt: buildVoiceDesignPrompt(c.voiceDesc),
      })),
    }));

    return NextResponse.json({
      voxcpmAvailable: isVoxCPMAvailable(),
      totalShows: shows.length,
      totalCharacters: shows.reduce((sum, s) => sum + s.characters.length, 0),
      shows,
    });
  }

  // Return specific show's characters
  const profile = SHOW_PROFILES[show];
  if (!profile) {
    return NextResponse.json(
      { error: `Show "${show}" not found`, availableShows: Object.keys(SHOW_PROFILES) },
      { status: 404 }
    );
  }

  if (character) {
    const char = profile.characters.find(
      (c) => c.name.toLowerCase() === character.toLowerCase() || c.id === character
    );
    if (!char) {
      return NextResponse.json(
        { error: `Character "${character}" not found in ${show}` },
        { status: 404 }
      );
    }
    return NextResponse.json({
      show,
      character: {
        ...char,
        voxcpmPrompt: buildVoiceDesignPrompt(char.voiceDesc),
      },
      voxcpmAvailable: isVoxCPMAvailable(),
    });
  }

  return NextResponse.json({
    show,
    audioTone: profile.audioTone,
    characters: profile.characters.map((c) => ({
      ...c,
      voxcpmPrompt: buildVoiceDesignPrompt(c.voiceDesc),
    })),
    voxcpmAvailable: isVoxCPMAvailable(),
  });
}

// -- PUT: Preview a voice (generate short sample) -----------------

export async function PUT(req: NextRequest) {
  try {
    const { text, show, character, voiceDesc, referenceAudioUrl } = await req.json();

    const previewText = text || 'Hello, this is a voice preview for this character.';

    // Resolve voice description
    let resolvedDesc = voiceDesc;
    if (!resolvedDesc && show && character) {
      const profile = SHOW_PROFILES[show];
      if (profile) {
        const char = profile.characters.find(
          (c) => c.name.toLowerCase() === character.toLowerCase()
        );
        if (char) resolvedDesc = char.voiceDesc;
      }
    }

    if (!resolvedDesc && !referenceAudioUrl) {
      return NextResponse.json(
        { error: 'Provide voiceDesc, referenceAudioUrl, or show+character' },
        { status: 400 }
      );
    }

    const result = await generateCharacterSpeech(
      previewText,
      character || 'Preview',
      resolvedDesc || '',
      referenceAudioUrl ? { referenceAudioUrl } : undefined
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error, backend: result.backend }, { status: 500 });
    }

    return NextResponse.json({
      preview: true,
      url: result.audioUrl,
      duration: result.duration,
      backend: result.backend,
      voiceDesc: resolvedDesc,
      text: previewText,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
