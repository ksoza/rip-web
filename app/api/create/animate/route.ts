// app/api/create/animate/route.ts
// Video generation from storyboard images using fal.ai
// Supports multiple video models: Wan, LTX, Seedance, Kling, Hailuo
import { NextRequest, NextResponse } from 'next/server';
import { falGenerate, FAL_VIDEO_MODELS } from '@/lib/fal';

export const maxDuration = 120;

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
    const result = await falGenerate(videoModel.id, input);

    if (result.video?.url) {
      return NextResponse.json({
        videoUrl: result.video.url,
        sceneId,
        model: videoModel.id,
        provider: 'fal.ai',
      });
    }

    // Some models return video in different formats
    if ((result as any).output?.video?.url) {
      return NextResponse.json({
        videoUrl: (result as any).output.video.url,
        sceneId,
        model: videoModel.id,
        provider: 'fal.ai',
      });
    }

    return NextResponse.json({
      error: 'Video generation completed but no video URL returned',
      result: JSON.stringify(result).slice(0, 500),
    }, { status: 500 });

  } catch (error: any) {
    console.error('Video generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Video generation failed' },
      { status: error.status || 500 }
    );
  }
}
