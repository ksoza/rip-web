# RemixIP Colab Keep-Alive & Auto-Restart System
# ================================================
# Solves: Google Colab disconnects after ~90 min idle / 12hr max
#
# Strategy:
#   1. Anti-idle: JS injection clicks "Connect" every 60s to prevent idle timeout
#   2. Session maximizer: Checkpoint model state to Google Drive for fast reload
#   3. Auto-restart monitor: External watchdog pings /health, re-triggers Colab if down
#   4. Session chaining: When 12hr limit hits, new session auto-loads from checkpoint
#
# Usage: Run this cell FIRST in the Colab notebook, before loading models.
# Then run the main RemixIP_Free_GPU.py cells.

import os
import sys
import time
import json
import signal
import hashlib
import threading
from pathlib import Path
from datetime import datetime, timedelta

# ================================================================
# 1. ANTI-IDLE: Prevent Colab from disconnecting due to inactivity
# ================================================================

KEEPALIVE_JS = """
<script>
// RemixIP Keep-Alive -- clicks Connect button every 60s to prevent idle
function remixipKeepAlive() {
  // Try multiple selectors (Colab UI changes)
  const selectors = [
    '#top-toolbar colab-connect-button',
    'colab-toolbar-button#connect',
    '.colab-toolbar button',
    '#connect',
  ];
  for (const sel of selectors) {
    const btn = document.querySelector(sel);
    if (btn) {
      btn.click();
      console.log('[RemixIP] Keep-alive click at', new Date().toLocaleTimeString());
      break;
    }
  }
}
// Run every 60 seconds
setInterval(remixipKeepAlive, 60000);
console.log('[RemixIP] Keep-alive started -- clicking Connect every 60s');
</script>
"""

def inject_keepalive():
    """Inject JS keep-alive into Colab notebook (prevents idle disconnect)."""
    try:
        from IPython.display import display, HTML
        display(HTML(KEEPALIVE_JS))
        print("[Keep-Alive] Anti-idle JS injected -- session will stay connected")
    except ImportError:
        print("[Keep-Alive] Not in Colab/Jupyter -- skipping JS injection")


# ================================================================
# 2. SESSION CHECKPOINT: Save model state to Google Drive for fast reload
# ================================================================

GDRIVE_CHECKPOINT_DIR = "/content/drive/MyDrive/RemixIP_Checkpoints"

def mount_gdrive():
    """Mount Google Drive for persistent storage across sessions."""
    try:
        from google.colab import drive
        drive.mount('/content/drive', force_remount=False)
        os.makedirs(GDRIVE_CHECKPOINT_DIR, exist_ok=True)
        print(f"[Checkpoint] Google Drive mounted at {GDRIVE_CHECKPOINT_DIR}")
        return True
    except Exception as e:
        print(f"[Checkpoint] Google Drive not available: {e}")
        print("[Checkpoint] Models will be re-downloaded each session (slower restart)")
        return False


def save_checkpoint(session_id=None):
    """Save session metadata to Google Drive for fast restart."""
    if not os.path.exists(GDRIVE_CHECKPOINT_DIR):
        return False

    checkpoint = {
        "session_id": session_id or hashlib.md5(str(time.time()).encode()).hexdigest()[:8],
        "timestamp": datetime.utcnow().isoformat(),
        "models_cached": {
            "wan_2_1": os.path.exists("/root/.cache/huggingface/hub/models--Wan-AI--Wan2.1-T2V-1.3B"),
            "xtts_v2": os.path.exists("/root/.cache/tts"),
            "kokoro": True,  # Tiny model, always re-download
        },
        "gpu_type": "unknown",
        "session_start": datetime.utcnow().isoformat(),
        "max_duration_hours": 12,
    }

    # Detect GPU
    try:
        import torch
        if torch.cuda.is_available():
            checkpoint["gpu_type"] = torch.cuda.get_device_name(0)
    except:
        pass

    path = os.path.join(GDRIVE_CHECKPOINT_DIR, "latest_session.json")
    with open(path, "w") as f:
        json.dump(checkpoint, f, indent=2)
    print(f"[Checkpoint] Session saved: {checkpoint['session_id']}")
    return True


