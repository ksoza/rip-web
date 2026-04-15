# LTX-2.3 RunPod Serverless
# Build: docker build -t ltx-serverless .
# Push:  docker push <your-registry>/ltx-serverless:latest

FROM runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04

WORKDIR /app

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt runpod

# Pre-download model weights at build time (faster cold starts)
RUN python -c "from diffusers import DiffusionPipeline; DiffusionPipeline.from_pretrained('Lightricks/LTX-Video', torch_dtype='auto')"

# Copy handler
COPY handler.py .

CMD ["python", "handler.py"]
