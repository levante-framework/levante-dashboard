#!/usr/bin/env bash
set -euo pipefail

TEST_ID="${1:-}"
MODE="${MODE:-generate}" # generate | rerun
ADDITIONAL_INSTRUCTION="${ADDITIONAL_INSTRUCTION:-}"
LOCAL_EMULATOR="${LOCAL_EMULATOR:-0}" # 1 => start firebase emulators + vite locally

if [[ -z "${TEST_ID}" ]]; then
  echo "Usage: $0 <TEST_ID> (e.g. $0 TC101)"
  exit 2
fi

if [[ -z "${API_KEY:-}" ]]; then
  echo "Missing API_KEY (TestSprite API key) in environment."
  exit 2
fi

DEFAULT_EMAIL="student@levante.test"
DEFAULT_PASSWORD="student123"

# In hosted mode (default), we prefer KEEP for password so we never hardcode secrets.
EMAIL="${EMAIL:-${E2E_TEST_EMAIL:-}}"
PASSWORD="${KEEP:-${E2E_TEST_PASSWORD:-${PASSWORD:-}}}"

# In local emulator mode, we MUST use emulator creds by default; prod creds usually won't exist in emulator.
# To override, pass EMAIL/PASSWORD explicitly AND set USE_EXISTING_CREDS=1.
USE_EXISTING_CREDS="${USE_EXISTING_CREDS:-0}"
if [[ "${LOCAL_EMULATOR}" == "1" && "${USE_EXISTING_CREDS}" != "1" ]]; then
  EMAIL="${E2E_EMU_EMAIL:-${DEFAULT_EMAIL}}"
  PASSWORD="${E2E_EMU_PASSWORD:-${DEFAULT_PASSWORD}}"
fi

if [[ -z "${EMAIL}" || -z "${PASSWORD}" ]]; then
  echo "Missing credentials. Provide EMAIL and KEEP (preferred) in environment."
  exit 2
fi

PROJECT_PATH="$(pwd)"
TMP_DIR="${PROJECT_PATH}/testsprite_tests/tmp"
CONFIG_PATH="${TMP_DIR}/config.json"
PRESERVE_ARTIFACTS="${PRESERVE_TESTSPRITE_ARTIFACTS:-0}"
E2E_BASE_URL="${E2E_BASE_URL:-https://hs-levante-admin-dev.web.app}"
EMU_UI_PORT="${EMU_UI_PORT:-4001}"
AUTH_PORT="${AUTH_PORT:-9199}"
FS_PORT="${FS_PORT:-8180}"
VITE_PORT="${VITE_PORT:-5173}"
VITE_UPSTREAM_PORT="${VITE_UPSTREAM_PORT:-5174}"

firebase_pid=""
vite_pid=""
proxy_pid=""

cleanup() {
  # Best-effort cleanup; do not fail on cleanup
  if [[ -n "${proxy_pid}" ]]; then
    kill "${proxy_pid}" >/dev/null 2>&1 || true
  fi
  if [[ -n "${vite_pid}" ]]; then
    kill "${vite_pid}" >/dev/null 2>&1 || true
  fi
  if [[ -n "${firebase_pid}" ]]; then
    kill "${firebase_pid}" >/dev/null 2>&1 || true
  fi
  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -ti tcp:5173 2>/dev/null || true)"
    if [[ -n "${pids}" ]]; then
      kill ${pids} >/dev/null 2>&1 || true
    fi
  fi
  rm -f "${CONFIG_PATH}" >/dev/null 2>&1 || true
  if [[ "${PRESERVE_ARTIFACTS}" != "1" ]]; then
    rm -f "${TMP_DIR}/test_results.json" "${TMP_DIR}/raw_report.md" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

mkdir -p "${TMP_DIR}"

node "${PROJECT_PATH}/scripts/testsprite/patch-testsprite-mcp-proxy.mjs" >/dev/null 2>&1 || true

if [[ "${LOCAL_EMULATOR}" == "1" ]]; then
  echo "Starting Firebase emulators (auth+firestore), Vite on :${VITE_UPSTREAM_PORT}, and emulator proxy on :${VITE_PORT}..."

  if command -v lsof >/dev/null 2>&1; then
    lsof -ti tcp:${VITE_PORT} | xargs -r kill -9 >/dev/null 2>&1 || true
    lsof -ti tcp:${VITE_UPSTREAM_PORT} | xargs -r kill -9 >/dev/null 2>&1 || true
    lsof -ti tcp:${EMU_UI_PORT} | xargs -r kill -9 >/dev/null 2>&1 || true
    lsof -ti tcp:${AUTH_PORT} | xargs -r kill -9 >/dev/null 2>&1 || true
    lsof -ti tcp:${FS_PORT} | xargs -r kill -9 >/dev/null 2>&1 || true
  fi

  ./node_modules/.bin/firebase emulators:start \
    --only auth,firestore \
    --project levante-admin-dev \
    --config firebase.json \
    > "${TMP_DIR}/firebase-emu.log" 2>&1 &
  firebase_pid=$!

  for i in $(seq 1 60); do
    if ! kill -0 "${firebase_pid}" 2>/dev/null; then
      echo "Firebase emulator process died."
      tail -n 120 "${TMP_DIR}/firebase-emu.log" || true
      exit 1
    fi
    if curl -sSf "http://127.0.0.1:${EMU_UI_PORT}" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  # Seed emulator user (idempotent). Wait for Auth emulator readiness.
  seeded=false
  for i in $(seq 1 60); do
    if ! kill -0 "${firebase_pid}" 2>/dev/null; then
      echo "Firebase emulator process died."
      tail -n 120 "${TMP_DIR}/firebase-emu.log" || true
      exit 1
    fi

    resp="$(curl -sS -X POST \
      -H 'Content-Type: application/json' \
      -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\",\"returnSecureToken\":true}" \
      "http://127.0.0.1:${AUTH_PORT}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=dummy" \
      || true)"

    if echo "${resp}" | grep -q '"idToken"'; then
      seeded=true
      break
    fi

    # If already exists, continue as success
    if echo "${resp}" | grep -q 'EMAIL_EXISTS'; then
      seeded=true
      break
    fi

    sleep 1
  done

  if [[ "${seeded}" != "true" ]]; then
    echo "Auth emulator user seed did not succeed."
    echo "Last response: ${resp}"
    exit 1
  fi

  VITE_HTTPS=FALSE \
  VITE_LEVANTE=TRUE \
  VITE_FIREBASE_PROJECT=DEV \
  VITE_EMULATOR=TRUE \
  VITE_EMULATOR_PROXY_PORT="${VITE_PORT}" \
  ./node_modules/.bin/vite --force --host --port "${VITE_UPSTREAM_PORT}" \
    > "${TMP_DIR}/vite.log" 2>&1 &
  vite_pid=$!

  PORT="${VITE_PORT}" \
  VITE_PORT="${VITE_UPSTREAM_PORT}" \
  AUTH_PORT="${AUTH_PORT}" \
  FS_PORT="${FS_PORT}" \
  node "${PROJECT_PATH}/scripts/testsprite/emulator-proxy.mjs" > "${TMP_DIR}/emulator-proxy.log" 2>&1 &
  proxy_pid=$!
