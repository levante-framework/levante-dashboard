const POSTHOG_API_HOST = process.env.POSTHOG_API_HOST ?? 'https://eu.i.posthog.com';
const POSTHOG_PROJECT_KEY = process.env.POSTHOG_PROJECT_KEY ?? 'phc_vzBRhfMUdNALcdKyBFNwiMCDRyYjVtFnT9hrEZBKHFcJ';
const US_INGEST_HOST = 'https://us.i.posthog.com';

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: response.status, ok: response.ok, json };
}

const distinctId = `eu-cloud-smoke-${Date.now()}`;
const insertId = `eu-cloud-smoke-${crypto.randomUUID()}`;

const flags = await postJson(`${POSTHOG_API_HOST}/flags?v=2`, {
  api_key: POSTHOG_PROJECT_KEY,
  distinct_id: distinctId,
});

const usFlags = await postJson(`${US_INGEST_HOST}/flags?v=2`, {
  api_key: POSTHOG_PROJECT_KEY,
  distinct_id: distinctId,
});

const capture = await postJson(`${POSTHOG_API_HOST}/i/v0/e/`, {
  api_key: POSTHOG_PROJECT_KEY,
  event: 'eu_cloud_ingest_smoke',
  distinct_id: distinctId,
  properties: {
    $insert_id: insertId,
    source: 'posthog-eu-ingest-smoke',
  },
});

const result = {
  host: POSTHOG_API_HOST,
  distinctId,
  insertId,
  flags,
  usFlags,
  capture,
};

if (
  POSTHOG_API_HOST !== 'https://eu.i.posthog.com' ||
  !flags.ok ||
  flags.json?.errorsWhileComputingFlags !== false ||
  usFlags.ok ||
  !capture.ok ||
  capture.json?.status !== 'Ok'
) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result));
