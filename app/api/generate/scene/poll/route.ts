// app/api/generate/scene/poll/route.ts
// Polls the status of a queued fal.ai scene generation job.
// Called by the client every 3-5 seconds until the job completes.
//
// POST /api/generate/scene/poll
// Body: { statusUrl, responseUrl, modelKey, audioCapable, prompt }
// Returns: { status: 'processing' | 'completed' | 'failed', ...result }

import { NextRequest, NextResponse } from 'next/server';
import { checkSceneJob } from '@/lib/scene-pipeline';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { statusUrl, responseUrl, modelKey, audioCapable, prompt } = body;

    if (!statusUrl || !responseUrl) {
      return NextResponse.json(
        { error: 'statusUrl and responseUrl are required' },
        { status: 400 }
      );
    }

    const result = await checkSceneJob(
      statusUrl,
      responseUrl,
      modelKey || 'ltx-2.3',
      audioCapable ?? false,
      prompt || '',
    );

    // Still processing
    if (result.error === '__PENDING__') {
      return NextResponse.json({ status: 'processing' });
    }

    // Failed
    if (!result.success) {
      return NextResponse.json({
        status: 'failed',
        error: result.error || 'Generation failed',
        model: result.model,
        prompt: result.prompt,
      });
    }

    // Completed!
    return NextResponse.json({
      status: 'completed',
      success: true,
      videoUrl: result.videoUrl,
      audioUrl: result.audioUrl,
      model: result.model,
      audioSynced: result.audioSynced,
      prompt: result.prompt,
      requestId: result.requestId,
    });

  } catch (err) {
    console.error('[/api/generate/scene/poll] Error:', err);
    return NextResponse.json(
      { status: 'failed', error: err instanceof Error ? err.message : 'Poll error' },
      { status: 500 }
    );
  }
}
