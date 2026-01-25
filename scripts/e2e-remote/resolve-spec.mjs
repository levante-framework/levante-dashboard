import fs from 'node:fs';

const allowlistPath = new URL('./spec-allowlist.json', import.meta.url);
const allowlist = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));

const specId = process.env.SPEC_ID || '';
const specPathInput = process.env.SPEC_PATH || '';

function normalizeSpecPath(input) {
  return input.replace(/^\.\/+/, '');
}

function isAllowedSpecPath(input) {
  return /^cypress\/e2e\/researchers\/[A-Za-z0-9_.\/-]+\.cy\.ts$/.test(input);
}

let specPath = '';

if (specPathInput) {
  const normalized = normalizeSpecPath(specPathInput);
  if (!isAllowedSpecPath(normalized)) {
    throw new Error(`Invalid specPath: ${specPathInput}`);
  }
  specPath = normalized;
} else {
  specPath = allowlist[specId] || '';
}

if (!specPath) {
  throw new Error(`Unknown/blocked specId: ${specId}`);
}

if (!fs.existsSync(specPath)) {
  throw new Error(`Spec file not found: ${specPath}`);
}

const outputFile = process.env.GITHUB_OUTPUT;
if (!outputFile) {
  throw new Error('Missing GITHUB_OUTPUT');
}

fs.appendFileSync(outputFile, `spec=${specPath}\n`);
