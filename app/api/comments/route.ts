// app/api/comments/route.ts
// CRUD for creation comments — GET list, POST create, DELETE remove
import { NextRequest, NextResponse } from 'next/server';
import { addComment, getComments, getReplies, deleteComment } from '@/lib/db';

// GET /api/comments?creationId=...&parentId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const creationId = searchParams.get('creationId');
    const parentId = searchParams.get('parentId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    if (parentId) {
      const replies = await getReplies(parentId);
      return NextResponse.json({ comments: replies });
    }

    if (!creationId) {
      return NextResponse.json({ error: 'creationId required' }, { status: 400 });
    }

    const comments = await getComments(creationId, limit);
    return NextResponse.json({ comments });
  } catch (err: any) {
    console.error('Get comments error:', err);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

// POST /api/comments — create a comment
export async function POST(req: NextRequest) {
  try {
    // Use verified user from middleware (x-user-id header)
    const userId = req.headers.get('x-user-id')!;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { creationId, content, parentId } = await req.json();

    if (!creationId || !content?.trim()) {
      return NextResponse.json({ error: 'creationId and content required' }, { status: 400 });
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: 'Comment too long (max 2000 chars)' }, { status: 400 });
    }

    const comment = await addComment({
      creationId,
      userId,
      content: content.trim(),
      parentId,
    });

    return NextResponse.json({ comment });
  } catch (err: any) {
    console.error('Add comment error:', err);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}

// DELETE /api/comments — remove own comment
export async function DELETE(req: NextRequest) {
  try {
    // Use verified user from middleware (x-user-id header)
    const userId = req.headers.get('x-user-id')!;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { commentId } = await req.json();

    if (!commentId) {
      return NextResponse.json({ error: 'commentId required' }, { status: 400 });
    }

    const success = await deleteComment(commentId, userId);
    if (!success) {
      return NextResponse.json({ error: 'Comment not found or not yours' }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    console.error('Delete comment error:', err);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
