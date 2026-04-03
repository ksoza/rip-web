// app/api/staking/route.ts
// Staking operations — GET positions, POST stake, DELETE unstake
import { NextRequest, NextResponse } from 'next/server';
import { createStakingPosition, getUserStakingPositions, unstakePosition } from '@/lib/db';
import { logTransaction } from '@/lib/db';
import { PLAN_CONFIG } from '@/lib/revenue';

// GET /api/staking — get authenticated user's staking positions
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')!;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const positions = await getUserStakingPositions(userId);

    // Calculate total staked and rewards
    const totalStaked = positions
      .filter(p => p.status === 'active')
      .reduce((sum, p) => sum + Number(p.amount_sol), 0);

    const totalRewards = positions
      .reduce((sum, p) => sum + Number(p.rewards_earned), 0);

    return NextResponse.json({ positions, totalStaked, totalRewards });
  } catch (err: any) {
    console.error('Get staking error:', err);
    return NextResponse.json({ error: 'Failed to fetch staking positions' }, { status: 500 });
  }
}

// POST /api/staking — create a staking position
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')!;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amountSol, lockDays, tier } = await req.json();

    if (!amountSol || !lockDays) {
      return NextResponse.json({ error: 'amountSol and lockDays required' }, { status: 400 });
    }

    // Determine APY based on tier or default
    const apy = tier && PLAN_CONFIG[tier as keyof typeof PLAN_CONFIG]
      ? PLAN_CONFIG[tier as keyof typeof PLAN_CONFIG].apy / 100  // stored as % in DB
      : 12;

    const position = await createStakingPosition({
      userId,
      amountSol,
      apy,
      lockDays,
    });

    if (!position) {
      return NextResponse.json({ error: 'Failed to create staking position' }, { status: 500 });
    }

    // Log transaction
    await logTransaction({
      userId,
      type: 'staking',
      amountSol,
      metadata: { positionId: position.id, lockDays, apy },
    });

    return NextResponse.json({ position });
  } catch (err: any) {
    console.error('Stake error:', err);
    return NextResponse.json({ error: 'Failed to stake' }, { status: 500 });
  }
}

// DELETE /api/staking — unstake a position
export async function DELETE(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')!;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { positionId } = await req.json();

    if (!positionId) {
      return NextResponse.json({ error: 'positionId required' }, { status: 400 });
    }

    const success = await unstakePosition(positionId, userId);
    if (!success) {
      return NextResponse.json({ error: 'Position not found or not active' }, { status: 404 });
    }

    // Log transaction
    await logTransaction({
      userId,
      type: 'unstake',
      metadata: { positionId },
    });

    return NextResponse.json({ unstaked: true });
  } catch (err: any) {
    console.error('Unstake error:', err);
    return NextResponse.json({ error: 'Failed to unstake' }, { status: 500 });
  }
}
