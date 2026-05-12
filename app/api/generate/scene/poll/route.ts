// app/api/generate/scene/poll/route.ts
// Polls the status of a queued scene generation job (fal.ai).
// Called by the client every 3-5 seconds until the job completes.
//
// POST /api/generate/scene/poll
// Body (fal.ai): { statusUrl, responseUrl, modelKey, audioCapable, prompt, sceneImageUrl?, dialogue? }
// Returns: { status: 'processing' | 'completed' | 'failed', ...result }

import { NextRequest, NextResponse } from 'next/server';
import { checkSceneJob } from '@/lib/scene-pipeline';
import { generateDialogueAudio } from '@/lib/kokoro-tts';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── fal.ai job ──
    const { statusUrl, responseUrl, modelKey, audioCapable, prompt, sceneImageUrl, dialogue } = body;

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

    // ── Completed! Now generate TTS audio if dialogue was provided ──
    let audioUrl = result.audioUrl;
    let dialogueAudio: any = undefined;
    const dialogueLines = Array.isArray(dialogue) ? dialogue.filter((d: any) => d?.character && d?.line) : [];

    if (!audioUrl && dialogueLines.length > 0) {
      try {
        console.log(`[poll] Generating TTS audio for ${dialogueLines.length} dialogue lines...`);
        const ttsResult = await generateDialogueAudio(dialogueLines);
        if (ttsResult.lines.some((l: any) => l.audioUrl)) {
          dialogueAudio = {
            lines: ttsResult.lines,
            totalDuration: ttsResult.totalDuration,
          };
          audioUrl = ttsResult.audioUrl;
          console.log(`[poll] ✓ TTS: ${ttsResult.lines.filter((l: any) => l.audioUrl).length}/${dialogueLines.length} lines`);
        }
      } catch (ttsErr) {
        console.warn('[poll] TTS generation failed (video still usable):', ttsErr);
      }
    }

    return NextResponse.json({
      status: 'completed',
      success: true,
      sceneImageUrl: sceneImageUrl || undefined,
      videoUrl: result.videoUrl,
      audioUrl,
      model: result.model,
      audioSynced: result.audioSynced,
      prompt: result.prompt,
      requestId: result.requestId,
      dialogueAudio,
    });

  } catch (err) {
    console.error('[/api/generate/scene/poll] Error:', err);
    return NextResponse.json(
      { status: 'failed', error: err instanceof Error ? err.message : 'Poll error' },
      { status: 500 }
    );
  }
}
