// app/api/knowledge/search/route.ts
// Search the show knowledge base via RAGflow
// POST /api/knowledge/search
// Body: { query, showId?, showTitle?, datasetIds?, topK? }

import { NextRequest, NextResponse } from 'next/server';
import {
  searchKnowledge,
  searchShowKnowledge,
  isRagflowAvailable,
  getRagflowStatus,
} from '@/lib/ragflow';

export async function POST(req: NextRequest) {
  try {
    const { query, showId, showTitle, datasetIds, topK } = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    if (!isRagflowAvailable()) {
      return NextResponse.json(
        { error: 'RAGflow not configured. Set RAGFLOW_API_URL and RAGFLOW_API_KEY.', status: getRagflowStatus() },
        { status: 503 }
      );
    }

    // Show-specific search
    if (showId && showTitle) {
      const result = await searchShowKnowledge(showId, showTitle, query, topK || 5);
      return NextResponse.json(result);
    }

    // Multi-dataset search
    if (datasetIds && Array.isArray(datasetIds)) {
      const result = await searchKnowledge(query, datasetIds, { topK: topK || 5 });
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: 'Provide showId+showTitle or datasetIds' },
      { status: 400 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET /api/knowledge/search - Status
export async function GET() {
  return NextResponse.json({
    provider: 'ragflow',
    ...getRagflowStatus(),
    features: [
      'Per-show knowledge datasets',
      'Script/dialogue search',
      'Character profile lookup',
      'Visual style reference',
      'Scene enrichment via RAG',
    ],
  });
}
