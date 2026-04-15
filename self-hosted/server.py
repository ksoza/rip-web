"""
LTX-2.3 Self-Hosted Video Generation Server
=============================================
FastAPI server that wraps the LTX-Video inference pipeline.
Supports text-to-video with native audio sync.

Usage (Option C - local GPU):
    pip install -r requirements.txt
    python server.py

Usage (Option A - RunPod):
    See handler.py and Dockerfile for serverless deployment.

Environment Variables:
    PORT              - Server port (default: 8188)
    AUTH_SECRET       - Bearer token for auth (default: remixip-free-gpu-2026)
    MODEL_ID          - HuggingFace model ID (default: Lightricks/LTX-Video)
    MODEL_REVISION    - Model revision/branch (default: main)
    TORCH_DTYPE       - float16 or bfloat16 (default: bfloat16)
    OUTPUT_DIR        - Where to save generated videos (default: ./outputs)
"""

import os
import sys
import time
import uuid
import asyncio
import logging
from pathlib import Path
from typing import Optional

import torch
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ltx-server")

# ── Config ──────────────────────────────────────────────────────────

PORT = int(os.environ.get("PORT", "8188"))
AUTH_SECRET = os.environ.get("AUTH_SECRET", "remixip-free-gpu-2026")
MODEL_ID = os.environ.get("MODEL_ID", "Lightricks/LTX-Video")
MODEL_REVISION = os.environ.get("MODEL_REVISION", "main")
TORCH_DTYPE_STR = os.environ.get("TORCH_DTYPE", "bfloat16")
OUTPUT_DIR = Path(os.environ.get("OUTPUT_DIR", "./outputs"))
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

TORCH_DTYPE = torch.bfloat16 if TORCH_DTYPE_STR == "bfloat16" else torch.float16

# ── Global Pipeline ─────────────────────────────────────────────────

pipeline = None
pipeline_info = {
    "model_id": MODEL_ID,
    "loaded": False,
    "has_audio": False,
    "gpu": "none",
    "vram_gb": 0,
}


def load_pipeline():
    """Load the LTX-Video pipeline on startup."""
    global pipeline, pipeline_info

    logger.info(f"Loading {MODEL_ID} (revision={MODEL_REVISION}, dtype={TORCH_DTYPE_STR})...")

    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        vram_gb = round(torch.cuda.get_device_properties(0).total_mem / (1024**3), 1)
        pipeline_info["gpu"] = gpu_name
        pipeline_info["vram_gb"] = vram_gb
        logger.info(f"GPU: {gpu_name} ({vram_gb} GB VRAM)")
    else:
        logger.warning("No CUDA GPU detected! Generation will be very slow.")
        pipeline_info["gpu"] = "cpu"

    try:
        from diffusers import DiffusionPipeline

        pipe = DiffusionPipeline.from_pretrained(
            MODEL_ID,
            revision=MODEL_REVISION,
            torch_dtype=TORCH_DTYPE,
        )

        if torch.cuda.is_available():
            pipe = pipe.to("cuda")
            # Enable memory optimizations
            try:
                pipe.enable_model_cpu_offload()
            except Exception:
                pass

        pipeline = pipe
        pipeline_info["loaded"] = True

        # Check if this model version has audio capabilities
        has_audio = hasattr(pipe, "audio_encoder") or "audio" in str(type(pipe)).lower()
        pipeline_info["has_audio"] = has_audio
        logger.info(f"Pipeline loaded. Audio support: {has_audio}")

    except Exception as e:
        logger.error(f"Failed to load pipeline: {e}")
        raise


