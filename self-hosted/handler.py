"""
RunPod Serverless Handler for LTX-2.3
======================================
Deploys as a RunPod serverless endpoint. Scales to zero when idle.

Deploy:
    1. Build: docker build -t ltx-serverless .
    2. Push to Docker Hub / GHCR
    3. Create RunPod serverless endpoint with the image

Cost: ~$0.00036/sec GPU time (pay only when generating)
"""

import os
import time
import uuid
import logging
import base64
from pathlib import Path
from typing import Optional

import torch
import runpod

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ltx-handler")

MODEL_ID = os.environ.get("MODEL_ID", "Lightricks/LTX-Video")
OUTPUT_DIR = Path("/tmp/outputs")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ── Load model at cold start ────────────────────────────────────────

pipeline = None


def load_model():
    global pipeline
    logger.info(f"Loading {MODEL_ID}...")

    from diffusers import DiffusionPipeline

    pipe = DiffusionPipeline.from_pretrained(
        MODEL_ID,
        torch_dtype=torch.bfloat16,
    )

    if torch.cuda.is_available():
        pipe = pipe.to("cuda")
        try:
            pipe.enable_model_cpu_offload()
        except Exception:
            pass

    pipeline = pipe
    logger.info("Model loaded!")


# Load on import (RunPod caches the container)
load_model()


# ── Handler ─────────────────────────────────────────────────────────


def handler(job):
    """
    RunPod serverless handler.

    Input:
        prompt: str           - Text prompt for video generation
        width: int            - Video width (default: 768)
        height: int           - Video height (default: 512)
        num_frames: int       - Number of frames (default: 97)
        num_inference_steps: int - Denoising steps (default: 30)
        fps: int              - Frames per second (default: 24)
        seed: int | None      - Random seed for reproducibility

    Returns:
        success: bool
        video_base64: str     - Base64-encoded MP4
        duration_seconds: float
        has_audio: bool
        audio_base64: str | None
    """
    input_data = job["input"]

    prompt = input_data.get("prompt", "")
    if not prompt:
        return {"success": False, "error": "No prompt provided"}

    width = input_data.get("width", 768)
    height = input_data.get("height", 512)
    num_frames = min(257, max(8, input_data.get("num_frames", 97)))
    num_inference_steps = min(100, max(1, input_data.get("num_inference_steps", 30)))
    fps = input_data.get("fps", 24)
    seed = input_data.get("seed")

    generator = None
    if seed is not None:
        generator = torch.Generator(device="cuda" if torch.cuda.is_available() else "cpu")
        generator.manual_seed(seed)

    logger.info(f"Generating: {width}x{height}, {num_frames}f, prompt={prompt[:80]}...")
    t0 = time.time()

    try:
        output = pipeline(
            prompt=prompt,
            width=width,
            height=height,
            num_frames=num_frames,
            num_inference_steps=num_inference_steps,
            generator=generator,
        )
    except Exception as e:
        return {"success": False, "error": str(e)}

    elapsed = time.time() - t0
    logger.info(f"Generated in {elapsed:.1f}s")

    # Save and encode video
    job_id = str(uuid.uuid4())[:8]
    video_path = OUTPUT_DIR / f"{job_id}.mp4"

    from diffusers.utils import export_to_video

    frames = output.frames[0] if hasattr(output, "frames") else output[0]
    export_to_video(frames, str(video_path), fps=fps)

    with open(video_path, "rb") as f:
        video_b64 = base64.b64encode(f.read()).decode()

    result = {
        "success": True,
        "video_base64": video_b64,
        "model": MODEL_ID,
        "duration_seconds": round(num_frames / fps, 2),
        "frames": num_frames,
        "resolution": f"{width}x{height}",
        "generation_time": round(elapsed, 1),
        "has_audio": False,
    }

    # Check for audio
    if hasattr(output, "audio") and output.audio is not None:
        try:
            import soundfile as sf

            audio_path = OUTPUT_DIR / f"{job_id}.wav"
            sf.write(str(audio_path), output.audio, samplerate=44100)
            with open(audio_path, "rb") as f:
                result["audio_base64"] = base64.b64encode(f.read()).decode()
            result["has_audio"] = True
        except Exception as e:
            logger.warning(f"Audio encoding failed: {e}")

    # Cleanup
    video_path.unlink(missing_ok=True)

    return result


runpod.serverless.start({"handler": handler})
