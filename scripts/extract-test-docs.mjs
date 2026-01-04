#!/usr/bin/env node
/**
 * Extract test documentation from E2E test files
 *
 * Usage:
 *   node scripts/extract-test-docs.mjs [test-file-path]
 *   node scripts/extract-test-docs.mjs  # Lists all tests with docs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function extractDocBlock(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/\/\*\*\s*\n([\s\S]*?)\s*\*\/\s*\n/);
  if (!match) return null;

  const docBlock = match[1];
  const lines = docBlock.split('\n').map((line) => line.replace(/^\s*\*\s?/, '').trim());

  const doc = {
    file: path.relative(projectRoot, filePath),
    testId: null,
    category: null,
    description: [],
    setup: [],
    envVars: [],
    testCases: [],
    expectedBehavior: [],
    relatedDocs: [],
    modificationNotes: [],
  };

  let currentSection = null;
  for (const line of lines) {
    if (line.startsWith('@test-id')) {
      doc.testId = line.replace('@test-id', '').trim();
    } else if (line.startsWith('@category')) {
      doc.category = line.replace('@category', '').trim();
    } else if (line.startsWith('@description')) {
      currentSection = 'description';
    } else if (line.startsWith('@setup')) {
      currentSection = 'setup';
    } else if (line.startsWith('@required-env-vars')) {
      currentSection = 'envVars';
    } else if (line.startsWith('@test-cases')) {
      currentSection = 'testCases';
    } else if (line.startsWith('@expected-behavior')) {
      currentSection = 'expectedBehavior';
    } else if (line.startsWith('@related-docs')) {
      currentSection = 'relatedDocs';
    } else if (line.startsWith('@modification-notes')) {
      currentSection = 'modificationNotes';
    } else if (line && currentSection && !line.startsWith('@')) {
      doc[currentSection].push(line);
    }
  }

  return doc;
}

function formatDoc(doc) {
  const sections = [];
  if (doc.testId) sections.push(`**Test ID:** ${doc.testId}`);
  if (doc.category) sections.push(`**Category:** ${doc.category}`);
  if (doc.description.length) sections.push(`**Description:**\n${doc.description.join('\n')}`);
  if (doc.setup.length) sections.push(`**Setup:**\n${doc.setup.join('\n')}`);
  if (doc.envVars.length) sections.push(`**Required Env Vars:**\n${doc.envVars.join('\n')}`);
  if (doc.testCases.length) sections.push(`**Test Cases:**\n${doc.testCases.join('\n')}`);
  if (doc.expectedBehavior.length) sections.push(`**Expected Behavior:**\n${doc.expectedBehavior.join('\n')}`);
  if (doc.relatedDocs.length) sections.push(`**Related Docs:**\n${doc.relatedDocs.join('\n')}`);
  if (doc.modificationNotes.length) sections.push(`**Modification Notes:**\n${doc.modificationNotes.join('\n')}`);

  return `# ${path.basename(doc.file)}\n\n${sections.join('\n\n')}\n`;
}

function findTestFiles(dir = path.join(projectRoot, 'cypress', 'e2e')) {
  const files = [];
  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.cy.ts')) {
        files.push(fullPath);
      }
    }
  }
  walk(dir);
  return files;
}

const targetFile = process.argv[2];

if (targetFile) {
  // Extract docs from a specific file
  const filePath = path.isAbsolute(targetFile) ? targetFile : path.join(projectRoot, targetFile);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  const doc = extractDocBlock(filePath);
  if (!doc) {
    console.log(`No documentation found in ${filePath}`);
    process.exit(0);
  }
  console.log(formatDoc(doc));
} else {
  // List all tests with documentation
  const testFiles = findTestFiles();
  const docs = testFiles.map((file) => ({ file, doc: extractDocBlock(file) })).filter(({ doc }) => doc);

  if (docs.length === 0) {
    console.log('No tests with documentation found.');
    process.exit(0);
  }

  console.log(`Found ${docs.length} test(s) with documentation:\n`);
  for (const { file, doc } of docs) {
    console.log(`- ${doc.testId || path.basename(file)}: ${path.relative(projectRoot, file)}`);
  }
}
