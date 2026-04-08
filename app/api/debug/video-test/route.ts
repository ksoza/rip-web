// app/api/debug/video-test/route.ts
// Temporary debug endpoint: submits a Wan t2v task and polls to completion
// Returns FULL raw Novita response for debugging video URL extraction
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const novitaKey = process.env.NOVITA_API_KEY || '';
  if (!novitaKey) {
    return NextResponse.json({ error: 'NOVITA_API_KEY not set' }, { status: 500 });
  }

  const headers = {
    'Authorization': `Bearer ${novitaKey.trim()}`,
    'Content-Type': 'application/json',
  };

  const log: string[] = [];
  const startTime = Date.now();

  // 1. Submit Wan t2v task
  log.push(`[${Date.now() - startTime}ms] Submitting Wan t2v task...`);
  try {
    const submitRes = await fetch('https://api.novita.ai/v3/async/wan-t2v', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt: 'a cat walking on a sunny street, cinematic motion',
        size: '832*480',
        steps: 20,
        fast_mode: true,
      }),
    });

    const submitStatus = submitRes.status;
    const submitBody = await submitRes.json();
    log.push(`[${Date.now() - startTime}ms] Submit response: HTTP ${submitStatus}`);
    log.push(`[${Date.now() - startTime}ms] Submit body: ${JSON.stringify(submitBody)}`);

    if (!submitRes.ok || !submitBody.task_id) {
      return NextResponse.json({ error: 'Submit failed', submitStatus, submitBody, log });
    }

    const taskId = submitBody.task_id;

    // 2. Poll until done or 50s timeout
    const deadline = Date.now() + 50_000;
    let pollCount = 0;
    let lastPollData: unknown = null;

    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 3000));
      pollCount++;

      try {
        const pollRes = await fetch(
          `https://api.novita.ai/v3/async/task-result?task_id=${taskId}`,
          { headers }
        );
        const pollData = await pollRes.json();
        lastPollData = pollData;
        const status = pollData?.task?.status;
        const progress = pollData?.task?.progress_percent || 0;

        log.push(`[${Date.now() - startTime}ms] Poll #${pollCount}: status=${status}, progress=${progress}%`);

        if (status === 'TASK_STATUS_SUCCEED') {
          // Return FULL raw response for debugging
          return NextResponse.json({
            success: true,
            taskId,
            pollCount,
            elapsedMs: Date.now() - startTime,
            rawResponse: pollData,
            extractedUrl: pollData?.videos?.[0]?.video_url || null,
            responseKeys: Object.keys(pollData || {}),
            log,
          });
        }

        if (status === 'TASK_STATUS_FAILED') {
          return NextResponse.json({
            success: false,
            taskId,
            pollCount,
            elapsedMs: Date.now() - startTime,
            rawResponse: pollData,
            log,
          });
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        log.push(`[${Date.now() - startTime}ms] Poll #${pollCount} error: ${msg}`);
      }
    }

    // Timed out — return what we have
    return NextResponse.json({
      success: false,
      timedOut: true,
      taskId,
      pollCount,
      elapsedMs: Date.now() - startTime,
      lastPollData,
      log,
    });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg, log }, { status: 500 });
  }
}
