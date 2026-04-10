// app/api/generate/scene/route.ts
// Unified scene generation endpoint - video + audio generated together
// Uses Veo 3.1 (primary) or Seedance 2 (fallback) for synchronized output
//
// POST /api/generate/scene
// Body: { show, artStyle, sceneDescription, dialogue, characters, duration?, aspectRatio?, model?, seed? }
// Returns: { success, videoUrl, audioUrl?, model, audioSynced, prompt, requestId?, error? }

import { NextRequest, NextResponse } from 'next/server';
import { generateScene, type SceneInput } from '@/lib/scene-pipeline';
import { checkGenerationAccess, recordGeneration } from '@/lib/credits';
import { canAccessTier } from '@/lib/revenue';
import { SHOW_PROFILES, ART_STYLES, type ArtStyleId } from '@/lib/shows';
import { FAL_VIDEO_MODELS } from '@/lib/fal';
import { createSupabaseAdmin } from '@/lib/supabase';

export const maxDuration = 300; // 5 minute timeout for video generation

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // -- Auth --------------------------------------------------
    // Extract user from auth header or session
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const supabase = createSupabaseAdmin();
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Allow anonymous for development, but check credits for authenticated users
    if (userId) {
      const access = await checkGenerationAccess(userId);
      if (!access.allowed) {
        return NextResponse.json(
          { error: access.error || 'Generation limit reached', tier: access.tier },
          { status: 429 }
        );
      }

      // Check tier access for the requested model
      const modelKey = body.model || 'veo';
      const model = FAL_VIDEO_MODELS[modelKey];
      if (model && !canAccessTier(access.tier, model.tier)) {
        return NextResponse.json(
          { error: `${model.name} requires ${model.tier} tier or higher. Current tier: ${access.tier}`, tier: access.tier },
          { status: 403 }
        );
      }
    }

    // -- Validate input ---------------------------------------
    const {
      show,
      artStyle = 'source-faithful',
      sceneDescription = '',
      dialogue = [],
      characters = [],
      duration,
      aspectRatio = '16:9',
      model,
      seed,
    } = body;

    if (!show) {
      return NextResponse.json({ error: 'show is required' }, { status: 400 });
    }

    // Validate art style
    const validArtStyles = ART_STYLES.map(s => s.id);
    if (!validArtStyles.includes(artStyle)) {
      return NextResponse.json(
        { error: `Invalid artStyle. Valid options: ${validArtStyles.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate dialogue format
    if (dialogue.length > 0) {
      const invalid = dialogue.find((d: any) => !d.character || !d.line);
      if (invalid) {
        return NextResponse.json(
          { error: 'Each dialogue entry needs { character: string, line: string }' },
          { status: 400 }
        );
      }
    }

    // Need at least a scene description or dialogue
    if (!sceneDescription && dialogue.length === 0) {
      return NextResponse.json(
        { error: 'Provide at least sceneDescription or dialogue' },
        { status: 400 }
      );
    }

    // -- Generate scene ---------------------------------------
    const sceneInput: SceneInput = {
      show,
      artStyle: artStyle as ArtStyleId,
      sceneDescription,
      dialogue,
      characters,
      duration,
      aspectRatio,
      model,
      seed,
    };

    console.log(`[/api/generate/scene] Generating: show=${show}, style=${artStyle}, model=${model || 'veo'}, dialogue=${dialogue.length} lines`);
    
    const result = await generateScene(sceneInput);

    // Record generation for credit tracking
    if (userId && result.success) {
      await recordGeneration(userId);
    }

    if (!result.success) {
      console.error(`[/api/generate/scene] Failed: ${result.error}`);
      return NextResponse.json(
        { 
          error: result.error || 'Scene generation failed',
          model: result.model,
          prompt: result.prompt,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      videoUrl: result.videoUrl,
      audioUrl: result.audioUrl,
      model: result.model,
      audioSynced: result.audioSynced,
      prompt: result.prompt,
      requestId: result.requestId,
    });

  } catch (err) {
    console.error('[/api/generate/scene] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint - returns available shows, styles, and models for the UI
export async function GET() {
  const shows = Object.values(SHOW_PROFILES)
    .filter(s => s.id !== 'custom')
    .map(s => ({
      id: s.id,
      title: s.title,
      category: s.category,
      characters: s.characters.map(c => ({
        id: c.id,
        name: c.name,
        role: c.role,
        emoji: c.emoji,
      })),
    }));

  const artStyles = ART_STYLES.map(s => ({
    id: s.id,
    label: s.label,
    emoji: s.emoji,
    description: s.description,
  }));

  const models = Object.entries(FAL_VIDEO_MODELS)
    .filter(([key]) => ['veo', 'seedance-2'].includes(key))  // Only audio-capable models for scene gen
    .map(([key, m]) => ({
      key,
      name: m.name,
      description: m.description,
      tier: m.tier,
      audioCapable: true,
    }));

  return NextResponse.json({ shows, artStyles, models });
}
