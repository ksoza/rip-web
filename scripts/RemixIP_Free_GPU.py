# RemixIP Free GPU Server - Colab/Kaggle Notebook
# ================================================
# Run this in Google Colab (free T4 16GB) or Kaggle (free P100 16GB)
# Provides a free API endpoint for video generation + voice cloning
#
# Models loaded:
#   - Wan 2.1 (1.3B) -- video generation, 4GB+ VRAM
#   - XTTS-v2 (Coqui) -- voice cloning from 6s sample, CPU/GPU
#   - Kokoro TTS (82M) -- fast narration, CPU-only
#
# API Endpoints (exposed via localtunnel):
#   POST /generate/video   -- text/image to video
#   POST /generate/voice   -- text to speech with voice cloning
#   POST /generate/tts     -- fast TTS (Kokoro)
#   GET  /health           -- health check + GPU info
#   GET  /models           -- list loaded models

# ---- Cell 1: Install Dependencies ----
# !pip install -q torch torchvision torchaudio
# !pip install -q diffusers transformers accelerate safetensors
# !pip install -q TTS  # Coqui XTTS-v2
# !pip install -q flask flask-cors
# !pip install -q sentencepiece protobuf
# !pip install -q kokoro  # Kokoro TTS
# !npm install -g localtunnel  # Expose API

import os
import sys
import json
import time
import torch
import threading
from io import BytesIO
from pathlib import Path

# ---- Cell 2: GPU Check ----
print("=" * 50)
print("GPU STATUS")
print("=" * 50)
if torch.cuda.is_available():
    gpu_name = torch.cuda.get_device_name(0)
    gpu_mem = torch.cuda.get_device_properties(0).total_mem / (1024**3)
    print(f"GPU: {gpu_name}")
    print(f"VRAM: {gpu_mem:.1f} GB")
    print(f"CUDA: {torch.version.cuda}")
else:
    print("WARNING: No GPU detected. Video gen will be very slow.")
    print("Using CPU mode.")
print("=" * 50)

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
DTYPE = torch.float16 if DEVICE == "cuda" else torch.float32

# ---- Cell 3: Load Wan 2.1 Video Model ----
print("\n[1/3] Loading Wan 2.1 video model...")
from diffusers import DiffusionPipeline, DPMSolverMultistepScheduler

VIDEO_MODEL_ID = "Wan-AI/Wan2.1-T2V-1.3B"
video_pipe = None

def load_video_model():
    global video_pipe
    try:
        video_pipe = DiffusionPipeline.from_pretrained(
            VIDEO_MODEL_ID,
            torch_dtype=DTYPE,
            variant="fp16" if DEVICE == "cuda" else None,
        )
        video_pipe.scheduler = DPMSolverMultistepScheduler.from_config(
            video_pipe.scheduler.config
        )
        if DEVICE == "cuda":
            video_pipe.enable_model_cpu_offload()
            video_pipe.enable_vae_slicing()
        print(f"  Wan 2.1 loaded on {DEVICE}")
    except Exception as e:
        print(f"  WARNING: Wan 2.1 failed to load: {e}")
        print("  Video generation will be unavailable.")
        video_pipe = None

load_video_model()

# ---- Cell 4: Load XTTS-v2 Voice Cloning ----
print("\n[2/3] Loading XTTS-v2 voice cloning model...")
from TTS.api import TTS as CoquiTTS

xtts_model = None
try:
    xtts_model = CoquiTTS("tts_models/multilingual/multi-dataset/xtts_v2", gpu=(DEVICE == "cuda"))
    print("  XTTS-v2 loaded -- voice cloning ready")
except Exception as e:
    print(f"  WARNING: XTTS-v2 failed: {e}")
    xtts_model = None

# ---- Cell 5: Load Kokoro TTS ----
print("\n[3/3] Loading Kokoro TTS (82M, CPU-friendly)...")
kokoro_model = None
try:
    import kokoro
    kokoro_model = kokoro.KokoroTTS()
    print("  Kokoro TTS loaded -- fast narration ready")
except Exception as e:
    print(f"  Kokoro not available: {e}")
    print("  Will use XTTS-v2 as fallback for all TTS")

print("\n" + "=" * 50)
print("ALL MODELS LOADED")
print("=" * 50)

# ---- Cell 6: Flask API Server ----
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

OUTPUT_DIR = Path("/tmp/remixip_outputs")
OUTPUT_DIR.mkdir(exist_ok=True)

# Shared secret for auth (set via env or default)
API_SECRET = os.environ.get("REMIXIP_API_SECRET", "remixip-free-gpu-2026")


def check_auth():
    """Simple bearer token auth"""
    auth = request.headers.get("Authorization", "")
    if auth != f"Bearer {API_SECRET}":
        return False
    return True


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "cpu",
        "vram_gb": round(torch.cuda.get_device_properties(0).total_mem / (1024**3), 1) if torch.cuda.is_available() else 0,
        "models": {
            "video": "wan-2.1-1.3b" if video_pipe else None,
            "voice_clone": "xtts-v2" if xtts_model else None,
            "tts_fast": "kokoro-82m" if kokoro_model else None,
        },
    })


@app.route("/models", methods=["GET"])
def models():
    return jsonify({
        "video": [{
            "id": "wan-2.1",
            "name": "Wan 2.1 (1.3B)",
            "status": "loaded" if video_pipe else "unavailable",
            "vram_required": "4GB+",
            "max_resolution": "512x512 (4GB) / 768x512 (8GB+) / 1280x720 (16GB+)",
        }],
        "voice": [{
            "id": "xtts-v2",
            "name": "XTTS-v2 (Coqui)",
            "status": "loaded" if xtts_model else "unavailable",
            "features": ["voice_cloning", "17_languages", "6s_sample"],
        }],
        "tts": [{
            "id": "kokoro",
            "name": "Kokoro TTS (82M)",
            "status": "loaded" if kokoro_model else "unavailable",
            "features": ["fast", "cpu_only", "82m_params"],
        }],
    })


