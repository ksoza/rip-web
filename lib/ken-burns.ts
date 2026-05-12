/**
 * Ken Burns Effect — Client-Side Image-to-Video
 *
 * Converts a still image into a cinematic short video using the
 * Canvas API + MediaRecorder. Applies a slow cinematic zoom/pan
 * (the "Ken Burns" effect used in documentaries).
 *
 * Runs 100% in the browser — zero API cost, always works.
 *
 * Usage:
 *   const videoBlob = await createKenBurnsVideo(imageUrl, { duration: 6 });
 *   const videoUrl = URL.createObjectURL(videoBlob);
 */

export interface KenBurnsOptions {
  /** Video duration in seconds (default: 6) */
  duration?: number;
  /** Output width (default: 1280) */
  width?: number;
  /** Output height (default: 720) */
  height?: number;
  /** Frames per second (default: 24) */
  fps?: number;
  /** Effect type (default: random) */
  effect?: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'zoom-pan';
}

// Available effect presets — each defines start/end crop rectangles
// relative to the source image (0-1 normalized)
interface CropRect { x: number; y: number; w: number; h: number }

const EFFECTS: Record<string, { start: CropRect; end: CropRect }> = {
  'zoom-in': {
    start: { x: 0, y: 0, w: 1, h: 1 },
    end:   { x: 0.15, y: 0.1, w: 0.7, h: 0.7 },
  },
  'zoom-out': {
    start: { x: 0.15, y: 0.1, w: 0.7, h: 0.7 },
    end:   { x: 0, y: 0, w: 1, h: 1 },
  },
  'pan-left': {
    start: { x: 0.2, y: 0.05, w: 0.8, h: 0.9 },
    end:   { x: 0, y: 0.05, w: 0.8, h: 0.9 },
  },
  'pan-right': {
    start: { x: 0, y: 0.05, w: 0.8, h: 0.9 },
    end:   { x: 0.2, y: 0.05, w: 0.8, h: 0.9 },
  },
  'zoom-pan': {
    start: { x: 0, y: 0, w: 1, h: 1 },
    end:   { x: 0.1, y: 0.15, w: 0.75, h: 0.75 },
  },
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Load an image from URL, handling CORS.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/**
 * Create a Ken Burns video from a still image.
 * Returns a Blob containing an MP4/WebM video.
 */
export async function createKenBurnsVideo(
  imageUrl: string,
  opts?: KenBurnsOptions
): Promise<Blob> {
  const duration = opts?.duration ?? 6;
  const width = opts?.width ?? 1280;
  const height = opts?.height ?? 720;
  const fps = opts?.fps ?? 24;
  const totalFrames = Math.ceil(duration * fps);

  // Pick a random effect if not specified
  const effectKeys = Object.keys(EFFECTS);
  const effectName = opts?.effect || effectKeys[Math.floor(Math.random() * effectKeys.length)];
  const effect = EFFECTS[effectName] || EFFECTS['zoom-in'];

  // Load the source image
  const img = await loadImage(imageUrl);

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Set up MediaRecorder
  const stream = canvas.captureStream(fps);

  // Prefer WebM VP9, fall back to VP8, then whatever is available
  const mimeTypes = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  let mimeType = '';
  for (const mt of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mt)) {
      mimeType = mt;
      break;
    }
  }
  if (!mimeType) {
    throw new Error('No supported video recording format found');
  }

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 2_500_000, // 2.5 Mbps
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  // Start recording
  recorder.start();

  // Render frames
  for (let frame = 0; frame < totalFrames; frame++) {
    const t = easeInOutCubic(frame / (totalFrames - 1));

    // Interpolate crop rectangle
    const sx = lerp(effect.start.x, effect.end.x, t) * img.naturalWidth;
    const sy = lerp(effect.start.y, effect.end.y, t) * img.naturalHeight;
    const sw = lerp(effect.start.w, effect.end.w, t) * img.naturalWidth;
    const sh = lerp(effect.start.h, effect.end.h, t) * img.naturalHeight;

    // Clear and draw
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);

    // Wait for next frame timing
    await new Promise(r => setTimeout(r, 1000 / fps));
  }

  // Hold last frame briefly for a clean ending
  await new Promise(r => setTimeout(r, 200));

  // Stop recording and get the blob
  return new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      resolve(blob);
    };
    recorder.onerror = (e) => reject(e);
    recorder.stop();
  });
}

/**
 * Quick helper: create Ken Burns video and return an object URL.
 */
export async function createKenBurnsVideoUrl(
  imageUrl: string,
  opts?: KenBurnsOptions
): Promise<string> {
  const blob = await createKenBurnsVideo(imageUrl, opts);
  return URL.createObjectURL(blob);
}
