const express = require('express');
const admin = require('firebase-admin');
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

if (!admin.apps.length) admin.initializeApp();

const OWNER = 'levante-framework';
const REPO = 'levante-dashboard';
const WORKFLOW_FILE = 'e2e-remote-runner.yml';

const E2E_RUNS_COLLECTION = 'e2eRuns';
const E2E_RESULTS_COLLECTION = 'e2eResults';

const GITHUB_E2E_TOKEN = defineSecret('GITHUB_E2E_TOKEN');

async function requireSuperAdmin(req) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  if (!token) throw Object.assign(new Error('Missing Authorization Bearer token'), { statusCode: 401 });

  const decoded = await admin.auth().verifyIdToken(token);
  const isSuperAdmin = Boolean(decoded.super_admin);
  if (!isSuperAdmin) throw Object.assign(new Error('Forbidden: requires super_admin'), { statusCode: 403 });
  return decoded;
}

function sendJson(res, status, body) {
  res.status(status).type('application/json').send(JSON.stringify(body));
}

function isValidGitRef(ref) {
  return typeof ref === 'string' && /^[A-Za-z0-9._/-]{1,100}$/.test(ref);
}

async function githubFetch(path, { method = 'GET', body } = {}) {
  const token = GITHUB_E2E_TOKEN.value();
  if (!token) throw new Error('Missing secret: GITHUB_E2E_TOKEN');

  const url = `https://api.github.com${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(`GitHub API failed: ${res.status} ${res.statusText}`);
    err.statusCode = 502;
    err.details = { path, status: res.status, body: json ?? text };
    throw err;
  }
  return json;
}

async function findRunByClientRunId({ gitRef, clientRunId }) {
  const runs = await githubFetch(
    `/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_FILE}/runs?event=workflow_dispatch&branch=${encodeURIComponent(
      gitRef,
    )}&per_page=25`,
  );

  const list = Array.isArray(runs?.workflow_runs) ? runs.workflow_runs : [];
  return (
    list.find((r) => typeof r?.display_title === 'string' && r.display_title.includes(clientRunId)) ??
    list.find((r) => typeof r?.name === 'string' && r.name.includes(clientRunId)) ??
    null
  );
}

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/e2e/ping', async (req, res) => {
  try {
    await requireSuperAdmin(req);
    return sendJson(res, 200, { ok: true });
  } catch (e) {
    return sendJson(res, e?.statusCode || 500, { ok: false, error: String(e?.message ?? e) });
  }
});

app.post('/e2e/run', async (req, res) => {
  try {
    const decoded = await requireSuperAdmin(req);
    const { specId, baseUrl, gitRef, clientRunId } = req.body ?? {};

    if (typeof specId !== 'string' || !specId) return sendJson(res, 400, { error: 'Missing specId' });
    if (typeof baseUrl !== 'string' || !baseUrl) return sendJson(res, 400, { error: 'Missing baseUrl' });
    if (!isValidGitRef(gitRef)) return sendJson(res, 400, { error: 'Invalid gitRef' });
    if (typeof clientRunId !== 'string' || !clientRunId) return sendJson(res, 400, { error: 'Missing clientRunId' });

    await githubFetch(`/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`, {
      method: 'POST',
      body: { ref: gitRef, inputs: { specId, baseUrl, clientRunId } },
    });

    const db = admin.firestore();
    await db.collection(E2E_RUNS_COLLECTION).doc(clientRunId).set(
      {
        specId,
        baseUrl,
        gitRef,
        status: 'queued',
        requestedByUid: decoded.uid,
        requestedByEmail: decoded.email ?? null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return sendJson(res, 200, { clientRunId });
  } catch (e) {
    return sendJson(res, e?.statusCode || 500, { error: String(e?.message ?? e), details: e?.details ?? null });
  }
});

app.get('/e2e/status', async (req, res) => {
  try {
    await requireSuperAdmin(req);
    const runId = req.query?.runId;
    if (typeof runId !== 'string' || !runId) return sendJson(res, 400, { error: 'Missing runId' });

    const db = admin.firestore();
    const runRef = db.collection(E2E_RUNS_COLLECTION).doc(runId);
    const runSnap = await runRef.get();
    if (!runSnap.exists) return sendJson(res, 404, { error: 'Unknown runId' });
    const run = runSnap.data() ?? {};

    let githubRun = null;
    if (typeof run.githubRunId === 'number') {
      githubRun = await githubFetch(`/repos/${OWNER}/${REPO}/actions/runs/${run.githubRunId}`);
    } else if (typeof run.gitRef === 'string') {
      githubRun = await findRunByClientRunId({ gitRef: run.gitRef, clientRunId: runId });
      if (githubRun?.id) {
        await runRef.set({ githubRunId: githubRun.id, githubUrl: githubRun.html_url ?? null }, { merge: true });
      }
    }

    const status = githubRun?.status ?? run.status ?? 'queued';
    const conclusion = githubRun?.conclusion ?? null;
    const htmlUrl = githubRun?.html_url ?? run.githubUrl ?? null;

    if (status === 'completed' && typeof run.specId === 'string') {
      const result = conclusion === 'success' ? 'pass' : 'fail';
      const finishedAtIso = githubRun?.updated_at ?? new Date().toISOString();

      await db.collection(E2E_RESULTS_COLLECTION).doc(run.specId).set(
        {
          result,
          lastRunAt: finishedAtIso,
          lastRunRunId: runId,
          lastRunUrl: htmlUrl,
          lastRunBaseUrl: run.baseUrl ?? null,
          lastRunGitRef: run.gitRef ?? null,
        },
        { merge: true },
      );

      await runRef.set(
        {
          status: 'completed',
          conclusion,
          finishedAt: finishedAtIso,
          githubUrl: htmlUrl,
        },
        { merge: true },
      );
    }

    return sendJson(res, 200, { runId, status, conclusion, url: htmlUrl });
  } catch (e) {
    return sendJson(res, e?.statusCode || 500, { error: String(e?.message ?? e), details: e?.details ?? null });
  }
});

app.get('/e2e/results', async (req, res) => {
  try {
    await requireSuperAdmin(req);
    const db = admin.firestore();
    const snap = await db.collection(E2E_RESULTS_COLLECTION).get();
    const byId = {};
    snap.forEach((doc) => {
      byId[doc.id] = doc.data();
    });
    return sendJson(res, 200, { byId });
  } catch (e) {
    return sendJson(res, e?.statusCode || 500, { error: String(e?.message ?? e) });
  }
});

exports.api = onRequest(
  {
    region: 'us-central1',
    cors: true,
    secrets: [GITHUB_E2E_TOKEN],
  },
  app,
);

