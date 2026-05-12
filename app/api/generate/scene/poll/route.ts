// app/api/generate/scene/poll/route.ts
// Polls the status of a queued scene generation job (fal.ai or Bedrock).
// Called by the client every 3-5 seconds until the job completes.
//
// POST /api/generate/scene/poll
// Body (fal.ai):  { statusUrl, responseUrl, modelKey, audioCapable, prompt }
// Body (Bedrock): { invocationArn, s3OutputPrefix, modelId }
// Returns: { status: 'processing' | 'completed' | 'failed', ...result }

import { NextRequest, NextResponse } from 'next/server';
import { checkSceneJob } from '@/lib/scene-pipeline';
import { checkBedrockVideo } from '@/lib/bedrock-video';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── Bedrock Nova Reel job ──
    if (body.invocationArn) {
      const { invocationArn, s3OutputPrefix } = body;
      const result = await checkBedrockVideo(invocationArn, s3OutputPrefix);

      if (result.status === 'processing') {
        return NextResponse.json({ status: 'processing' });
      }

      if (result.status === 'failed') {
        return NextResponse.json({
          status: 'failed',
          error: result.error || 'Bedrock video generation failed',
          model: 'nova-reel',
        });
      }

      // Completed
      return NextResponse.json({
        status: 'completed',
        success: true,
        videoUrl: result.videoUrl,
        model: 'nova-reel',
        audioSynced: false,
        prompt: body.prompt || '',
      });
    }

    // ── fal.ai job ──
    const { statusUrl, responseUrl, modelKey, audioCapable, prompt } = body;

    if (!statusUrl || !responseUrl) {
      return NextResponse.json(
        { error: 'statusUrl and responseUrl are required (or invocationArn for Bedrock)' },
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
