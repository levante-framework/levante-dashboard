const EU_DSN =
  process.env.SENTRY_DSN ??
  'https://977fb8ee9133661b62187e4d72502233@o4512100183048192.ingest.de.sentry.io/4512100188880976';

function parseDsn(dsn) {
  const url = new URL(dsn);
  const projectId = url.pathname.replace(/^\//, '');
  return {
    key: url.username,
    host: url.host,
    projectId,
  };
}

function eventId() {
  return crypto.randomUUID().replaceAll('-', '');
}

async function postStore({ host, projectId, key, message }) {
  const id = eventId();
  const response = await fetch(`https://${host}/api/${projectId}/store/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=sentry-eu-ingest-smoke/1.0.0, sentry_key=${key}`,
    },
    body: JSON.stringify({
      event_id: id,
      timestamp: new Date().toISOString(),
      platform: 'javascript',
      level: 'info',
      message,
      tags: { source: 'sentry-eu-ingest-smoke' },
    }),
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: response.status, ok: response.ok, json, eventId: id, text };
}

const eu = parseDsn(EU_DSN);
const euCapture = await postStore({
  ...eu,
  message: 'sentry_eu_ingest_smoke',
});

const result = {
  host: eu.host,
  projectId: eu.projectId,
  euCapture,
};

if (eu.host !== 'o4512100183048192.ingest.de.sentry.io' || !euCapture.ok || !euCapture.json?.id) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result));
