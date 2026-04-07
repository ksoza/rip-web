// app/api/create/animate/route.ts
// Video generation from storyboard images using fal.ai
// Supports multiple video models: Wan, LTX, Seedance, Kling, Hailuo, Veo
import { NextRequest, NextResponse } from 'next/server';
import { falGenerate, FAL_VIDEO_MODELS } from '@/lib/fal';

export const maxDuration = 120;

// ── Extract video URL from varying fal.ai response shapes ────────
// Different models return results in different JSON structures.
// This helper walks common patterns to find the video URL.
function extractVideoUrl(result: any): string | null {
  // Pattern 1: result.video.url (most common)
  if (result?.video?.url) return result.video.url;

  // Pattern 2: result.output.video.url
  if (result?.output?.video?.url) return result.output.video.url;

  // Pattern 3: result.data.video.url
  if (result?.data?.video?.url) return result.data.video.url;

  // Pattern 4: result.video (direct string URL)
  if (typeof result?.video === 'string') return result.video;

  // Pattern 5: result.output (direct string URL)
  if (typeof result?.output === 'string' && result.output.startsWith('http')) return result.output;

  // Pattern 6: result.videos[0].url (array format)
  if (result?.videos?.[0]?.url) return result.videos[0].url;

  // Pattern 7: result.url (top-level)
  if (typeof result?.url === 'string' && result.url.includes('.mp4')) return result.url;

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const {
      imageUrl,      // URL of the scene image (preferred)
      imageBase64,   // Base64 fallback if no URL
      prompt,        // Scene visual description
      model = 'wan', // Video model key
      sceneId,
      duration = '5',
      aspectRatio = '16:9',
    } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    if (!process.env.FAL_KEY) {
      return NextResponse.json({ error: 'FAL_KEY not configured — video generation requires fal.ai' }, { status: 500 });
    }

    const videoModel = FAL_VIDEO_MODELS[model];
    if (!videoModel) {
      return NextResponse.json({ error: `Unknown video model: ${model}` }, { status: 400 });
    }

    // Build fal.ai input based on the model
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input: Record<string, any> = {
      prompt: `${prompt}, cinematic motion, smooth animation, professional quality`,
    };

    // Image-to-video: provide the scene image as reference
    if (imageUrl) {
      input.image_url = imageUrl;
    } else if (imageBase64) {
      // Strip data URL prefix if present
      const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      input.image_url = `data:image/png;base64,${base64Data}`;
    }

    // Duration handling — varies by model
    const durationNum = parseInt(duration, 10) || 5;
    input.duration = durationNum;

    // Aspect ratio
    if (aspectRatio) {
      input.aspect_ratio = aspectRatio;
    }

    // Model-specific config
    switch (model) {
      case 'ltx-video':
        input.num_frames = durationNum * 24; // 24fps
        break;
      case 'wan':
        // Wan uses duration in seconds directly
        break;
      case 'seedance':
        input.motion_mode = 'normal';
        break;
      case 'kling':
        input.mode = 'pro';
        break;
      case 'hailuo':
        // Minimax/Hailuo uses prompt enhancement by default
        input.prompt_enhancer = true;
        break;
    }

    // Generate video via fal.ai queue
    const result = await falGenerate(videoModel.id, input as Parameters<typeof falGenerate>[1]);

    // Extract video URL from whatever shape fal.ai returns
    const videoUrl = extractVideoUrl(result);

    if (videoUrl) {
      return NextResponse.json({
        videoUrl,
        sceneId,
        model: videoModel.id,
        provider: 'fal.ai',
      });
    }

    // If we still can't find the URL, log the full response for debugging
    console.error('fal.ai video response — could not find video URL. Full result:', JSON.stringify(result, null, 2).slice(0, 2000));

    return NextResponse.json({
      error: 'Video generation completed but no video URL found in response',
      debug: `Model: ${videoModel.id}. Response keys: ${Object.keys(result || {}).join(', ')}`,
    }, { status: 500 });

  } catch (error: any) {
    console.error('Video generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Video generation failed' },
      { status: error.status || 500 }
    );
  }
}
