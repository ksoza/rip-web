#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# Lightning AI Studio - LTX-2.3 Self-Hosted Setup
# ═══════════════════════════════════════════════════════════════════
# One-command setup for running the rip-web video generation backend
# on Lightning AI's free GPU tier.
#
# Usage:
#   curl -sL https://raw.githubusercontent.com/ksoza/rip-web/main/self-hosted/lightning-setup.sh | bash
#
#   Or if you already cloned:
#   cd rip-web/self-hosted && bash lightning-setup.sh
#
# What this does:
#   1. Clones rip-web (if needed)
#   2. Installs Python dependencies
#   3. Installs cloudflared for public tunnel
#   4. Pre-downloads LTX-2.3 model weights (~3.5GB, cached)
#   5. Starts the server + tunnel
#   6. Prints the public URL to set in Vercel
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║   ⚡ LTX-2.3 Self-Hosted · Lightning AI Setup        ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ── Step 0: Check GPU ───────────────────────────────────────────
echo -e "${YELLOW}[0/5] Checking GPU...${NC}"
if command -v nvidia-smi &>/dev/null; then
    GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1)
    GPU_MEM=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader 2>/dev/null | head -1)
    echo -e "  ${GREEN}✓ GPU found: ${GPU_NAME} (${GPU_MEM})${NC}"
else
    echo -e "  ${RED}✗ No GPU detected!${NC}"
    echo -e "  ${YELLOW}Make sure you selected a GPU machine in Lightning AI Studio.${NC}"
    echo -e "  ${YELLOW}Go to Studio Settings → Machine → pick a GPU (T4/L4/A10G).${NC}"
    exit 1
fi

# ── Step 1: Clone repo (if needed) ─────────────────────────────
echo -e "\n${YELLOW}[1/5] Setting up project...${NC}"
WORK_DIR="$HOME/rip-web-gpu"

if [ -d "$WORK_DIR/self-hosted" ]; then
    echo -e "  ${GREEN}✓ Project already exists at $WORK_DIR${NC}"
    cd "$WORK_DIR"
    echo "  Pulling latest..."
    git pull --quiet origin main 2>/dev/null || true
else
    echo "  Cloning ksoza/rip-web..."
    git clone --depth 1 https://github.com/ksoza/rip-web.git "$WORK_DIR"
    cd "$WORK_DIR"
    echo -e "  ${GREEN}✓ Cloned${NC}"
fi

# ── Step 2: Install Python deps ────────────────────────────────
echo -e "\n${YELLOW}[2/5] Installing Python dependencies...${NC}"
pip install -q -r self-hosted/requirements.txt 2>&1 | tail -3
echo -e "  ${GREEN}✓ Dependencies installed${NC}"

# ── Step 3: Install cloudflared ─────────────────────────────────
echo -e "\n${YELLOW}[3/5] Installing cloudflared tunnel...${NC}"
if command -v cloudflared &>/dev/null; then
    echo -e "  ${GREEN}✓ cloudflared already installed${NC}"
else
    # Download cloudflared binary
    ARCH=$(uname -m)
    if [ "$ARCH" = "x86_64" ]; then
        CF_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
    elif [ "$ARCH" = "aarch64" ]; then
        CF_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64"
    else
        echo -e "  ${RED}Unsupported arch: $ARCH${NC}"
        exit 1
    fi
    curl -sL "$CF_URL" -o /usr/local/bin/cloudflared 2>/dev/null || \
    curl -sL "$CF_URL" -o "$HOME/.local/bin/cloudflared" && \
        mkdir -p "$HOME/.local/bin"
    chmod +x /usr/local/bin/cloudflared 2>/dev/null || chmod +x "$HOME/.local/bin/cloudflared"
    export PATH="$HOME/.local/bin:$PATH"
    echo -e "  ${GREEN}✓ cloudflared installed${NC}"
fi

