#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "  CLM AI Demo — Starting services"
echo "  ────────────────────────────────"

# Rules Engine (port 8000)
echo "  [1/3] Starting Rules Engine on port 8000..."
cd "$SCRIPT_DIR/../rules-engine"
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --log-level error &
RULES_PID=$!

sleep 2

# AI Service (port 8001)
echo "  [2/3] Starting AI Service on port 8001..."
cd "$SCRIPT_DIR/ai-service"
python3 -m pip install -r requirements.txt -q
python3 -m uvicorn main:app --host 0.0.0.0 --port 8001 --log-level error &
AI_PID=$!

sleep 2

# LiveKit Voice Agent — only if LIVEKIT credentials are present in .env
LIVEKIT_PID=""
cd "$SCRIPT_DIR/ai-service"
if [ -f ".env" ] && grep -q "LIVEKIT_API_KEY=" .env && grep -v "^#" .env | grep -q "LIVEKIT_API_KEY=."; then
  echo "  [3/3] Starting LiveKit voice agent (dev mode)..."

  # Download Silero VAD model files on first run
  if [ ! -d "$HOME/.cache/livekit" ]; then
    echo "         Downloading voice model files (first time only)..."
    python3 livekit_agent.py download-files 2>/dev/null || true
  fi

  python3 livekit_agent.py dev &
  LIVEKIT_PID=$!
  sleep 2
  echo "  ✓ Voice Agent   →  connected to LiveKit Cloud"
else
  echo "  [3/3] LiveKit voice not configured — skipping"
  echo "         (add LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET to ai-service/.env to enable)"
fi

echo ""
echo "  ✓ Rules Engine  →  http://localhost:8000/docs"
echo "  ✓ CLM Demo App  →  http://localhost:8001"
echo ""
echo "  Text mode: runs without API keys (safe for live demos)"
echo "  Live mode: add ANTHROPIC_API_KEY to ai-service/.env"
echo "  Voice mode: add LIVEKIT_* keys to ai-service/.env"
echo ""
echo "  Press Ctrl+C to stop all services."
echo ""

# Open the POC frontend directly in the browser
sleep 1
open "$SCRIPT_DIR/../POC/index.html" 2>/dev/null || xdg-open "$SCRIPT_DIR/../POC/index.html" 2>/dev/null || true

# Keep running until Ctrl+C
trap "kill $RULES_PID $AI_PID ${LIVEKIT_PID:-} 2>/dev/null; echo '  Stopped.'; exit 0" INT
wait
