#!/usr/bin/env node
/**
 * Run all E2E tests from the catalog via the E2E runner API
 * 
 * Prerequisites:
 * 1. Start the dev server with runner enabled: npm run dev:db:runner
 * 2. Wait for it to be ready at http://localhost:5173
 * 
 * Usage:
 *   node scripts/run-all-e2e-tests.mjs
 * 
 * Or with custom base URL:
 *   E2E_APP_URL=https://your-preview-url.web.app node scripts/run-all-e2e-tests.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Read and parse the catalog file
function loadCatalog() {
  const catalogPath = path.join(rootDir, 'src', 'testing', 'e2eCatalog.ts');
  const content = fs.readFileSync(catalogPath, 'utf8');
  
  // Extract catalog entries using regex (simple approach)
  const entries = [];
  const entryRegex = /{\s*id:\s*['"]([^'"]+)['"],\s*category:\s*['"]([^'"]+)['"],\s*name:\s*['"]([^'"]+)['"],[\s\S]*?specPath:\s*['"]([^'"]+)['"],\s*runScript:\s*['"`]([^'"`]+)['"`]/g;
  
  let match;
  while ((match = entryRegex.exec(content)) !== null) {
    entries.push({
      id: match[1],
      category: match[2],
      name: match[3],
      specPath: match[4],
      runScript: match[5],
    });
  }
  
  // Handle special case for researcher-docs-website (runScript is on separate line)
  const websiteMatch = content.match(/id:\s*['"]task-researcher-docs-website['"][\s\S]*?runScript:\s*(npm run [^\n,]+)/);
  if (websiteMatch) {
    const websiteEntry = entries.find((e) => e.id === 'task-researcher-docs-website');
    if (websiteEntry) {
      websiteEntry.runScript = websiteMatch[1].trim();
    }
  }
  
  return entries;
}

const e2eCatalog = loadCatalog();

const RUNNER_URL = process.env.E2E_RUNNER_URL || 'http://localhost:5173';
const BASE_URL = process.env.E2E_APP_URL || 'https://hs-levante-admin-dev--ai-tests-dctel36u.web.app';

async function checkRunnerAvailable() {
  try {
    const res = await fetch(`${RUNNER_URL}/__e2e/ping`);
    if (res.ok) {
      const json = await res.json();
      return json?.ok === true || json?.status === 'ok';
    }
  } catch (e) {
    console.error('Failed to ping runner:', e.message);
  }
  return false;
}

async function runTest(id, command) {
  console.log(`\n[${id}] Running...`);
  console.log(`  Command: ${command.replace(/\$\{E2E_APP_URL:-[^}]+\}/g, BASE_URL)}`);
  
  try {
    const res = await fetch(`${RUNNER_URL}/__e2e/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, command }),
    });
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }
    
    const json = await res.json();
    const runId = json?.runId;
    
    if (!runId) {
      throw new Error('No runId returned');
    }
    
    console.log(`  Run ID: ${runId}`);
    console.log(`  Status: queued`);
    
    // Poll for completion
    let finished = false;
    let attempts = 0;
    const maxAttempts = 600; // 10 minutes max (1 second per attempt)
    
    while (!finished && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
      
      try {
        const statusRes = await fetch(`${RUNNER_URL}/__e2e/status?runId=${encodeURIComponent(runId)}`);
        if (statusRes.ok) {
          const statusJson = await statusRes.json();
          const isFinished =
            statusJson?.finished === true ||
            statusJson?.status === 'finished' ||
            typeof statusJson?.exitCode === 'number' ||
            Boolean(statusJson?.finishedAt);
          if (isFinished) {
            finished = true;
            const exitCode = statusJson.exitCode ?? -1;
            const result = exitCode === 0 ? '✅ PASSED' : '❌ FAILED';
            console.log(`  ${result} (exit code: ${exitCode})`);
            return { id, runId, exitCode, passed: exitCode === 0 };
          }
        }
      } catch (e) {
        // Continue polling
      }
      
      if (attempts % 30 === 0) {
        console.log(`  Still running... (${attempts}s)`);
      }
    }
    
    if (!finished) {
      console.log(`  ⚠️  TIMEOUT (stopped polling after ${attempts}s)`);
      return { id, runId, exitCode: -1, passed: false };
    }
    
    return { id, runId, exitCode: -1, passed: false };
  } catch (e) {
    console.error(`  ❌ ERROR: ${e.message}`);
    return { id, exitCode: -1, passed: false, error: e.message };
  }
}

async function main() {
  console.log('E2E Test Runner - Running All Tests');
  console.log('==================================');
  console.log(`Runner URL: ${RUNNER_URL}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log('');
  
  // Check if runner is available
  console.log('Checking if runner is available...');
  const available = await checkRunnerAvailable();
  if (!available) {
    console.error('❌ E2E runner is not available!');
    console.error('');
    console.error('Please start the dev server with the runner enabled:');
    console.error('  npm run dev:db:runner');
    console.error('');
    console.error('Or set E2E_RUNNER_URL to point to your runner:');
    console.error('  E2E_RUNNER_URL=http://localhost:5173 node scripts/run-all-e2e-tests.mjs');
    process.exit(1);
  }
  
  console.log('✅ Runner is available\n');
  
  // Run all tests
  const results = [];
  const total = e2eCatalog.length;
  let current = 0;
  
  for (const entry of e2eCatalog) {
    current++;
    console.log(`\n[${current}/${total}] ${entry.name} (${entry.id})`);
    
    // Replace E2E_APP_URL in command
    const command = entry.runScript.replace(
      /\$\{E2E_APP_URL:-[^}]+\}/g,
      BASE_URL
    );
    
    const result = await runTest(entry.id, command);
    results.push(result);
  }
  
  // Summary
  console.log('\n\n========================================');
  console.log('Summary');
  console.log('========================================');
  
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed && !r.error).length;
  const errors = results.filter((r) => r.error).length;
  
  console.log(`Total: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Errors: ${errors}`);
  console.log('');
  console.log(`View results at: ${RUNNER_URL}/testing-results`);
  console.log('');
  
  if (failed > 0 || errors > 0) {
    console.log('Failed/Error tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.id}${r.error ? ` (${r.error})` : ''}`);
      });
    console.log('');
  }
  
  process.exit(failed + errors > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