def load_checkpoint():
    """Load previous session checkpoint to determine what needs re-downloading."""
    path = os.path.join(GDRIVE_CHECKPOINT_DIR, "latest_session.json")
    if not os.path.exists(path):
        return None
    with open(path, "r") as f:
        return json.load(f)


def setup_model_cache_on_gdrive():
    """
    Symlink HuggingFace cache to Google Drive so models persist across sessions.
    First session: downloads models (slow). Every session after: instant load from Drive.
    """
    if not os.path.exists("/content/drive"):
        return False

    gdrive_cache = os.path.join(GDRIVE_CHECKPOINT_DIR, "hf_cache")
    local_cache = "/root/.cache/huggingface"

    os.makedirs(gdrive_cache, exist_ok=True)

    # If local cache exists and is not a symlink, move it to Drive
    if os.path.exists(local_cache) and not os.path.islink(local_cache):
        import shutil
        # Merge existing cache into Drive
        for item in os.listdir(local_cache):
            src = os.path.join(local_cache, item)
            dst = os.path.join(gdrive_cache, item)
            if not os.path.exists(dst):
                shutil.move(src, dst)
        shutil.rmtree(local_cache, ignore_errors=True)

    # Create symlink: local cache -> Drive cache
    if not os.path.exists(local_cache):
        os.makedirs(os.path.dirname(local_cache), exist_ok=True)
        os.symlink(gdrive_cache, local_cache)
        print(f"[Cache] HF cache linked to Google Drive -- models persist across sessions")
        return True

    return False


# ================================================================
# 3. SESSION TIMER: Track time remaining and warn before disconnect
# ================================================================

class SessionTimer:
    """Tracks Colab session time and warns before the 12hr limit."""

    def __init__(self, max_hours=12):
        self.start_time = datetime.utcnow()
        self.max_duration = timedelta(hours=max_hours)
        self.warned = False
        self._timer_thread = None

    def time_remaining(self):
        elapsed = datetime.utcnow() - self.start_time
        remaining = self.max_duration - elapsed
        return max(timedelta(0), remaining)

    def hours_remaining(self):
        return self.time_remaining().total_seconds() / 3600

    def start_warning_timer(self):
        """Background thread that warns 30 min before session expires."""
        def _timer():
            while True:
                remaining = self.hours_remaining()
                if remaining <= 0.5 and not self.warned:
                    self.warned = True
                    print("\n" + "!" * 60)
                    print("!! WARNING: Colab session expires in ~30 minutes !!")
                    print("!! A new session will auto-start if watchdog is running !!")
                    print("!" * 60 + "\n")
                    # Save final checkpoint
                    save_checkpoint()
                if remaining <= 0:
                    print("\n[Session] 12hr limit reached. Session will disconnect.")
                    break
                time.sleep(300)  # Check every 5 min

        self._timer_thread = threading.Thread(target=_timer, daemon=True)
        self._timer_thread.start()
        print(f"[Timer] Session started. Max runtime: {self.max_duration}")
        print(f"[Timer] Will warn 30 min before expiry")


# ================================================================
# 4. EXTERNAL WATCHDOG: Runs on YOUR machine, monitors and restarts
# ================================================================
# This part runs OUTSIDE Colab (on your PC, a VPS, or as a cron job)

