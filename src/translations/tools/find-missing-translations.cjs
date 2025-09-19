#!/usr/bin/env node

/* CommonJS scanner for hardcoded UI strings with admin-filter */
const fs = require('fs');
const path = require('path');

const DEFAULT_ROOTS = [path.resolve('/home/david/levante/levante-dashboard/src')];
const DEFAULT_OUT = path.resolve('/home/david/levante/levante-dashboard/src/translations/consolidated/missing-translations.csv');

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { roots: DEFAULT_ROOTS, out: DEFAULT_OUT };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--roots') {
      const value = args[i + 1] || '';
      i++;
      if (value) result.roots = value.split(',').map((p) => path.resolve(p.trim())).filter(Boolean);
    } else if (arg === '--out') {
      const value = args[i + 1] || '';
      i++;
      if (value) result.out = path.resolve(value);
    }
  }
  return result;
}

function walkDir(startDir, exts = new Set(['.vue', '.ts', '.js'])) {
  const files = [];
  const stack = [startDir];
  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (/node_modules|dist|\.git|coverage|public|assets|i18n|translations\/dist/i.test(full)) continue;
        stack.push(full);
      } else {
        const ext = path.extname(entry.name);
        if (exts.has(ext)) files.push(full);
      }
    }
  }
  return files;
}

