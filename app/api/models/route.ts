// app/api/models/route.ts
// List available AI models by user tier
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
      description: m.description,
      tier: m.tier,
      tags: m.tags,
    }));

    const videoModels = getAvailableModels('video', userTier).map(m => ({
      key: Object.keys(FAL_VIDEO_MODELS).find(k => FAL_VIDEO_MODELS[k].id === m.id) || m.id,
      name: m.name,
      type: m.type,
      description: m.description,
      tier: m.tier,
      tags: m.tags,
    }));

    return NextResponse.json({
      tier: userTier,
      image: imageModels,
      video: videoModels,
      total: imageModels.length + videoModels.length,
    });
  } catch (error: any) {
    console.error('Models listing error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list models' },
      { status: 500 },
    );
  }
}
