// app/api/credits/route.ts
// Subscription status and available models endpoint
import { NextRequest, NextResponse } from 'next/server';
import { getSubscriptionStatus } from '@/lib/credits';
import { getAvailableModels } from '@/lib/fal';
import { PLAN_CONFIG } from '@/lib/revenue';

// GET /api/credits — Get subscription status and available models
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')!;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await getSubscriptionStatus(userId);

    // Build model list for the client
    const imageModels = getAvailableModels('image', subscription.tier).map(m => ({
      key: m.id,
      name: m.name,
      tier: m.tier,
      description: m.description,
      tags: m.tags,
    }));

    const videoModels = getAvailableModels('video', subscription.tier).map(m => ({
      key: m.id,
      name: m.name,
      tier: m.tier,
      description: m.description,
      tags: m.tags,
    }));

    return NextResponse.json({
      subscription,
      models: { image: imageModels, video: videoModels },
      plans: Object.entries(PLAN_CONFIG).map(([key, config]) => ({
        tier: key,
        label: config.label,
        price: config.price,
        models: config.models,
        unlimited: config.generations === -1,
      })),
    });
  } catch (error: any) {
    console.error('Subscription status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get subscription status' },
      { status: 500 },
    );
  }
}
