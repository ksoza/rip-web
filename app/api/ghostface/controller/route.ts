// app/api/ghostface/controller/route.ts
// Franken-Claude API — Viktor + Claude meta-controller
// POST /api/ghostface/controller

import { NextResponse } from 'next/server';
import controller from '@/lib/ghostface/controller';

export const maxDuration = 120; // Up to 2 min for multi-step orchestration

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mode = 'orchestrate' } = body;

    // ── Mode: Plan only (no execution) ──
    if (mode === 'plan') {
      const { intent, ip } = body;
      if (!intent) {
        return NextResponse.json({ error: 'Missing: intent' }, { status: 400 });
      }
      const planText = await controller.plan(intent, ip);
      return NextResponse.json({ mode: 'plan', plan: planText });
    }

    // ── Mode: Quick advice ──
    if (mode === 'advise') {
      const { question, context } = body;
      if (!question) {
        return NextResponse.json({ error: 'Missing: question' }, { status: 400 });
      }
      const advice = await controller.advise(question, context);
      return NextResponse.json({ mode: 'advise', advice });
    }

    // ── Mode: Full orchestration (default) ──
    const { intent, ip, preferences, history, userId } = body;
    if (!intent) {
      return NextResponse.json({ error: 'Missing: intent' }, { status: 400 });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      request.headers.get('origin') ||
      'http://localhost:3000';

    const result = await controller.orchestrate(
      {
        intent,
        ip: ip ? { title: ip.title || ip, characters: ip.characters } : undefined,
        preferences: preferences || {},
        history,
        userId,
      },
      { baseUrl }
    );

    return NextResponse.json({
      success: result.success,
      directorNotes: result.directorNotes,
      plan: result.plan.map((s) => ({
        id: s.id,
        type: s.type,
        status: s.status,
        reasoning: s.reasoning,
        durationMs: s.durationMs,
        output: s.output,
      })),
      outputs: result.outputs,
      totalMs: result.totalMs,
      tokensUsed: result.tokensUsed,
    });
  } catch (error) {
    console.error('[ghostface/controller] Error:', error);
    return NextResponse.json(
      {
        error: 'Controller error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
