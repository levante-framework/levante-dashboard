import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_OWNER = 'levante-framework';
const DEFAULT_REPO = 'levante-dashboard';
const DEFAULT_BUG_TYPE = 'Bug';
const DEFAULT_PRIORITY_LABELS = ['P0'];

function getArgValue(args, name) {
  const idx = args.indexOf(name);
  if (idx === -1) return null;
  return args[idx + 1] ?? null;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const owner = getArgValue(args, '--owner') ?? DEFAULT_OWNER;
  const repo = getArgValue(args, '--repo') ?? DEFAULT_REPO;
  const out = getArgValue(args, '--out') ?? 'bug-tests/issues.p0p1.bug.json';
  const perPageRaw = getArgValue(args, '--per-page') ?? '100';
  const perPage = Math.max(1, Math.min(100, Number(perPageRaw)));
  const priorityLabelsRaw = getArgValue(args, '--priority-labels');
  const bugType = getArgValue(args, '--bug-type') ?? DEFAULT_BUG_TYPE;
  const numbersFile = getArgValue(args, '--numbers-file');
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? null;

  const priorityLabels = (priorityLabelsRaw ? priorityLabelsRaw.split(',') : DEFAULT_PRIORITY_LABELS)
    .map((s) => s.trim())
    .filter(Boolean);

  return { owner, repo, out, perPage, token, bugType, priorityLabels, numbersFile };
}

function getHeaders(token) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'levante-dashboard-bug-tests',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function toIssueRecord(issue) {
  return {
    number: issue.number,
    title: issue.title,
    state: issue.state,
    state_reason: issue.state_reason ?? null,
    html_url: issue.html_url,
    labels: (issue.labels ?? []).map((l) => (typeof l === 'string' ? l : l?.name)).filter(Boolean),
    updated_at: issue.updated_at ?? null,
    closed_at: issue.closed_at ?? null,
    created_at: issue.created_at ?? null,
  };
}

async function fetchAllIssuesForLabelCombo({ owner, repo, token, query }) {
  const headers = getHeaders(token);
  const all = [];
  let page = 1;

  while (true) {
    const url = new URL('https://api.github.com/search/issues');
    url.searchParams.set('q', query);
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));

    const res = await fetch(url, { headers });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`GitHub search API failed: ${res.status} ${res.statusText} url=${url} body=${text}`);
    }

    const json = await res.json();
    const items = Array.isArray(json.items) ? json.items : [];
    all.push(...items);

    if (items.length < 100) break;
    page += 1;
    if (page > 10) break;
  }

  return all;
}

async function main() {
  const { owner, repo, out, token, bugType, priorityLabels, numbersFile } = parseArgs(process.argv);

  const states = ['open', 'closed'];
  const queries = [];
  if (numbersFile) {
    for (const state of states) {
      queries.push(`repo:${owner}/${repo} is:issue type:${bugType} state:${state}`);
    }
  } else {
    for (const prioLabel of priorityLabels) {
      for (const state of states) {
        // NOTE: GitHub's "Issue type" is queried via `type:Bug` (not a label).
        queries.push(`repo:${owner}/${repo} is:issue type:${bugType} label:"${prioLabel}" state:${state}`);
      }
    }
  }

  const raw = [];
  for (const q of queries) {
    const items = await fetchAllIssuesForLabelCombo({ owner, repo, token, query: q });
    raw.push(...items);
  }

  const byNumber = new Map();
  for (const issue of raw) {
    if (!issue || typeof issue.number !== 'number') continue;
    byNumber.set(issue.number, toIssueRecord(issue));
  }

  const issues = Array.from(byNumber.values()).sort((a, b) => b.number - a.number);

  let filtered = issues;
  if (numbersFile) {
    const numbersPath = path.isAbsolute(numbersFile) ? numbersFile : path.join(process.cwd(), numbersFile);
    const rawNumbers = await fs.readFile(numbersPath, 'utf8');
    const allowed = new Set(
      rawNumbers
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'))
        .map((l) => Number(l))
        .filter((n) => Number.isFinite(n)),
    );
    filtered = issues.filter((i) => allowed.has(i.number));
  }

  const open = filtered.filter((i) => i.state === 'open');
  const closed = filtered.filter((i) => i.state === 'closed');

  const payload = {
    generatedAt: new Date().toISOString(),
    repo: { owner, name: repo },
    counts: { total: issues.length, open: open.length, closed: closed.length },
    issues: filtered,
    open,
    closed,
  };

  const outPath = path.isAbsolute(out) ? out : path.join(process.cwd(), out);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');

  console.log(`Wrote ${filtered.length} issues to ${outPath}`);
  console.log(`- open:   ${open.length}`);
  console.log(`- closed: ${closed.length}`);
  console.log(`- issue type: ${bugType}`);
  if (numbersFile) console.log(`- filtered by numbers file: ${numbersFile}`);
  else console.log(`- priority labels tried: ${priorityLabels.join(', ')}`);
  console.log(`Note: set GITHUB_TOKEN (or GH_TOKEN) to avoid low rate limits.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

