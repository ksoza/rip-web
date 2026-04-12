// app/api/knowledge/datasets/route.ts
// Manage show knowledge datasets in RAGflow
// GET  /api/knowledge/datasets - List all datasets
// POST /api/knowledge/datasets - Create or seed a show dataset

import { NextRequest, NextResponse } from 'next/server';
import {
  listDatasets,
  getOrCreateShowDataset,
  uploadShowKnowledge,
  isRagflowAvailable,
  getRagflowStatus,
} from '@/lib/ragflow';
import { SHOW_PROFILES } from '@/lib/shows';

export async function GET() {
  if (!isRagflowAvailable()) {
    return NextResponse.json({ error: 'RAGflow not configured', status: getRagflowStatus() }, { status: 503 });
  }

  const result = await listDatasets();
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ datasets: result.datasets });
}

export async function POST(req: NextRequest) {
  try {
    const { showId, showTitle, seedFromProfiles, customKnowledge } = await req.json();

    if (!isRagflowAvailable()) {
      return NextResponse.json({ error: 'RAGflow not configured', status: getRagflowStatus() }, { status: 503 });
    }

    if (!showTitle) {
      return NextResponse.json({ error: 'showTitle is required' }, { status: 400 });
    }

    // Get or create dataset for this show
    const dsResult = await getOrCreateShowDataset(showId || showTitle.toLowerCase().replace(/\s+/g, '-'), showTitle);
    if (!dsResult.success || !dsResult.dataset) {
      return NextResponse.json({ error: dsResult.error || 'Failed to create dataset' }, { status: 500 });
    }

    const dataset = dsResult.dataset;

    // Auto-seed from SHOW_PROFILES if requested
    if (seedFromProfiles) {
      const profile = SHOW_PROFILES[showTitle];
      if (profile) {
        const charProfiles = profile.characters
          .map((c) => [
            `Character: ${c.name}`,
            `Role: ${c.role}`,
            `Visual Description: ${c.visualDesc}`,
            `Voice Description: ${c.voiceDesc}`,
            '',
          ].join('\n'))
          .join('\n---\n\n');

        const visualGuide = [
          `Show: ${profile.title}`,
          `Category: ${profile.category}`,
          `Visual Style: ${profile.visualStyle}`,
          `Audio Tone: ${profile.audioTone}`,
        ].join('\n');

        const uploadResult = await uploadShowKnowledge(dataset.id, showTitle, {
          characterProfiles: charProfiles,
          visualGuide,
        });

        return NextResponse.json({
          dataset,
          seeded: true,
          uploaded: uploadResult.uploaded,
          errors: uploadResult.errors,
        });
      }
    }

    // Upload custom knowledge if provided
    if (customKnowledge) {
      const uploadResult = await uploadShowKnowledge(dataset.id, showTitle, customKnowledge);
      return NextResponse.json({
        dataset,
        uploaded: uploadResult.uploaded,
        errors: uploadResult.errors,
      });
    }

    return NextResponse.json({ dataset, seeded: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
