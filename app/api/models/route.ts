// app/api/models/route.ts
// List available AI models and their credit costs
import { NextRequest, NextResponse } from 'next/server';
import { getAvailableModels, FAL_IMAGE_MODELS, FAL_VIDEO_MODELS } from '@/lib/fal';
import { createSupabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    let userTier = 'free';

    if (userId) {
      const supabase = createSupabaseAdmin();
      const { data: profile } = await supabase
        .from('profiles')
        .select('tier')
        .eq('id', userId)
        .single();
      userTier = profile?.tier || 'free';
    }

    const imageModels = getAvailableModels('image', userTier).map(m => ({
      key: Object.keys(FAL_IMAGE_MODELS).find(k => FAL_IMAGE_MODELS[k].id === m.id) || m.id,
      name: m.name,
      type: m.type,
      credits: m.creditCost,
      description: m.description,
      tier: m.tier,
      tags: m.tags,
    }));

    const videoModels = getAvailableModels('video', userTier).map(m => ({
      key: Object.keys(FAL_VIDEO_MODELS).find(k => FAL_VIDEO_MODELS[k].id === m.id) || m.id,
      name: m.name,
      type: m.type,
      credits: m.creditCost,
      description: m.description,
      tier: m.tier,
      tags: m.tags,
    }));

    // Also include legacy models
    const legacyModels = [
      { key: 'dalle', name: 'DALL·E 3', type: 'image', credits: 3, description: 'OpenAI image generation', tier: 'starter', tags: ['legacy', 'openai'] },
      { key: 'luma', name: 'Luma Dream Machine', type: 'video', credits: 15, description: 'Luma video generation', tier: 'creator', tags: ['legacy'] },
      { key: 'runway', name: 'Runway Gen-3', type: 'video', credits: 20, description: 'Runway ML video', tier: 'studio', tags: ['legacy', 'premium'] },
    ];

    return NextResponse.json({
      userTier,
      image: imageModels,
      video: videoModels,
      legacy: legacyModels,
    });
  } catch (err: any) {
    console.error('Models GET error:', err);
    return NextResponse.json({ error: 'Failed to list models' }, { status: 500 });
  }
}
