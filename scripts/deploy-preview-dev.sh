#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

CHANNEL="${PREVIEW_CHANNEL:-}"
if [[ -z "$CHANNEL" ]]; then
  if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    CHANNEL="$(git rev-parse --abbrev-ref HEAD | tr '/.' '-' | tr -cd '[:alnum:]-' | cut -c1-40)"
  else
    CHANNEL="branch-preview"
  fi
fi

EXPIRES="${PREVIEW_EXPIRES:-7d}"

 VITE_PREVIEW_CHANNEL="${CHANNEL}" npm run build:dev
PROJECT_ID="${FIREBASE_PROJECT_ID:-hs-levante-admin-dev}"

echo "Deploying preview channel: ${CHANNEL} (expires: ${EXPIRES})"
DEPLOY_JSON="$(
  npx firebase hosting:channel:deploy "${CHANNEL}" \
    --project "${PROJECT_ID}" \
    --config firebase.json \
    --expires "${EXPIRES}" \
    --json
)"

echo "$DEPLOY_JSON" | node -e "
  import fs from 'fs';
  import path from 'path';
  let s = '';
  process.stdin.on('data', (d) => (s += d));
  process.stdin.on('end', () => {
    const o = JSON.parse(s);
    const url = o?.result?.production?.url || o?.result?.hosting?.[0]?.url || o?.result?.hosting?.url;

    console.log('');
    console.log('Preview URL:');
    console.log(url || '(could not parse url; re-run with --json and inspect output)');

    if (!url) return;

    const resultsDir = path.join(process.cwd(), '.tmp', 'e2e-runner');
    fs.mkdirSync(resultsDir, { recursive: true });
    fs.writeFileSync(path.join(resultsDir, 'target-base-url.txt'), String(url));
    fs.writeFileSync(
      path.join(resultsDir, 'target-base-url.json'),
      JSON.stringify(
        { updatedAt: new Date().toISOString(), projectId: process.env.FIREBASE_PROJECT_ID || '${PROJECT_ID}', channel: '${CHANNEL}', url },
        null,
        2,
      ),
    );
    console.log('');
    console.log('Saved runner target URL to:');
    console.log(path.join(resultsDir, 'target-base-url.txt'));
  });
"

