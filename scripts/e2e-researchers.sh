#!/usr/bin/env bash
set -uo pipefail
set -x

PORT="${E2E_PORT:-5173}"
VIDEO="${E2E_VIDEO:-true}"

cleanup() {
  set +e
  (test -f /tmp/vite-researchers.pid && kill "$(cat /tmp/vite-researchers.pid)" 2>/dev/null) || true
  pkill -f "vite --force --host --port ${PORT}" 2>/dev/null || true
  return 0
}

kill_on_port() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -ti:"$port" | xargs -r kill -9 2>/dev/null || true
  elif command -v fuser >/dev/null 2>&1; then
    fuser -k "${port}/tcp" 2>/dev/null || true
  else
    echo "WARN: neither lsof nor fuser available to free port ${port}" >&2
  fi
}

cleanup || true

if [ "${E2E_KILL_PORT:-TRUE}" = "TRUE" ] || [ "${E2E_KILL_PORT:-TRUE}" = "true" ]; then
  kill_on_port "$PORT"
fi

echo "Starting Vite dev server..."
VITE_LEVANTE=TRUE \
VITE_FIREBASE_PROJECT=DEV \
./node_modules/.bin/vite --force --host --port "$PORT" \
  > /tmp/vite-researchers.log 2>&1 &
vite_pid=$!
echo $vite_pid > /tmp/vite-researchers.pid
echo "Vite dev server started with PID $vite_pid"

echo "Waiting for Vite dev server on port ${PORT}..."
vite_ready=false
for i in $(seq 1 60); do
  if ! kill -0 $vite_pid 2>/dev/null; then
    echo "Vite dev server process died"
    echo "--- Vite log ---"
    tail -n 80 /tmp/vite-researchers.log || true
    exit 1
  fi
  if curl -sSf "http://localhost:${PORT}" >/dev/null 2>&1; then
    echo "Vite dev server ready"
    vite_ready=true
    break
  fi
  sleep 1
done

if [ "$vite_ready" = "false" ]; then
  echo "Vite dev server failed to become ready within 60 seconds"
  echo "--- Vite log ---"
  tail -n 120 /tmp/vite-researchers.log || true
  exit 1
fi

echo "Waiting additional 5 seconds for Vite to fully compile..."
sleep 5

SPEC_PATH="${E2E_SPEC:-cypress/e2e/researchers/**/*.cy.ts}"
if [ "${1:-}" = "--spec" ] && [ -n "${2:-}" ]; then
  SPEC_PATH="$2"
fi
BROWSER="${E2E_BROWSER:-chrome}"

# Ensure we only keep a single video for single-spec runs (avoid Cypress "(1)", "(2)" duplicates).
# When Cypress sees an existing video with the same base name, it creates a numbered variant.
if [ "$VIDEO" = "true" ] || [ "$VIDEO" = "TRUE" ]; then
  VIDEOS_DIR="/home/david/levante/levante-dashboard/cypress/videos"
  if [ -f "$SPEC_PATH" ]; then
    spec_base="$(basename "$SPEC_PATH")"
    rm -f \
      "${VIDEOS_DIR}/${spec_base}.mp4" \
      "${VIDEOS_DIR}/${spec_base}"\ \(*\).mp4 \
      "${VIDEOS_DIR}/${spec_base}-compressed.mp4" \
      "${VIDEOS_DIR}/${spec_base}-compressed"\ \(*\).mp4 \
      2>/dev/null || true
  fi
fi

echo "Running Cypress spec(s): ${SPEC_PATH}"
./node_modules/.bin/cypress run --browser "$BROWSER" --e2e --spec "$SPEC_PATH" --config "baseUrl=http://localhost:${PORT},video=${VIDEO},trashAssetsBeforeRuns=false"
code=$?

if [ "$code" -ne 0 ]; then
  echo '--- Vite last lines ---'
  tail -n 160 /tmp/vite-researchers.log || true
fi

echo "--- Cypress artifacts ---"
echo "Screenshots: /home/david/levante/levante-dashboard/cypress/screenshots"
echo "Videos:      /home/david/levante/levante-dashboard/cypress/videos"
if [ "$VIDEO" = "true" ] || [ "$VIDEO" = "TRUE" ]; then
  ls -1t /home/david/levante/levante-dashboard/cypress/videos 2>/dev/null | head -n 5 || true
fi

cleanup
exit "$code"

