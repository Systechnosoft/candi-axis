#!/usr/bin/env bash
# start.sh — ATS full startup script
# Run with: bash start.sh [--restart]
#
# Covers: env check → migrate → seed → bootstrap admin → start backend → start frontend
# Use --restart flag to kill existing processes before starting fresh.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$SCRIPT_DIR/ats-api"
UI_DIR="$SCRIPT_DIR/ats-ui"

echo ""
echo "==========================================="
echo "  ATS — Full Startup Flow"
echo "==========================================="

# --restart: kill any running instances first
if [[ "$1" == "--restart" ]]; then
  echo ""
  echo "--- Restarting: killing running ATS processes ---"
  lsof -ti:3000 | xargs kill -9 2>/dev/null && echo "  -> backend (port 3000) stopped" || echo "  -> no backend running on port 3000"
  lsof -ti:3001 | xargs kill -9 2>/dev/null && echo "  -> frontend (port 3001) stopped" || echo "  -> no frontend running on port 3001"
  sleep 1
fi

# Step 1: Env check
echo ""
echo "--- Step 1: Validating environment ---"
cd "$API_DIR"
npm run env:check

# Step 2: Migrations
echo ""
echo "--- Step 2: Running database migrations ---"
npm run db:migrate

# Step 3: Seeds
echo ""
echo "--- Step 3: Running database seeds ---"
npm run db:seed

# Step 4: Conditional bootstrap admin
echo ""
echo "--- Step 4: Ensuring bootstrap admin (conditional) ---"
npm run db:bootstrap

# Step 5: Start backend (dev mode, in background)
echo ""
echo "--- Step 5: Starting backend (ats-api) ---"
npm run start:dev &
API_PID=$!
echo "  -> backend started (PID: $API_PID). Waiting 5s for it to come up..."
sleep 5

# Step 6: Start frontend
echo ""
echo "--- Step 6: Starting frontend (ats-ui) ---"
cd "$UI_DIR"
npm run dev &
UI_PID=$!

echo ""
echo "==========================================="
echo "  ATS is running"
echo "  Backend : http://localhost:3000"
echo "  Frontend: http://localhost:3001"
echo "  Press Ctrl+C to stop both servers."
echo "==========================================="

# Wait for either process to exit
wait $API_PID $UI_PID