def generate_video(
    prompt: str,
    width: int = 768,
    height: int = 512,
    num_frames: int = 97,
    num_inference_steps: int = 30,
    fps: int = 24,
    seed: Optional[int] = None,
) -> dict:
    """Generate a video (and optionally audio) from a text prompt."""
    if pipeline is None:
        raise RuntimeError("Pipeline not loaded")

    generator = None
    if seed is not None:
        generator = torch.Generator(device="cuda" if torch.cuda.is_available() else "cpu")
        generator.manual_seed(seed)

    logger.info(f"Generating: {width}x{height}, {num_frames} frames, {num_inference_steps} steps")
    logger.info(f"Prompt: {prompt[:100]}...")

    t0 = time.time()

    # Build generation kwargs
    gen_kwargs = {
        "prompt": prompt,
        "width": width,
        "height": height,
        "num_frames": num_frames,
        "num_inference_steps": num_inference_steps,
        "generator": generator,
    }

    output = pipeline(**gen_kwargs)
    elapsed = time.time() - t0
    logger.info(f"Generation took {elapsed:.1f}s")

    # Save video
    job_id = str(uuid.uuid4())[:8]
    video_filename = f"{job_id}.mp4"
    video_path = OUTPUT_DIR / video_filename

    # Export frames to video
    from diffusers.utils import export_to_video

    frames = output.frames[0] if hasattr(output, "frames") else output[0]
    export_to_video(frames, str(video_path), fps=fps)
    logger.info(f"Saved video: {video_path} ({video_path.stat().st_size / 1024:.0f} KB)")

    result = {
        "success": True,
        "video_path": str(video_path),
        "download_url": f"/outputs/{video_filename}",
        "model": MODEL_ID,
        "duration_seconds": round(num_frames / fps, 2),
        "frames": num_frames,
        "resolution": f"{width}x{height}",
        "generation_time": round(elapsed, 1),
        "has_audio": False,
    }

    # Check for audio output
    if hasattr(output, "audio") and output.audio is not None:
        try:
            import soundfile as sf

            audio_filename = f"{job_id}.wav"
            audio_path = OUTPUT_DIR / audio_filename
            sf.write(str(audio_path), output.audio, samplerate=44100)
            result["audio_path"] = str(audio_path)
            result["audio_download_url"] = f"/outputs/{audio_filename}"
            result["has_audio"] = True
            logger.info(f"Saved audio: {audio_path}")
        except Exception as e:
            logger.warning(f"Audio save failed: {e}")

    return result


# ── FastAPI App ─────────────────────────────────────────────────────

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

app = FastAPI(title="LTX-2.3 Self-Hosted", version="1.0.0")
app.mount("/outputs", StaticFiles(directory=str(OUTPUT_DIR)), name="outputs")


# Auth middleware
async def verify_auth(request: Request):
    if AUTH_SECRET:
        auth = request.headers.get("Authorization", "")
        if auth != f"Bearer {AUTH_SECRET}":
            raise HTTPException(status_code=401, detail="Invalid auth token")


# ── Endpoints ───────────────────────────────────────────────────────


class VideoRequest(BaseModel):
    prompt: str
    width: int = Field(default=768, ge=256, le=1920)
    height: int = Field(default=512, ge=256, le=1920)
    num_frames: int = Field(default=97, ge=8, le=257)
    num_inference_steps: int = Field(default=30, ge=1, le=100)
    fps: int = Field(default=24, ge=8, le=50)
    seed: Optional[int] = None


@app.get("/health")
async def health():
    """Health check — compatible with existing self-hosted.ts client."""
    return {
        "status": "ok" if pipeline_info["loaded"] else "loading",
        "gpu": pipeline_info["gpu"],
        "vram_gb": pipeline_info["vram_gb"],
        "models": {
            "video": MODEL_ID if pipeline_info["loaded"] else None,
            "voice_clone": None,
            "tts_fast": None,
        },
        "has_audio": pipeline_info["has_audio"],
        "model_id": MODEL_ID,
    }


@app.post("/generate/video", dependencies=[Depends(verify_auth)])
async def api_generate_video(req: VideoRequest):
    """Generate video from text prompt."""
    if not pipeline_info["loaded"]:
        raise HTTPException(status_code=503, detail="Model still loading")

    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: generate_video(
                prompt=req.prompt,
                width=req.width,
                height=req.height,
                num_frames=req.num_frames,
                num_inference_steps=req.num_inference_steps,
                fps=req.fps,
                seed=req.seed,
            ),
        )
        return result
    except Exception as e:
        logger.error(f"Generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/models")
async def list_models():
    """List available models."""
    return {
        "models": [
            {
                "id": MODEL_ID,
                "type": "video",
                "loaded": pipeline_info["loaded"],
                "has_audio": pipeline_info["has_audio"],
            }
        ]
    }


# ── Startup ─────────────────────────────────────────────────────────


@app.on_event("startup")
async def startup():
    """Load model on server startup."""
    await asyncio.get_event_loop().run_in_executor(None, load_pipeline)


if __name__ == "__main__":
    import uvicorn

    logger.info(f"Starting LTX-2.3 server on port {PORT}")
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
