// app/api/transactions/route.ts
// Transaction history for wallet view — GET user's transaction history
import { NextRequest, NextResponse } from 'next/server';
import { getUserTransactions } from '@/lib/db';

// GET /api/transactions — get authenticated user's transaction history
export async function GET(req: NextRequest) {
  try {
    // Use verified user from middleware (x-user-id header)
    const userId = req.headers.get('x-user-id')!;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    const transactions = await getUserTransactions(userId, limit);
    return NextResponse.json({ transactions });
  } catch (err: any) {
    console.error('Get transactions error:', err);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
