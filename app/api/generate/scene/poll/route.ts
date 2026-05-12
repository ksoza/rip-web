// app/api/generate/scene/poll/route.ts
// Polls the status of a queued scene generation job (fal.ai or Google Veo).
// Called by the client every 3-5 seconds until the job completes.
//
// POST /api/generate/scene/poll
// Body (fal.ai):     { statusUrl, responseUrl, modelKey, audioCapable, prompt, sceneImageUrl?, dialogue? }
// Body (Google Veo): { statusUrl: '__VEO__', requestId (=operationName), modelKey, prompt, ... }
// Returns: { status: 'processing' | 'completed' | 'failed', ...result }

import { NextRequest, NextResponse } from 'next/server';
import { checkSceneJob } from '@/lib/scene-pipeline';
import { checkVeoVideo } from '@/lib/google-veo';
import { generateDialogueAudio } from '@/lib/kokoro-tts';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { statusUrl, responseUrl, modelKey, audioCapable, prompt, sceneImageUrl, dialogue, requestId } = body;

    if (!statusUrl || !responseUrl) {
      return NextResponse.json(
        { error: 'statusUrl and responseUrl are required' },
        { status: 400 }
      );
    }

    // ── Google Veo job ──
    if (statusUrl === '__VEO__') {
      const operationName = requestId;
      if (!operationName) {
        return NextResponse.json({ status: 'failed', error: 'Missing operationName for Veo poll' }, { status: 400 });
      }

      const veoResult = await checkVeoVideo(operationName);

      if (veoResult.status === 'processing') {
        return NextResponse.json({ status: 'processing' });
      }

      if (veoResult.status === 'failed') {
        return NextResponse.json({
          status: 'failed',
          error: veoResult.error || 'Google Veo generation failed',
          model: modelKey || 'veo',
        });
      }

      // Completed — generate TTS audio
      const dialogueLines = Array.isArray(dialogue) ? dialogue.filter((d: any) => d?.character && d?.line) : [];
      let audioUrl: string | undefined;
      let dialogueAudio: any;

      if (dialogueLines.length > 0) {
        try {
          const ttsResult = await generateDialogueAudio(dialogueLines);
          if (ttsResult.lines.some((l: any) => l.audioUrl)) {
            dialogueAudio = { lines: ttsResult.lines, totalDuration: ttsResult.totalDuration };
            audioUrl = ttsResult.audioUrl;
          }
        } catch (ttsErr) {
          console.warn('[poll] TTS failed:', ttsErr);
        }
      }

      return NextResponse.json({
        status: 'completed',
        success: true,
        sceneImageUrl: sceneImageUrl || undefined,
        videoUrl: veoResult.videoUrl,
        audioUrl,
        model: modelKey || 'veo',
        audioSynced: false,
        prompt: prompt || '',
        dialogueAudio,
      });
    }

    // ── fal.ai job ──
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