# ── Step 4: Pre-download model weights ─────────────────────────
echo -e "\n${YELLOW}[4/5] Pre-downloading LTX-2.3 model weights...${NC}"
echo "  (This only happens once — weights are cached in ~/.cache/huggingface)"
python3 -c "
from huggingface_hub import snapshot_download
import os
cache_dir = os.path.expanduser('~/.cache/huggingface')
print(f'  Cache dir: {cache_dir}')
try:
    path = snapshot_download('Lightricks/LTX-Video', cache_dir=cache_dir)
    print(f'  ✓ Model cached at: {path}')
except Exception as e:
    print(f'  Downloading... (this may take 5-10 min on first run)')
    path = snapshot_download('Lightricks/LTX-Video')
    print(f'  ✓ Model cached at: {path}')
"
echo -e "  ${GREEN}✓ Model weights ready${NC}"

# ── Step 5: Launch server + tunnel ──────────────────────────────
echo -e "\n${YELLOW}[5/5] Starting server + tunnel...${NC}"

PORT=${PORT:-8188}
AUTH_SECRET=${AUTH_SECRET:-"remixip-free-gpu-2026"}

# Start server in background
echo "  Starting LTX server on port $PORT..."
cd "$WORK_DIR"
PORT=$PORT AUTH_SECRET=$AUTH_SECRET python3 self-hosted/server.py &
SERVER_PID=$!

# Wait for server to be ready
echo "  Waiting for server to load model..."
for i in $(seq 1 120); do
    if curl -s "http://localhost:$PORT/health" >/dev/null 2>&1; then
        break
    fi
    if [ $i -eq 120 ]; then
        echo -e "  ${RED}✗ Server didn't start in 2 minutes${NC}"
        kill $SERVER_PID 2>/dev/null
        exit 1
    fi
    sleep 2
done
echo -e "  ${GREEN}✓ Server is running${NC}"

# Start cloudflared tunnel
echo "  Opening cloudflared tunnel..."
TUNNEL_LOG="/tmp/cloudflared.log"
cloudflared tunnel --url "http://localhost:$PORT" --no-autoupdate > "$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!

# Wait for tunnel URL
echo "  Waiting for tunnel URL..."
TUNNEL_URL=""
for i in $(seq 1 30); do
    TUNNEL_URL=$(grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' "$TUNNEL_LOG" 2>/dev/null | head -1)
    if [ -n "$TUNNEL_URL" ]; then
        break
    fi
    sleep 2
done

if [ -z "$TUNNEL_URL" ]; then
    echo -e "  ${RED}✗ Couldn't get tunnel URL${NC}"
    echo "  Check $TUNNEL_LOG for details"
    echo -e "  ${YELLOW}Server is still running on localhost:$PORT${NC}"
else
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✅ ALL GOOD! Your GPU backend is live.${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  ${CYAN}Public URL:${NC} $TUNNEL_URL"
    echo -e "  ${CYAN}Auth token:${NC} $AUTH_SECRET"
    echo ""
    echo -e "  ${YELLOW}Set these in Vercel (rip-web project → Settings → Env Vars):${NC}"
    echo ""
    echo -e "    SELF_HOSTED_GPU_URL=${TUNNEL_URL}"
    echo -e "    SELF_HOSTED_GPU_SECRET=${AUTH_SECRET}"
    echo ""
    echo -e "  ${YELLOW}Test it:${NC}"
    echo -e "    curl ${TUNNEL_URL}/health -H 'Authorization: Bearer ${AUTH_SECRET}'"
    echo ""
    echo -e "  ${RED}⚠ Note: URL changes each time you restart.${NC}"
    echo -e "  ${RED}  Update SELF_HOSTED_GPU_URL in Vercel after each restart.${NC}"
    echo ""
fi

# ── Keep alive ──────────────────────────────────────────────────
echo -e "${CYAN}Press Ctrl+C to stop the server.${NC}"
echo ""

cleanup() {
    echo -e "\n${YELLOW}Shutting down...${NC}"
    kill $SERVER_PID 2>/dev/null
    kill $TUNNEL_PID 2>/dev/null
    echo -e "${GREEN}Done.${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

# Keep script alive
wait $SERVER_PID
