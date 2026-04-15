# LTX-2.3 Self-Hosted Video Server

Drop-in replacement for fal.ai — run LTX-2.3 on your own GPU for $0 video generation with native audio sync.

## Option A: RunPod Serverless (~$0.00036/sec, scales to zero)

```bash
# 1. Build & push Docker image
docker build -t <your-registry>/ltx-serverless:latest .
docker push <your-registry>/ltx-serverless:latest

# 2. Create RunPod serverless endpoint
#    - Go to runpod.io → Serverless → New Endpoint
#    - Docker image: <your-registry>/ltx-serverless:latest
#    - GPU: RTX 4090 or A100 (12GB+ VRAM)
#    - Max workers: 1 (or more for parallel jobs)

# 3. Set env vars in Vercel
SELF_HOSTED_GPU_URL=https://api.runpod.ai/v2/<endpoint-id>
SELF_HOSTED_GPU_SECRET=<your-runpod-api-key>
RUNPOD_MODE=true
```

## Option C: Local GPU (truly $0)

```bash
# 1. Install requirements (needs NVIDIA GPU with 12GB+ VRAM)
pip install -r requirements.txt

# 2. Run the server
python server.py

# 3. Expose via ngrok/cloudflare tunnel for Vercel to reach it
ngrok http 8188

# 4. Set env var in Vercel
SELF_HOSTED_GPU_URL=https://<your-ngrok-url>
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | GPU status + loaded models |
| POST | `/generate/video` | Text-to-video generation |
| GET | `/models` | List available models |
| GET | `/outputs/{file}` | Download generated files |

### POST /generate/video

```json
{
  "prompt": "A cat playing piano in a jazz club",
  "width": 768,
  "height": 512,
  "num_frames": 97,
  "num_inference_steps": 30,
  "fps": 24,
  "seed": 42
}
```

### Response

```json
{
  "success": true,
  "download_url": "/outputs/abc123.mp4",
  "model": "Lightricks/LTX-Video",
  "duration_seconds": 4.04,
  "has_audio": true,
  "audio_download_url": "/outputs/abc123.wav"
}
```

## Hardware Requirements

- **Minimum:** NVIDIA GPU with 12GB VRAM (RTX 3060 12GB)
- **Recommended:** RTX 4090 or A100 for fast generation
- **RAM:** 16GB+
- **Disk:** ~15GB for model weights
