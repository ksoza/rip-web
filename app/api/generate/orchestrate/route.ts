// app/api/generate/orchestrate/route.ts
// deer-flow-inspired episode generation orchestrator
// POST /api/generate/orchestrate
// Decomposes episode creation into parallel sub-tasks:
//   Phase 1: Research (RAGflow knowledge lookup per scene)
//   Phase 2: Script (refine with knowledge context)
//   Phase 3: Generate (parallel scene video+audio gen)
//   Phase 4: Quality check + assembly

import { NextRequest, NextResponse } from 'next/server';
import { buildEpisodePlan, executeEpisodePlan } from '@/lib/ghostface/orchestrator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      show,
      intent,
      scenes,
      artStyle,
      model,
    } = body;

    if (!show || typeof show !== 'string') {
      return NextResponse.json({ error: 'show is required' }, { status: 400 });
    }

    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return NextResponse.json(
        { error: 'scenes[] is required (array of { description, dialogue[], characters[] })' },
        { status: 400 }
      );
    }

    // Validate scene structure
    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i];
      if (!s.description || typeof s.description !== 'string') {
        return NextResponse.json(
          { error: `scenes[${i}].description is required` },
          { status: 400 }
        );
      }
      if (!Array.isArray(s.characters)) {
        scenes[i].characters = [];
      }
      if (!Array.isArray(s.dialogue)) {
        scenes[i].dialogue = [];
      }
    }

    // Build execution plan
    const plan = buildEpisodePlan({
      intent: intent || `Generate ${scenes.length} scene(s) for ${show}`,
      show,
      scenes,
      artStyle,
      model,
    });

    // Determine base URL for internal API calls
    const proto = req.headers.get('x-forwarded-proto') || 'http';
    const host = req.headers.get('host') || 'localhost:3000';
    const baseUrl = `${proto}://${host}`;

    // Execute the plan
    const result = await executeEpisodePlan(plan, baseUrl);

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET /api/generate/orchestrate -- info
export async function GET() {
  return NextResponse.json({
    name: 'GhOSTface Orchestrator',
    pattern: 'deer-flow (ByteDance SuperAgent)',
    description: 'Decomposes episode creation into parallel sub-tasks for faster, more accurate generation',
    phases: [
      { name: 'Research', description: 'RAGflow knowledge lookup per scene (parallel)' },
      { name: 'Script', description: 'Refine scene scripts with knowledge context' },
      { name: 'Generate', description: 'Parallel video+audio generation per scene' },
      { name: 'Finalize', description: 'Quality check + assembly into final episode' },
    ],
    features: [
      'Parallel scene generation (all scenes at once)',
      'RAGflow-enriched prompts for accuracy',
      'Automatic model fallback (Veo -> Seedance)',
      'Phase-by-phase progress tracking',
      'Context passing between phases',
    ],
  });
}
