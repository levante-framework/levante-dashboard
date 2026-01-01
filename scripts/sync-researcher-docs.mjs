import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_HUB_URL = 'https://researcher.levante-network.org/dashboard';
const OUTPUT_PATH = path.resolve(process.cwd(), 'README_RESEARCHERS.md');

function decodeHtmlEntities(input) {
  return input
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#34;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function stripTagsToText(html) {
  const normalized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replaceAll('\r', '');

  const withBreaks = normalized
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/(div|section|article|main|header|footer)>/gi, '\n\n');

  const withoutTags = withBreaks.replace(/<[^>]+>/g, '');
  const decoded = decodeHtmlEntities(withoutTags);

  return decoded
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractMainArticleHtml(html) {
  const mainStart = html.toLowerCase().indexOf('<main');
  if (mainStart === -1) return null;
  const mainChunk = html.slice(mainStart);

  const articleStart = mainChunk.toLowerCase().indexOf('<article');
  if (articleStart === -1) return null;
  const afterArticleStart = mainChunk.slice(articleStart);

  const articleEnd = afterArticleStart.toLowerCase().indexOf('</article>');
  if (articleEnd === -1) return null;
  return afterArticleStart.slice(0, articleEnd + '</article>'.length);
}

function extractTitleAndTextFromHtml(html) {
  const articleHtml = extractMainArticleHtml(html) ?? html;
  const titleMatch = articleHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = titleMatch ? stripTagsToText(titleMatch[1]) : '';
  const text = stripTagsToText(articleHtml);
  return { title: title || 'Untitled', text };
}

function extractDashboardLinks(hubHtml, hubUrl) {
  const articleHtml = extractMainArticleHtml(hubHtml) ?? hubHtml;
  const links = new Set();
  const re = /href\s*=\s*"([^"]+)"/gi;
  let m;
  while ((m = re.exec(articleHtml))) {
    try {
      const u = new URL(m[1], hubUrl);
      if (u.origin !== new URL(hubUrl).origin) continue;
      if (!u.pathname.startsWith('/dashboard')) continue;
      u.hash = '';
      u.search = '';
      links.add(u.toString());
    } catch {
      // ignore
    }
  }
  // Ensure hub is first.
  return [hubUrl, ...Array.from(links).filter((u) => u !== hubUrl)];
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'levante-dashboard-doc-sync/1.0',
      accept: 'text/html',
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return await res.text();
}

function buildReadme(pages) {
  const lines = [];
  lines.push('# LEVANTE Researcher Site – Dashboard Documentation (regenerated)');
  lines.push('');
  lines.push('This file is a regenerated local copy of the LEVANTE Researcher Site “Dashboard” documentation.');
  lines.push('');
  lines.push('**Source pages (crawl targets):**');
  for (const p of pages) lines.push(`- [${p.title}](${p.url})`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const p of pages) {
    lines.push(`## ${p.title}`);
    lines.push('');
    lines.push(p.text);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

async function main() {
  const hubUrl = process.env.RESEARCHER_DOCS_HUB_URL || DEFAULT_HUB_URL;
  const hubHtml = await fetchHtml(hubUrl);
  const urls = extractDashboardLinks(hubHtml, hubUrl);

  const pages = [];
  for (const url of urls) {
    const html = url === hubUrl ? hubHtml : await fetchHtml(url);
    const { title, text } = extractTitleAndTextFromHtml(html);
    pages.push({ url, title, text });
  }

  const md = buildReadme(pages);
  await fs.writeFile(OUTPUT_PATH, md, 'utf8');
  process.stdout.write(`Wrote ${OUTPUT_PATH} (${pages.length} sections)\n`);
}

await main();

