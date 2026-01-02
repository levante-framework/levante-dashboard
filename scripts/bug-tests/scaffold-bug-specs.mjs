import fs from 'node:fs/promises';
import path from 'node:path';

function getArgValue(args, name) {
  const idx = args.indexOf(name);
  if (idx === -1) return null;
  return args[idx + 1] ?? null;
}

function hasArg(args, name) {
  return args.includes(name);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const inFile = getArgValue(args, '--in') ?? 'bug-tests/issues.p0p1.bug.json';
  const outDir = getArgValue(args, '--out-dir') ?? 'cypress/e2e/bugs';
  const force = hasArg(args, '--force');
  return { inFile, outDir, force };
}

function toFilename(number, state) {
  const stateSlug = state === 'closed' ? 'closed' : 'open';
  return `gh-${String(number).padStart(4, '0')}-${stateSlug}.cy.ts`;
}

function createSpecContents(issue) {
  const num = issue.number;
  const title = String(issue.title ?? '').replace(/\s+/g, ' ').trim();
  const state = issue.state === 'closed' ? 'closed' : 'open';
  const stateTag = state.toUpperCase();
  const url = issue.html_url ?? '';

  const testRunner =
    state === 'closed'
      ? 'it'
      : "(Cypress.env('E2E_RUN_OPEN_BUGS') ? it : it.skip)";

  return `import 'cypress-real-events';

describe(\`GH#${num} [${stateTag}] ${title}\`, () => {
  ${testRunner}('reproduces/guards the expected behavior', () => {
    // Issue: ${url}
    //
    // Goal:
    // - If the issue is [OPEN], this spec is a "repro" (may currently fail once implemented).
    // - If the issue is [CLOSED], this spec is a "regression guard" and should always pass.
    //
    // TODO:
    // - Add precise steps + assertions.
    // - Prefer stable selectors (data-cy / data-testid).
    //
    // Reporting pattern:
    // - Make the final assertions clearly match "Expected behavior" from the issue.
    cy.log('TODO: implement reproduction/regression assertions for GH#${num}');
  });
});
`;
}

async function fileExists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const { inFile, outDir, force } = parseArgs(process.argv);
  const inPath = path.isAbsolute(inFile) ? inFile : path.join(process.cwd(), inFile);
  const outPath = path.isAbsolute(outDir) ? outDir : path.join(process.cwd(), outDir);

  const raw = await fs.readFile(inPath, 'utf8');
  const parsed = JSON.parse(raw);
  const issues = Array.isArray(parsed.issues) ? parsed.issues : [];

  await fs.mkdir(outPath, { recursive: true });

  let created = 0;
  let skipped = 0;
  for (const issue of issues) {
    if (!issue || typeof issue.number !== 'number') continue;
    const filename = toFilename(issue.number, issue.state);
    const target = path.join(outPath, filename);

    if (!force && (await fileExists(target))) {
      skipped += 1;
      continue;
    }

    await fs.writeFile(target, createSpecContents(issue), 'utf8');
    created += 1;
  }

  console.log(`Scaffolded bug specs into ${outPath}`);
  console.log(`- created: ${created}`);
  console.log(`- skipped: ${skipped} (already existed; use --force to overwrite)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

