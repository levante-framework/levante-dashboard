import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_OWNER = 'levante-framework';
const DEFAULT_REPO = 'levante-dashboard';

function getArgValue(args, name) {
  const idx = args.indexOf(name);
  if (idx === -1) return null;
  return args[idx + 1] ?? null;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const owner = getArgValue(args, '--owner') ?? DEFAULT_OWNER;
  const repo = getArgValue(args, '--repo') ?? DEFAULT_REPO;

  const projectOrg = getArgValue(args, '--project-org'); // e.g. levante-framework
  const projectNumberRaw = getArgValue(args, '--project-number'); // e.g. 12
  const priorityValue = getArgValue(args, '--priority') ?? 'P0'; // P0 or P1
  const state = getArgValue(args, '--state') ?? 'open'; // open|closed|all

  const out = getArgValue(args, '--out') ?? `bug-tests/issues.priority-${priorityValue.toLowerCase()}.${state}.json`;
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? null;

  const projectNumber = projectNumberRaw ? Number(projectNumberRaw) : null;
  return { owner, repo, projectOrg, projectNumber, priorityValue, state, out, token };
}

function getHeaders(token) {
  if (!token) {
    throw new Error('Missing GITHUB_TOKEN (or GH_TOKEN). GitHub Projects (GraphQL) requires authentication.');
  }
  return {
    Authorization: `Bearer ${token}`,
    'User-Agent': 'levante-dashboard-bug-tests',
  };
}

async function graphql(token, query, variables) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`GitHub GraphQL failed: ${res.status} ${res.statusText} body=${JSON.stringify(json)}`);
  }
  if (json.errors?.length) {
    const hasSamlFailure = json.errors.some((e) => Boolean(e?.extensions?.saml_failure));
    if (hasSamlFailure) {
      throw new Error(
        [
          'GitHub GraphQL blocked by organization SAML enforcement.',
          'Grant your Personal Access Token access to the organization via SSO, then retry.',
          'Steps:',
          '- Go to GitHub Settings → Developer settings → Personal access tokens',
          '- Find your token → Configure SSO / Enable SSO',
          '- Authorize for the levante-framework organization',
        ].join('\n'),
      );
    }
    throw new Error(`GitHub GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

function normalizeRepoName(owner, repo) {
  return `${owner}/${repo}`.toLowerCase();
}

function getIssueTypeName(item) {
  const it = item?.issueType?.name;
  return typeof it === 'string' ? it : null;
}

function isBugIssue(issue) {
  // Prefer GitHub Issue Type if present; fall back to common title prefix.
  const issueTypeName = getIssueTypeName(issue);
  if (issueTypeName) return issueTypeName.toLowerCase() === 'bug';
  const title = String(issue?.title ?? '');
  return /\[bug\]/i.test(title);
}

function getPriorityFromFieldValues(item, priorityFieldName = 'Priority') {
  const nodes = item?.fieldValues?.nodes;
  if (!Array.isArray(nodes)) return null;
  for (const n of nodes) {
    if (!n || typeof n !== 'object') continue;
    const fieldName = n?.field?.name;
    if (fieldName !== priorityFieldName) continue;
    const name = n?.name;
    return typeof name === 'string' ? name : null;
  }
  return null;
}

function toIssueRecord(issue, priority) {
  return {
    number: issue.number,
    title: issue.title,
    state: issue.state?.toLowerCase?.() ?? issue.state,
    html_url: issue.url,
    repo: issue.repository?.nameWithOwner ?? null,
    priority,
    updated_at: issue.updatedAt ?? null,
  };
}

async function main() {
  const { owner, repo, projectOrg, projectNumber, priorityValue, state, out, token } = parseArgs(process.argv);

  if (!projectOrg || !projectNumber) {
    throw new Error(
      'Missing --project-org and/or --project-number. Example: --project-org levante-framework --project-number 1',
    );
  }

  const q = `
    query($org: String!, $number: Int!, $after: String) {
      organization(login: $org) {
        projectV2(number: $number) {
          title
          items(first: 100, after: $after) {
            pageInfo { hasNextPage endCursor }
            nodes {
              id
              content {
                __typename
                ... on Issue {
                  number
                  title
                  state
                  url
                  updatedAt
                  repository { nameWithOwner }
                  issueType { name }
                }
              }
              fieldValues(first: 50) {
                nodes {
                  __typename
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                    field { ... on ProjectV2SingleSelectField { name } }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const wantedRepo = normalizeRepoName(owner, repo);
  const wantedPriority = String(priorityValue);
  const wantedState = state.toLowerCase();

  const all = [];
  let after = null;
  while (true) {
    const data = await graphql(token, q, { org: projectOrg, number: projectNumber, after });
    const project = data?.organization?.projectV2;
    const items = project?.items?.nodes ?? [];

    for (const item of items) {
      const content = item?.content;
      if (!content || content.__typename !== 'Issue') continue;

      const repoName = String(content.repository?.nameWithOwner ?? '').toLowerCase();
      if (repoName !== wantedRepo) continue;

      if (!isBugIssue(content)) continue;

      const p = getPriorityFromFieldValues(item, 'Priority');
      if (p !== wantedPriority) continue;

      const issueState = String(content.state ?? '').toLowerCase();
      if (wantedState !== 'all' && issueState !== wantedState) continue;

      all.push(toIssueRecord(content, p));
    }

    const pageInfo = project?.items?.pageInfo;
    if (!pageInfo?.hasNextPage) break;
    after = pageInfo.endCursor;
    if (!after) break;
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    project: { org: projectOrg, number: projectNumber },
    repo: { owner, name: repo },
    filters: { priority: wantedPriority, state: wantedState, type: 'Bug' },
    counts: { total: all.length },
    issues: all.sort((a, b) => b.number - a.number),
  };

  const outPath = path.isAbsolute(out) ? out : path.join(process.cwd(), out);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${all.length} issues to ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

