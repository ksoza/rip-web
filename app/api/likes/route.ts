// app/api/likes/route.ts
// Like/unlike a creation — POST to toggle, GET to check status
import { NextRequest, NextResponse } from 'next/server';
import { toggleLike, isLiked, getLikeCount, getUserLikedCreations } from '@/lib/db';

// POST /api/likes — toggle like
export async function POST(req: NextRequest) {
  try {
    const { userId, creationId } = await req.json();
    if (!userId || !creationId) {
      return NextResponse.json({ error: 'userId and creationId required' }, { status: 400 });
    }
    const result = await toggleLike(userId, creationId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Like toggle error:', err);
    return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 });
  }
}

// GET /api/likes?userId=...&creationId=...  — check like status + count
// GET /api/likes?userId=...&creationIds=a,b,c — batch check
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const creationId = searchParams.get('creationId');
    const creationIds = searchParams.get('creationIds');

    // Batch check for multiple creations
    if (userId && creationIds) {
      const ids = creationIds.split(',').filter(Boolean);
      const likedSet = await getUserLikedCreations(userId, ids);
      const result: Record<string, boolean> = {};
      ids.forEach(id => { result[id] = likedSet.has(id); });
      return NextResponse.json({ likes: result });
    }

    // Single creation check
    if (creationId) {
      const count = await getLikeCount(creationId);
      const liked = userId ? await isLiked(userId, creationId) : false;
      return NextResponse.json({ liked, count });
    }

    return NextResponse.json({ error: 'creationId or creationIds required' }, { status: 400 });
  } catch (err: any) {
    console.error('Like check error:', err);
    return NextResponse.json({ error: 'Failed to check likes' }, { status: 500 });
  }
}
