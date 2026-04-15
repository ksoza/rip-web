#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# Lightning AI - Quick Restart
# ═══════════════════════════════════════════════════════════════════
# Use this after the initial setup to restart the server quickly.
# Model weights are already cached, so this starts in ~30 seconds.
#
# Usage:
#   cd ~/rip-web-gpu && bash self-hosted/lightning-restart.sh
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}⚡ Quick restart — model is cached, starting fast...${NC}"

WORK_DIR="$HOME/rip-web-gpu"
cd "$WORK_DIR"

# Pull latest changes
git pull --quiet origin main 2>/dev/null || true

PORT=${PORT:-8188}
AUTH_SECRET=${AUTH_SECRET:-"remixip-free-gpu-2026"}

# Start server
PORT=$PORT AUTH_SECRET=$AUTH_SECRET python3 self-hosted/server.py &
SERVER_PID=$!

# Wait for ready
for i in $(seq 1 120); do
    if curl -s "http://localhost:$PORT/health" >/dev/null 2>&1; then
        break
    fi
    sleep 2
done
echo -e "${GREEN}✓ Server ready${NC}"

# Start tunnel
TUNNEL_LOG="/tmp/cloudflared.log"
cloudflared tunnel --url "http://localhost:$PORT" --no-autoupdate > "$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!

sleep 8
TUNNEL_URL=$(grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' "$TUNNEL_LOG" 2>/dev/null | head -1)

if [ -n "$TUNNEL_URL" ]; then
    echo ""
    echo -e "${GREEN}✅ Live at: ${TUNNEL_URL}${NC}"
    echo ""
    echo -e "  ${YELLOW}Update Vercel env:${NC}"
    echo "    SELF_HOSTED_GPU_URL=${TUNNEL_URL}"
    echo ""
fi

cleanup() {
    kill $SERVER_PID 2>/dev/null
    kill $TUNNEL_PID 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM
wait $SERVER_PID
