#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "  CLM AI Demo — Starting services"
echo "  ────────────────────────────────"

# Rules Engine (port 8000)
echo "  [1/2] Starting Rules Engine on port 8000..."
cd "$SCRIPT_DIR/../rules-engine"
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --log-level error &
RULES_PID=$!

sleep 2

# AI Service + Frontend (port 8001)
echo "  [2/2] Starting AI Service + Frontend on port 8001..."
cd "$SCRIPT_DIR/ai-service"
python3 -m pip install -r requirements.txt -q
python3 -m uvicorn main:app --host 0.0.0.0 --port 8001 --log-level error &
AI_PID=$!

sleep 2

echo ""
echo "  ✓ Rules Engine  →  http://localhost:8000/docs"
echo "  ✓ CLM Demo App  →  http://localhost:8001"
echo ""
echo "  Demo mode: runs without an API key (safe for live demos)"
echo "  Live mode:  add ANTHROPIC_API_KEY to ai-service/.env"
echo ""
echo "  Press Ctrl+C to stop both services."
echo ""

# Open the frontend HTML file directly in the browser
sleep 1
open "$SCRIPT_DIR/frontend/index.html" 2>/dev/null || xdg-open "$SCRIPT_DIR/frontend/index.html" 2>/dev/null || true

# Keep running until Ctrl+C
trap "kill $RULES_PID $AI_PID 2>/dev/null; echo '  Stopped.'; exit 0" INT
wait