function toKebab(input) {
  return String(input)
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function toCamel(input) {
  const s = String(input)
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/["'’`´]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .toLowerCase();
  if (!s) return 'label';
  const parts = s.split(' ');
  return parts.map((p, i) => (i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1))).join('');
}

function inferNamespace(absFile) {
  const parts = absFile.split(path.sep);
  const idxSrc = parts.lastIndexOf('src');
  const within = idxSrc >= 0 ? parts.slice(idxSrc + 1) : parts;
  if (!within.length) return 'app';
  const top = within[0];
  if (top === 'components') {
    const sub = within.slice(1);
    if (sub.length === 0) return 'components';
    const last = (sub[sub.length - 1] || '').replace(/\.vue$/, '');
    const folder = toKebab(sub.slice(0, -1).join('-'));
    return `components/${folder || toKebab(last)}`;
  }
  if (top === 'pages') {
    const base = (within[within.length - 1] || '').replace(/\.vue$/, '');
    return `pages/${toKebab(base)}`;
  }
  if (within.join('/').includes('components/auth')) {
    const fileBase = within[within.length - 1].replace(/\.vue$/, '');
    return `auth/${toKebab(fileBase)}`;
  }
  if (within.join('/').includes('surveys')) {
    const fileBase = within[within.length - 1].replace(/\.vue$/, '');
    return `surveys/${toKebab(fileBase)}`;
  }
  const fileBase = within[within.length - 1].replace(/\.[^.]+$/, '');
  return `app/${toKebab(fileBase)}`;
}

function inferAudience(absFile) {
  const f = absFile.toLowerCase();
  if (/(gametabs|roargamecard|home-participant|participant)/.test(f)) return 'child';
  if (/(caregiver|parent)/.test(f)) return 'caregiver';
  if (/(teacher)/.test(f)) return 'teacher';
  if (/(admin|administrator|groups|users|assignments|consentpicker|variant|task|debug)/.test(f)) return 'other';
  if (/(signin|auth)/.test(f)) return 'other';
  return 'other';
}

function isLikelyTranslatableText(text) {
  if (!text) return false;
  const t = String(text).trim();
  if (!t) return false;
  if (!/[A-Za-z]/.test(t)) return false;
  if (/[{}]/.test(t)) return false;
  const tooShort = ['ok', 'on', 'off', 'yes', 'no'];
  if (tooShort.includes(t.toLowerCase())) return false;
  return true;
}

function extractFromVueTemplate(template) {
  const results = [];
  const textNodeRegex = />\s*([^<>{}][^<>{}]*)\s*</g;
  let m;
  while ((m = textNodeRegex.exec(template)) !== null) {
    const raw = (m[1] || '').replace(/\s+/g, ' ').trim();
    if (isLikelyTranslatableText(raw)) results.push(raw);
  }
  const attrNames = ['label', 'header', 'placeholder', 'title', 'message', 'summary', 'detail', 'alt', 'aria-label'];
  const attrRegex = new RegExp(`\\b(?:${attrNames.join('|')})\\s*=\\s*"([^"]+)"`, 'g');
  while ((m = attrRegex.exec(template)) !== null) {
    const val = (m[1] || '').trim();
    if (val && !val.includes('$t(') && !val.includes('{{') && isLikelyTranslatableText(val)) results.push(val);
  }
  return results;
}

function extractFromScript(script) {
  const results = [];
  const callRegex = /\b(?:alert|confirm)\s*\(\s*(["'])(.+?)\1\s*\)/g;
  let m;
  while ((m = callRegex.exec(script)) !== null) {
    const val = (m[2] || '').trim();
    if (isLikelyTranslatableText(val)) results.push(val);
  }
  const propRegex = /\b(?:message|title|summary|detail)\s*:\s*(["'])(.+?)\1/g;
  while ((m = propRegex.exec(script)) !== null) {
    const val = (m[2] || '').trim();
    if (isLikelyTranslatableText(val)) results.push(val);
  }
  return results;
}

function splitVueFile(content) {
  const templateMatch = content.match(/<template[\s\S]*?>[\s\S]*?<\/template>/i);
  const scriptMatch = content.match(/<script[\s\S]*?>[\s\S]*?<\/script>/i);
  return { template: templateMatch ? templateMatch[0] : '', script: scriptMatch ? scriptMatch[0] : '' };
}

function collectExistingIdentifiers(translationsRoot) {
  const identifiers = new Set();
  const csvFiles = [];
  (function walk(dir) {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.endsWith('.csv')) csvFiles.push(full);
    }
  })(translationsRoot);

  for (const f of csvFiles) {
    let text = '';
    try {
      text = fs.readFileSync(f, 'utf8');
    } catch {
      continue;
    }
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^\s*"([^"]+)"\s*,/);
      if (m && m[1] && m[1] !== 'identifier') identifiers.add(m[1]);
    }
  }
  return identifiers;
}

function buildSuggestedIdentifier(absFile, text) {
  const namespace = inferNamespace(absFile);
  const camel = toCamel(text);
  return `${namespace}.${camel}`;
}

function generateCsv(rows) {
  const header = ['string', 'file', 'suggestedIdentifier', 'audience'];
  const out = [header.join(',')];
  for (const r of rows) {
    const cols = [r.string, r.file, r.suggestedIdentifier, r.audience].map((c) => '"' + String(c || '').replace(/"/g, '""') + '"');
    out.push(cols.join(','));
  }
  return out.join('\n');
}

function main() {
  const { roots, out } = parseArgs();
  const translationsRoot = path.resolve('/home/david/levante/levante-dashboard/src/translations');
  collectExistingIdentifiers(translationsRoot);

  const seenByFileAndString = new Set();
  const rows = [];

  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const files = walkDir(root);
    for (const file of files) {
      let content = '';
      try {
        content = fs.readFileSync(file, 'utf8');
      } catch {
        continue;
      }
      const ext = path.extname(file);
      let strings = [];
      if (ext === '.vue') {
        const { template, script } = splitVueFile(content);
        strings.push(...extractFromVueTemplate(template));
        strings.push(...extractFromScript(script));
      } else {
        strings.push(...extractFromScript(content));
      }
      const audience = inferAudience(file);
      for (const s of strings) {
        const dedupeKey = `${file}:::${s}`;
        if (seenByFileAndString.has(dedupeKey)) continue;

        const lowerFile = file.toLowerCase();
        const lowerS = String(s).toLowerCase();
        if (lowerFile.includes('admin') || lowerS.includes('admin')) continue;
        if (lowerFile.includes('debug') || lowerS.includes('debug')) continue;
        if (lowerFile.includes('users.vue')) continue;
        if (lowerFile.includes('managetasks')) continue;
        if (lowerFile.includes('managevariants')) continue;
        if (lowerFile.includes('editusers')) continue;
        if (lowerFile.includes('linkusers')) continue;
        if (lowerFile.includes('groups')) continue;
        if (lowerFile.includes('progressreport')) continue;
        if (lowerFile.includes('createassignment')) continue;
        if (lowerFile.includes('editvariant')) continue;
        if (lowerFile.includes('addusers')) continue;
        if (lowerFile.includes('addgroup')) continue;
        if (lowerFile.includes('roardatatable')) continue;
        if (lowerFile.includes('maintenance')) continue;
        if (lowerFile.includes('users')) continue;
        if (lowerS.includes('users')) continue;
        if (lowerS.includes('filter')) continue;

        seenByFileAndString.add(dedupeKey);
        const suggestedIdentifier = buildSuggestedIdentifier(file, s);
        rows.push({ string: s, file, suggestedIdentifier, audience });
      }
    }
  }

  const outDir = path.dirname(out);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(out, generateCsv(rows), 'utf8');

  const byAudience = rows.reduce((acc, r) => {
    acc[r.audience] = (acc[r.audience] || 0) + 1;
    return acc;
  }, {});
  console.log(`Wrote ${rows.length} rows to ${out}`);
  console.log('By audience:', byAudience);
}

if (require.main === module) main();