else
  echo "Starting redirect server (port 5173) for TestSprite tunnel (→ ${E2E_BASE_URL})..."
  E2E_BASE_URL="${E2E_BASE_URL}" node "${PROJECT_PATH}/scripts/testsprite/redirect-server.mjs" >/dev/null 2>&1 &
fi

for i in $(seq 1 30); do
  code="$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/ || true)"
  if [[ "${code}" != "000" ]]; then
    break
  fi
  sleep 1
done

if [[ "${code}" == "000" ]]; then
  echo "Dev server did not start on http://localhost:5173/ in time."
  exit 1
fi

cat > "${CONFIG_PATH}" <<JSON
{
  "status": "init",
  "scope": "codebase",
  "type": "frontend",
  "localEndpoint": "http://localhost:5173/signin",
  "loginUser": "$(printf '%s' "${EMAIL}" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read().strip()))' | sed -e 's/^\"//' -e 's/\"$//')",
  "loginPassword": "$(printf '%s' "${PASSWORD}" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read().strip()))' | sed -e 's/^\"//' -e 's/\"$//')",
  "executionArgs": {
    "projectName": "levante-dashboard",
    "projectPath": "${PROJECT_PATH}",
    "testIds": ["${TEST_ID}"],
    "additionalInstruction": $(python3 - <<PY
import json, os
print(json.dumps(os.environ.get("ADDITIONAL_INSTRUCTION","")))
PY
),
    "envs": {
      "EMAIL": "$(printf '%s' "${EMAIL}" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read().strip()))' | sed -e 's/^\"//' -e 's/\"$//')",
      "PASSWORD": "$(printf '%s' "${PASSWORD}" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read().strip()))' | sed -e 's/^\"//' -e 's/\"$//')"
    }
  }
}
JSON

if [[ "${MODE}" == "rerun" ]]; then
  ./node_modules/.bin/testsprite-mcp-plugin reRunTests
else
  ./node_modules/.bin/testsprite-mcp-plugin generateCodeAndExecute
fi

# Scrub secrets from artifacts in case TestSprite generated hard-coded credentials.
if [[ -f "${TMP_DIR}/test_results.json" ]]; then
  EMAIL_TO_SCRUB="${EMAIL}"
  PASSWORD_TO_SCRUB="${PASSWORD}"
  python3 - <<PY
import json, os
from pathlib import Path

email = os.environ.get("EMAIL_TO_SCRUB", "")
password = os.environ.get("PASSWORD_TO_SCRUB", "")
p = Path("${TMP_DIR}/test_results.json")

def scrub_value(v):
    if isinstance(v, str):
        if email:
            v = v.replace(email, "\${EMAIL}")
        if password:
            v = v.replace(password, "\${PASSWORD}")
        return v
    if isinstance(v, list):
        return [scrub_value(x) for x in v]
    if isinstance(v, dict):
        return {k: scrub_value(val) for k, val in v.items()}
    return v

items = json.loads(p.read_text())
items = scrub_value(items)
p.write_text(json.dumps(items, indent=2, ensure_ascii=False) + "\n")
PY
fi

if [[ -f "${TMP_DIR}/raw_report.md" ]]; then
  python3 - <<PY
import os
from pathlib import Path

email = os.environ.get("EMAIL_TO_SCRUB", "")
password = os.environ.get("PASSWORD_TO_SCRUB", "")
p = Path("${TMP_DIR}/raw_report.md")
text = p.read_text()
if email:
    text = text.replace(email, "\${EMAIL}")
if password:
    text = text.replace(password, "\${PASSWORD}")
p.write_text(text)
PY
fi

if [[ -f "${TMP_DIR}/test_results.json" ]]; then
  python3 - <<PY
import json
from pathlib import Path
p = Path("${TMP_DIR}/test_results.json")
items = json.loads(p.read_text())
item = items[0]
print("Test status:", item.get("testStatus"))
print("Dashboard:", f"https://www.testsprite.com/dashboard/mcp/tests/{item.get('projectId')}/{item.get('testId')}")
print("Video:", item.get("testVisualization"))
PY
else
  echo "No test_results.json found at ${TMP_DIR}/test_results.json"
fi

