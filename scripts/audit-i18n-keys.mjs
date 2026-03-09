import fs from 'node:fs';
import path from 'node:path';

// Static i18n usage audit:
// - uses en-US component translation keys as the key inventory
// - scans source files for translation calls
// - normalizes legacy flat namespaces (e.g., navBar.* -> components.navbar.*)
// - reports used, unused, unresolved, and dynamic callsites
const root = process.cwd();
const srcRoot = path.join(root, 'src');
const translationsPath = path.join(srcRoot, 'translations/en/us/en-US-componentTranslations.json');
const i18nPath = path.join(srcRoot, 'translations/i18n.ts');
const reportDir = path.join(root, 'docs');
const reportPath = path.join(reportDir, 'i18n-key-usage-report.md');

// Flattens nested translation objects into dot-path keys.
function flatten(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj || {})) {
    const next = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...flatten(v, next));
    else out.push(next);
  }
  return out;
}

// Recursively collects source files where translation calls can appear.
function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['translations', 'node_modules', 'dist', '.git'].includes(e.name)) continue;
      out.push(...walk(p));
    } else if (/\.(vue|ts|js)$/.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

// Reads namespace aliases from i18n.ts (namespaceMap) so old key prefixes resolve.
function parseNamespaceMap(i18nText) {
  const map = {};
  const regex = /(\w+)\s*:\s*'([^']+)'/g;
  let m;
  while ((m = regex.exec(i18nText))) {
    if (m[2].includes('.')) map[m[1]] = m[2];
  }
  return map;
}

function toRelative(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, '/');
}

const translations = JSON.parse(fs.readFileSync(translationsPath, 'utf8'));
const keys = flatten(translations).sort();
const keySet = new Set(keys);

const namespaceMap = parseNamespaceMap(fs.readFileSync(i18nPath, 'utf8'));
const files = walk(srcRoot);
// Literal call extraction catches "$t('key.path')" and "t('key.path')" style calls.
const usageRegex = /(?:\$t|i18n\.t|\bt)\(\s*['"]([^'"]+)['"]/g;
// Dynamic call extraction catches expressions like t(prefix + key) and t(`x.${y}`).
const dynamicCallRegex = /(?:\$t|i18n\.t|\bt)\(\s*(`[^`]*`|[^'"`\)\n][^,\)\n]*)/g;

const keyUsageFiles = new Map();
const rawCalls = new Set();
const dynamicCalls = [];

function normalizeKey(rawKey) {
  if (keySet.has(rawKey)) return rawKey;
  const dot = rawKey.indexOf('.');
  if (dot === -1) return null;
  const prefix = rawKey.slice(0, dot);
  const rest = rawKey.slice(dot + 1);
  const mapped = namespaceMap[prefix];
  if (!mapped) return null;
  const candidate = `${mapped}.${rest}`;
  return keySet.has(candidate) ? candidate : null;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeDynamicPattern(patternKey) {
  const dot = patternKey.indexOf('.');
  if (dot === -1) return patternKey;
  const prefix = patternKey.slice(0, dot);
  const rest = patternKey.slice(dot + 1);
  const mapped = namespaceMap[prefix];
  if (!mapped) return patternKey;
  return `${mapped}.${rest}`;
}

function inferPatternFromExpression(expression) {
  // Template literals like `gameTabs.${normalizedTaskId}Name` -> gameTabs.*Name
  if (!expression.startsWith('`') || !expression.endsWith('`')) return null;
  const inner = expression.slice(1, -1).trim();
  if (!inner) return null;
  const wildcard = inner.replace(/\$\{[^}]+\}/g, '*');
  return normalizeDynamicPattern(wildcard);
}

function keysMatchingPattern(pattern, allKeys) {
  const regex = new RegExp(`^${escapeRegex(pattern).replace(/\\\*/g, '.+?')}$`);
  return allKeys.filter((k) => regex.test(k));
}

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = usageRegex.exec(text))) {
    const raw = m[1];
    rawCalls.add(raw);
    const normalized = normalizeKey(raw);
    if (!normalized) continue;
    const arr = keyUsageFiles.get(normalized) || [];
    arr.push(toRelative(file));
    keyUsageFiles.set(normalized, arr);
  }

  while ((m = dynamicCallRegex.exec(text))) {
    const argExpr = (m[1] || '').trim();
    if (!argExpr || argExpr.startsWith("'") || argExpr.startsWith('"')) continue;
    dynamicCalls.push({
      file: toRelative(file),
      expression: argExpr,
    });
  }
}

const usedKeys = [];
const unusedKeys = [];
for (const key of keys) {
  if (keyUsageFiles.has(key)) usedKeys.push(key);
  else unusedKeys.push(key);
}

