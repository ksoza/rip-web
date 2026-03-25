// app/api/transactions/route.ts
// Transaction history for wallet view — GET user's transaction history
import { NextRequest, NextResponse } from 'next/server';
import { getUserTransactions } from '@/lib/db';

// GET /api/transactions?userId=...&limit=50
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const transactions = await getUserTransactions(userId, limit);
    return NextResponse.json({ transactions });
  } catch (err: any) {
    console.error('Get transactions error:', err);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
