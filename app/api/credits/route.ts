// app/api/credits/route.ts
// Credit balance, history, and purchase endpoints
import { NextRequest, NextResponse } from 'next/server';
import {
  getCreditBalance,
  getCreditHistory,
  grantDailyCredits,
  CREDIT_CONFIG,
} from '@/lib/credits';
import { FAL_IMAGE_MODELS, FAL_VIDEO_MODELS } from '@/lib/fal';

// GET /api/credits — Get balance, daily bonus, and pricing info
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')!;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Grant daily credits if eligible
    const daily = await grantDailyCredits(userId);
    const balance = await getCreditBalance(userId);
    const history = await getCreditHistory(userId, 20);

    // Build model pricing for the client
    const imageModels = Object.entries(FAL_IMAGE_MODELS).map(([key, m]) => ({
      key,
      name: m.name,
      credits: m.creditCost,
      tier: m.tier,
      description: m.description,
      tags: m.tags,
    }));

    const videoModels = Object.entries(FAL_VIDEO_MODELS).map(([key, m]) => ({
      key,
      name: m.name,
      credits: m.creditCost,
      tier: m.tier,
      description: m.description,
      tags: m.tags,
    }));

    return NextResponse.json({
      balance,
      dailyBonus: {
        granted: daily.granted,
        amount: daily.amount,
        dailyLimit: CREDIT_CONFIG.dailyFreeCredits,
      },
      packs: CREDIT_CONFIG.packs,
      models: { image: imageModels, video: videoModels },
      history: history.slice(0, 10),
    });
  } catch (err: any) {
    console.error('Credits GET error:', err);
    return NextResponse.json({ error: 'Failed to get credits' }, { status: 500 });
  }
}