@app.route("/generate/video", methods=["POST"])
def generate_video():
    if not check_auth():
        return jsonify({"error": "Unauthorized"}), 401

    if not video_pipe:
        return jsonify({"error": "Video model not loaded"}), 503

    data = request.json or {}
    prompt = data.get("prompt", "")
    if not prompt:
        return jsonify({"error": "prompt is required"}), 400

    width = min(data.get("width", 512), 1280)
    height = min(data.get("height", 512), 720)
    num_frames = min(data.get("num_frames", 16), 48)
    num_steps = min(data.get("num_inference_steps", 25), 50)
    seed = data.get("seed")

    generator = torch.Generator(device=DEVICE).manual_seed(seed) if seed else None

    try:
        start = time.time()
        result = video_pipe(
            prompt=prompt,
            width=width,
            height=height,
            num_frames=num_frames,
            num_inference_steps=num_steps,
            generator=generator,
        )
        elapsed = time.time() - start

        # Save video
        ts = int(time.time())
        out_path = OUTPUT_DIR / f"video_{ts}.mp4"
        # Export frames to video
        from diffusers.utils import export_to_video
        export_to_video(result.frames[0], str(out_path))

        return jsonify({
            "success": True,
            "video_path": str(out_path),
            "download_url": f"/download/{out_path.name}",
            "model": "wan-2.1-1.3b",
            "duration_seconds": round(elapsed, 1),
            "frames": num_frames,
            "resolution": f"{width}x{height}",
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/generate/voice", methods=["POST"])
def generate_voice():
    """Voice cloning with XTTS-v2. Send reference audio + text."""
    if not check_auth():
        return jsonify({"error": "Unauthorized"}), 401

    if not xtts_model:
        return jsonify({"error": "XTTS-v2 not loaded"}), 503

    data = request.json or {}
    text = data.get("text", "")
    language = data.get("language", "en")
    reference_audio_url = data.get("reference_audio_url")

    if not text:
        return jsonify({"error": "text is required"}), 400

    try:
        start = time.time()
        ts = int(time.time())
        out_path = OUTPUT_DIR / f"voice_{ts}.wav"

        if reference_audio_url:
            # Download reference audio for cloning
            import urllib.request
            ref_path = OUTPUT_DIR / f"ref_{ts}.wav"
            urllib.request.urlretrieve(reference_audio_url, str(ref_path))
            xtts_model.tts_to_file(
                text=text,
                file_path=str(out_path),
                speaker_wav=str(ref_path),
                language=language,
            )
        else:
            # Use default speaker
            xtts_model.tts_to_file(
                text=text,
                file_path=str(out_path),
                language=language,
            )

        elapsed = time.time() - start
        return jsonify({
            "success": True,
            "audio_path": str(out_path),
            "download_url": f"/download/{out_path.name}",
            "model": "xtts-v2",
            "cloned": bool(reference_audio_url),
            "duration_seconds": round(elapsed, 1),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/generate/tts", methods=["POST"])
def generate_tts():
    """Fast TTS with Kokoro (82M, CPU)."""
    if not check_auth():
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json or {}
    text = data.get("text", "")
    if not text:
        return jsonify({"error": "text is required"}), 400

    try:
        start = time.time()
        ts = int(time.time())
        out_path = OUTPUT_DIR / f"tts_{ts}.wav"

        if kokoro_model:
            audio = kokoro_model.generate(text)
            import soundfile as sf
            sf.write(str(out_path), audio, 24000)
            model_used = "kokoro-82m"
        elif xtts_model:
            xtts_model.tts_to_file(text=text, file_path=str(out_path), language="en")
            model_used = "xtts-v2-fallback"
        else:
            return jsonify({"error": "No TTS model available"}), 503

        elapsed = time.time() - start
        return jsonify({
            "success": True,
            "audio_path": str(out_path),
            "download_url": f"/download/{out_path.name}",
            "model": model_used,
            "duration_seconds": round(elapsed, 1),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/download/<filename>", methods=["GET"])
def download(filename):
    """Download generated files."""
    path = OUTPUT_DIR / filename
    if not path.exists():
        return jsonify({"error": "File not found"}), 404
    return send_file(str(path))


# ---- Cell 7: Start Server + Expose via Localtunnel ----
def start_tunnel():
    """Expose Flask server via localtunnel for public API access."""
    import subprocess
    proc = subprocess.Popen(
        ["lt", "--port", "5000", "--subdomain", "remixip-gpu"],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        text=True,
    )
    for line in proc.stdout:
        if "your url is:" in line.lower() or "https://" in line:
            url = line.strip().split()[-1]
            print(f"\n{'='*50}")
            print(f"PUBLIC API URL: {url}")
            print(f"{'='*50}")
            print(f"\nSet this in Vercel env vars:")
            print(f"  SELF_HOSTED_GPU_URL={url}")
            print(f"  SELF_HOSTED_GPU_SECRET=remixip-free-gpu-2026")
            break

if __name__ == "__main__":
    # Start localtunnel in background
    tunnel_thread = threading.Thread(target=start_tunnel, daemon=True)
    tunnel_thread.start()

    # Start Flask server
    print("\nStarting API server on port 5000...")
    app.run(host="0.0.0.0", port=5000)