const unresolved = [...rawCalls].filter((raw) => !normalizeKey(raw)).sort();
const uniqueDynamicCalls = [];
const seenDynamic = new Set();
for (const call of dynamicCalls) {
  const key = `${call.file}::${call.expression}`;
  if (seenDynamic.has(key)) continue;
  seenDynamic.add(key);
  uniqueDynamicCalls.push(call);
}

const dynamicPatternMatches = [];
const dynamicInferredKeys = new Set();

for (const call of uniqueDynamicCalls) {
  const inferredPattern = inferPatternFromExpression(call.expression);
  if (!inferredPattern) continue;
  const matches = keysMatchingPattern(inferredPattern, keys);
  if (!matches.length) continue;
  for (const k of matches) dynamicInferredKeys.add(k);
  dynamicPatternMatches.push({
    file: call.file,
    expression: call.expression,
    inferredPattern,
    matchCount: matches.length,
    sampleMatches: matches.slice(0, 12),
  });
}

const usedAdjusted = new Set([...usedKeys, ...dynamicInferredKeys]);
const adjustedUnused = keys.filter((k) => !usedAdjusted.has(k));

if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

// Build markdown report with summary + detailed sections.
const lines = [];
lines.push('# i18n Key Usage Report', '');
lines.push('## How To Interpret', '');
lines.push('- **Used keys**: static literal translation calls that resolve to known keys.');
lines.push('- **Unused keys**: keys in `en-US-componentTranslations.json` not found via static or inferred dynamic call scanning.');
lines.push('- **Unresolved translation calls**: literal translation calls that do not map to a known key (possible typo, missing key, or different namespace).');
lines.push(
  '- **Dynamic translation callsites**: non-literal translation calls (template strings/expressions). The report attempts wildcard inference (e.g., `gameTabs.*Name`) but this remains heuristic.',
);
lines.push('');
lines.push(`- Total keys scanned: ${keys.length}`);
lines.push(`- Used keys (static literal): ${usedKeys.length}`);
lines.push(`- Used keys (dynamic inferred): ${dynamicInferredKeys.size}`);
lines.push(`- Used keys (adjusted total): ${usedAdjusted.size}`);
lines.push(`- Unused keys (adjusted): ${adjustedUnused.length}`);
lines.push(`- Unresolved translation calls: ${unresolved.length}`);
lines.push(`- Dynamic translation callsites (static unresolved): ${uniqueDynamicCalls.length}`, '');

if (unresolved.length) {
  lines.push('## Unresolved Translation Calls', '');
  for (const key of unresolved) lines.push(`- \`${key}\``);
  lines.push('');
}

if (uniqueDynamicCalls.length) {
  lines.push('## Dynamic Translation Callsites', '');
  lines.push(
    '_These calls use non-literal expressions and cannot be fully resolved without runtime tracing or deeper AST/data-flow analysis._',
    '',
  );
  for (const call of uniqueDynamicCalls) {
    lines.push(`- \`${call.file}\` -> \`${call.expression}\``);
  }
  lines.push('');
}

if (dynamicPatternMatches.length) {
  lines.push('## Inferred Dynamic Pattern Matches', '');
  for (const match of dynamicPatternMatches) {
    lines.push(`- \`${match.file}\` -> \`${match.expression}\``);
    lines.push(`  - inferred pattern: \`${match.inferredPattern}\``);
    lines.push(`  - matched keys: ${match.matchCount}`);
    lines.push(`  - sample: ${match.sampleMatches.map((k) => `\`${k}\``).join(', ')}`);
  }
  lines.push('');
}

lines.push('## Unused Keys (Adjusted)', '');
for (const key of adjustedUnused) lines.push(`- \`${key}\``);
lines.push('', '## Used Keys (with one usage file)', '');
for (const key of usedKeys) {
  const filesForKey = keyUsageFiles.get(key) || [];
  lines.push(`- \`${key}\` -> \`${filesForKey[0] || 'unknown'}\``);
}
lines.push('');

fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');

// Machine-readable summary for terminal/CI logs.
console.log(
  JSON.stringify(
    {
      reportPath: toRelative(reportPath),
      totalKeys: keys.length,
      usedKeysStatic: usedKeys.length,
      usedKeysDynamicInferred: dynamicInferredKeys.size,
      usedKeysAdjusted: usedAdjusted.size,
      unusedKeysAdjusted: adjustedUnused.length,
      unresolvedCalls: unresolved.length,
      dynamicCallsites: uniqueDynamicCalls.length,
      dynamicPatternMatches: dynamicPatternMatches.length,
    },
    null,
    2,
  ),
);
