#!/usr/bin/env node
// Builds the HTML pages of site/ from pages/ and release.json (the one place
// for version, dates, file names, sizes and SHA-256). No dependencies.
//
//   node scripts/build.mjs            build; placeholders (TBD, OFFEN FÜR NUTZER) allowed, listed
//   node scripts/build.mjs --strict   refuse to build while any placeholder is left (deploy.sh uses this)
//
// Templates: {{> name}} includes pages/partials/name.html, {{a.b}} inserts a
// value from the context (release.json, derived links, the page's own front
// matter under `page`). A page starts with <!--page {json} --> front matter.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const strict = process.argv.includes('--strict');
const ORIGIN = 'https://rawtonic.cc';
const REPO = 'https://github.com/rawtonic-app/rawtonic';
const PLACEHOLDERS = [/\bTBD\b/, /OFFEN FÜR NUTZER/];

const release = JSON.parse(fs.readFileSync(path.join(root, 'release.json'), 'utf8'));
delete release._comment;
const download = (f) => `${REPO}/releases/download/${release.tag}/${f}`;
const ctx = {
  release: {
    ...release,
    url: `${REPO}/releases/tag/${release.tag}`,
    mac: { ...release.mac, url: download(release.mac.file) },
    linux: { ...release.linux, url: download(release.linux.file) },
  },
  repo: REPO,
  origin: ORIGIN,
};

const lookup = (obj, key, where) => {
  const v = key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  if (v === undefined || typeof v === 'object') throw new Error(`${where}: unknown value {{${key}}}`);
  return String(v);
};

const render = (text, context, where, depth = 0) => {
  if (depth > 4) throw new Error(`${where}: partials nested too deep`);
  return text
    .replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) =>
      render(fs.readFileSync(path.join(root, 'pages/partials', `${name}.html`), 'utf8'), context, `${where} > ${name}`, depth + 1))
    .replace(/\{\{picture\s+([\w-]+)\s+"([^"]+)"\s+"([^"]+)"(\s+eager)?\s*\}\}/g, (_, name, alt, sizes, eager) => picture(name, alt, sizes, !!eager, where))
    .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => lookup(context, key, where));
};

// {{picture name "alt" "sizes" [eager]}}: AVIF and WebP at 720 and 1440 px
// wide (made from assets/<name>.jpg, see README) with the JPEG as fallback.
const WIDTHS = [720, 1440];
function picture(name, alt, sizes, eager, where) {
  for (const f of [`${name}.jpg`, ...WIDTHS.flatMap((w) => [`${name}-${w}.avif`, `${name}-${w}.webp`])]) {
    if (!fs.existsSync(path.join(root, 'site/assets', f))) throw new Error(`${where}: missing site/assets/${f}`);
  }
  const set = (ext) => WIDTHS.map((w) => `/assets/${name}-${w}.${ext} ${w}w`).join(', ');
  const load = eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"';
  return `<picture><source type="image/avif" srcset="${set('avif')}" sizes="${sizes}"><source type="image/webp" srcset="${set('webp')}" sizes="${sizes}"><img src="/assets/${name}.jpg" alt="${alt}" width="1440" height="900" ${load}></picture>`;
}

const lastChange = (file) => {
  try {
    const dirty = execFileSync('git', ['status', '--porcelain', '--', file], { cwd: root }).toString().trim();
    const date = execFileSync('git', ['log', '-1', '--format=%cs', '--', file], { cwd: root }).toString().trim();
    if (date && !dirty) return date;
  } catch { /* not a git checkout */ }
  return new Date().toISOString().slice(0, 10);
};

const pages = fs.readdirSync(path.join(root, 'pages')).filter((f) => f.endsWith('.html')).sort();
const sitemap = [];
const left = [];
for (const file of pages) {
  const src = fs.readFileSync(path.join(root, 'pages', file), 'utf8');
  const m = src.match(/^<!--page\s+(\{[\s\S]*?\})\s*-->\n/);
  if (!m) throw new Error(`pages/${file}: missing <!--page {…} --> front matter`);
  const page = JSON.parse(m[1]);
  page.url = ORIGIN + page.path;
  const html = render(src.slice(m[0].length), { ...ctx, page }, `pages/${file}`);
  const out = path.join(root, 'site', page.path, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  html.split('\n').forEach((line, i) => {
    if (PLACEHOLDERS.some((p) => p.test(line))) left.push(`site${page.path}index.html:${i + 1}: ${line.trim().slice(0, 140)}`);
  });
  let lastmod = lastChange(path.join('pages', file));
  if (page.path === '/' && /^\d{4}-\d{2}-\d{2}$/.test(release.date) && release.date > lastmod) lastmod = release.date;
  if (!page.noindex) sitemap.push(`  <url><loc>${page.url}</loc><lastmod>${lastmod}</lastmod></url>`);
}
fs.writeFileSync(path.join(root, 'site/sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.join('\n')}\n</urlset>\n`);

if (left.length) {
  console.error(`build: ${left.length} placeholder line(s) left:\n  ${left.join('\n  ')}`);
  if (strict) { console.error('build: refused (--strict): fill release.json and the marked legal fields first'); process.exit(1); }
}
console.log(`build: ${pages.length} pages, version ${release.version}${left.length ? ' (with placeholders)' : ''}`);
