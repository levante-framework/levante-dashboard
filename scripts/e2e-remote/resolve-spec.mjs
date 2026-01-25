import fs from 'node:fs';

const specId = process.env.SPEC_ID || '';
const specPathInput = process.env.SPEC_PATH || '';

function normalizeSpecPath(input) {
  return input.replace(/^\.\/+/, '');
}

function isAllowedSpecPath(input) {
  return /^cypress\/e2e\/researchers\/[A-Za-z0-9_.\/-]+\.cy\.ts$/.test(input);
}

if (!specPathInput) {
  throw new Error(`Missing specPath (specId="${specId}")`);
}

const specPath = normalizeSpecPath(specPathInput);
if (!isAllowedSpecPath(specPath)) {
  throw new Error(`Invalid specPath: ${specPathInput}`);
}

if (!fs.existsSync(specPath)) {
  throw new Error(`Spec file not found: ${specPath}`);
}

const outputFile = process.env.GITHUB_OUTPUT;
if (!outputFile) {
  throw new Error('Missing GITHUB_OUTPUT');
}

fs.appendFileSync(outputFile, `spec=${specPath}\n`);