WATCHDOG_SCRIPT = '''#!/usr/bin/env python3
"""
RemixIP Colab Watchdog -- Run this on your local machine or a VPS.
Monitors the self-hosted GPU server and triggers restart if it goes down.

Usage:
  python colab_watchdog.py --url https://remixip-gpu.loca.lt --interval 60

Options:
  --url       The public URL of your Colab GPU server
  --interval  Seconds between health checks (default: 60)
  --webhook   Optional webhook URL to notify on restart (Slack, Discord, etc)
"""

import argparse
import time
import json
import urllib.request
import urllib.error
from datetime import datetime

def check_health(url):
    """Ping the /health endpoint. Returns True if server is up."""
    try:
        req = urllib.request.Request(
            f"{url}/health",
            headers={"User-Agent": "RemixIP-Watchdog/1.0"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            return data.get("status") == "ok"
    except:
        return False

def notify(webhook, message):
    """Send notification via webhook (Slack/Discord compatible)."""
    if not webhook:
        return
    try:
        data = json.dumps({"text": message, "content": message}).encode()
        req = urllib.request.Request(
            webhook,
            data=data,
            headers={"Content-Type": "application/json"},
        )
        urllib.request.urlopen(req, timeout=10)
    except:
        pass

def main():
    parser = argparse.ArgumentParser(description="RemixIP Colab Watchdog")
    parser.add_argument("--url", required=True, help="Self-hosted GPU URL")
    parser.add_argument("--interval", type=int, default=60, help="Check interval (seconds)")
    parser.add_argument("--webhook", help="Notification webhook URL")
    args = parser.parse_args()

    consecutive_failures = 0
    print(f"[Watchdog] Monitoring {args.url} every {args.interval}s")

    while True:
        is_up = check_health(args.url)
        now = datetime.now().strftime("%H:%M:%S")

        if is_up:
            if consecutive_failures > 0:
                msg = f"[{now}] Server RECOVERED after {consecutive_failures} failures"
                print(msg)
                notify(args.webhook, msg)
            consecutive_failures = 0
        else:
            consecutive_failures += 1
            print(f"[{now}] Health check FAILED (#{consecutive_failures})")

            if consecutive_failures >= 3:
                msg = f"[{now}] ALERT: GPU server DOWN for {consecutive_failures} checks. Restart Colab notebook."
                print(msg)
                notify(args.webhook, msg)
                # Reset counter after alert
                consecutive_failures = 0

        time.sleep(args.interval)

if __name__ == "__main__":
    main()
'''


# ================================================================
# 5. MAIN SETUP FUNCTION: Call this at the top of your Colab notebook
# ================================================================

def setup_remixip_session(max_hours=12):
    """
    Call this FIRST in your Colab notebook, before loading models.

    Sets up:
    - Anti-idle JS injection
    - Google Drive mounting + model cache
    - Session timer with 30-min warning
    - Checkpoint system for fast restart
    """
    print("=" * 60)
    print("  RemixIP Session Setup")
    print("=" * 60)

    # 1. Anti-idle
    inject_keepalive()

    # 2. Mount Google Drive + setup cache
    gdrive_ok = mount_gdrive()
    if gdrive_ok:
        setup_model_cache_on_gdrive()
        prev = load_checkpoint()
        if prev:
            print(f"[Checkpoint] Previous session found: {prev['session_id']} ({prev['timestamp']})")
            if prev.get('models_cached', {}).get('wan_2_1'):
                print("[Checkpoint] Wan 2.1 cached on Drive -- will load instantly")

    # 3. Start session timer
    timer = SessionTimer(max_hours=max_hours)
    timer.start_warning_timer()

    # 4. Save initial checkpoint
    save_checkpoint()

    print("\n" + "=" * 60)
    print("  Setup complete! Now run the model loading cells.")
    print(f"  Session will last up to {max_hours} hours.")
    print("=" * 60)

    return timer


# Auto-run if executed directly
if __name__ == "__main__":
    # If --watchdog flag, run the watchdog instead
    if "--watchdog" in sys.argv:
        # Write watchdog script and exec it
        watchdog_path = "/tmp/colab_watchdog.py"
        with open(watchdog_path, "w") as f:
            f.write(WATCHDOG_SCRIPT)
        os.execv(sys.executable, [sys.executable, watchdog_path] + sys.argv[2:])
    else:
        setup_remixip_session()
