#!/usr/bin/env node
// Builds the HTML pages of site/ from pages/ and release.json (the one place
// for version, dates, file names, sizes and SHA-256). No dependencies.
//
//   node scripts/build.mjs            build; placeholders (TBD, OFFEN FÜR NUTZER) allowed, listed
//   node scripts/build.mjs --strict   refuse to build while any placeholder is left (deploy.sh uses this)
//
// Templates: {{> name}} includes pages/partials/name.html, {{a.b}} inserts a
// value from the context (release.json, derived links, the page's own front
// matter under `page`, the strings of the page's language under `t`). A page
// starts with <!--page {json} --> front matter.
//
// Languages: pages/<name>.html is English (served at /<name>/), pages/de/<name>.html
// its German counterpart (served at /de/<name>/). Each English page needs one, and
// a pair must have the same element ids and the same link targets (internal links
// compared with /de/ mapped away); --strict refuses the build otherwise.
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
// The website offers one Windows download (release.json `windows`): the MSI
// from the release after 0.1.0-alpha.11.1 on, the per-user NSIS installer
// before. The release page also has the other installer and a portable zip.
const WINDOWS_KIND = {
  msi: {
    en: {
      kind: 'MSI installer',
      install: 'It installs for all users into Program Files, so Windows asks for administrator permission, and takes about a minute while it prepares the graphics pipelines. Installed an earlier release with the -setup.exe? Uninstall that copy first in Settings → Apps (your libraries, edits and settings stay); the MSI says so and stops otherwise.',
    },
    de: {
      kind: 'MSI-Installer',
      install: 'Er installiert für alle Benutzer unter „Programme“, deshalb fragt Windows nach Administratorrechten, und braucht etwa eine Minute, weil er die Grafik-Pipelines vorbereitet. Haben Sie eine frühere Version mit der -setup.exe installiert? Deinstallieren Sie diese zuerst unter Einstellungen → Apps (Ihre Bibliotheken, Bearbeitungen und Einstellungen bleiben erhalten); sonst weist der MSI-Installer darauf hin und bricht ab.',
    },
  },
  setup: {
    en: {
      kind: 'installer',
      install: 'It installs for your user only, without administrator rights, and takes about a minute while it prepares the graphics pipelines.',
    },
    de: {
      kind: 'Installer',
      install: 'Er installiert nur für Ihren Benutzer, ohne Administratorrechte, und braucht etwa eine Minute, weil er die Grafik-Pipelines vorbereitet.',
    },
  },
};
function windowsKind(file, lang) {
  if (/_x64\.msi$/.test(file)) return WINDOWS_KIND.msi[lang];
  if (/_x64-setup\.exe$/.test(file)) return WINDOWS_KIND.setup[lang];
  throw new Error(`release.json: windows.file ${file} is neither the MSI nor the setup.exe`);
}

// The strings the partials (head, header, footer) and the build itself show,
// per language. `root` is the language's home path; nav links go into it.
const T = {
  en: {
    lang: 'en', root: '/', locale: 'en_GB', dateLocale: 'en-GB',
    skip: 'Skip to content', home: 'Rawtonic home', navMain: 'Main', navFooter: 'Footer',
    features: 'Features', switching: 'Switching', whatsNew: 'What’s new', install: 'Install', contribute: 'Contribute',
    github: 'Rawtonic on GitHub', support: 'Support', download: 'Download',
    other: { lang: 'de', code: 'DE', name: 'Deutsch' },
    footLine: 'free and open source', releases: 'Releases', history: 'Release history', changelog: 'Changelog',
    codeSigning: 'Code signing', privacy: 'Privacy', imprint: 'Imprint', credits: 'Photo credits', kofi: 'Support on Ko-fi',
    legal: 'Rawtonic is an independent project, not affiliated with, endorsed or sponsored by Adobe, Capture One or any camera maker. Lightroom, Capture One and camera names are trademarks of their owners and appear here only to say what Rawtonic imports from, works with or was measured against.',
    ogImageAlt: 'Rawtonic: The photograph comes first. A free, open-source RAW developer for macOS and Linux, beside a screenshot of Develop.',
    more: (n) => `and ${n} more`,
  },
  de: {
    lang: 'de', root: '/de/', locale: 'de_DE', dateLocale: 'de-DE',
    skip: 'Zum Inhalt springen', home: 'Rawtonic-Startseite', navMain: 'Hauptmenü', navFooter: 'Fußzeile',
    features: 'Funktionen', switching: 'Umsteigen', whatsNew: 'Neuigkeiten', install: 'Installation', contribute: 'Mitwirken',
    github: 'Rawtonic auf GitHub', support: 'Unterstützen', download: 'Download',
    other: { lang: 'en', code: 'EN', name: 'English' },
    footLine: 'kostenlos und Open Source', releases: 'Releases', history: 'Versionsgeschichte', changelog: 'Changelog',
    codeSigning: 'Code-Signierung', privacy: 'Datenschutz', imprint: 'Impressum', credits: 'Bildnachweise', kofi: 'Auf Ko-fi unterstützen',
    legal: 'Rawtonic ist ein unabhängiges Projekt und steht in keiner Verbindung zu Adobe, Capture One oder einem Kamerahersteller, wird von ihnen weder empfohlen noch gesponsert. Lightroom, Capture One und Kameranamen sind Marken ihrer Inhaber und werden hier nur genannt, um zu sagen, woraus Rawtonic importiert, womit es zusammenarbeitet oder womit es verglichen wurde.',
    ogImageAlt: 'Rawtonic: „The photograph comes first.“ Ein kostenloser Open-Source-RAW-Entwickler für macOS und Linux, neben einem Screenshot von Entwickeln.',
    more: (n) => `und ${n} weitere`,
  },
};
const LANGS = Object.keys(T);
const longDate = (date, lang) => new Date(`${date}T12:00:00Z`).toLocaleDateString(T[lang].dateLocale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d);
const ctxFor = (lang) => ({
  release: {
    ...release,
    // release.json's dateText is the English one; other languages derive theirs from the date.
    dateText: lang === 'en' || !isDate(release.date) ? release.dateText : longDate(release.date, lang),
    url: `${REPO}/releases/tag/${release.tag}`,
    mac: { ...release.mac, url: download(release.mac.file) },
    linux: { ...release.linux, url: download(release.linux.file) },
    macIntel: { ...release.macIntel, url: download(release.macIntel.file) },
    windows: { ...release.windows, url: download(release.windows.file), ...windowsKind(release.windows.file, lang) },
  },
  repo: REPO,
  origin: ORIGIN,
  t: T[lang],
});

// Release history (/releases/): every earlier release of the app's CHANGELOG.md
// at this release's tag, newest first, with its date, a short summary and its
// highlights' titles. The entries stay in the changelog's English in every
// language; only the date and "and N more" follow the page. RAWTONIC_CHANGELOG=path reads a local copy instead
// (before the tag exists); otherwise the build needs the network.
async function loadChangelog() {
  if (process.env.RAWTONIC_CHANGELOG) return fs.readFileSync(process.env.RAWTONIC_CHANGELOG, 'utf8');
  const url = `https://raw.githubusercontent.com/rawtonic-app/rawtonic/${release.tag}/CHANGELOG.md`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`release history: ${url} answered ${res.status} (set RAWTONIC_CHANGELOG to a local CHANGELOG.md)`);
  return res.text();
}
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Markdown inline → plain text: links keep their text, emphasis and code marks go.
const plain = (s) => s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\*\*|`/g, '').replace(/(^|[\s(])\*([^*]+)\*/g, '$1$2').replace(/\\(.)/g, '$1').trim();
// A sentence ends at . ! or ? before a space and a capital (not inside "alpha.7" or "0.887").
const sentences = (s, n) => s.split(/(?<=[.!?])\s+(?=[A-Z*])/).slice(0, n).join(' ').trim();
function releaseHistory(md, current, lang) {
  const sections = md.split(/^## /m).slice(1).map((s) => {
    const [head, ...rest] = s.split('\n');
    const m = head.match(/^(\d+\.\d+\.\d+-alpha\.[\d.]+)\s+—\s+(\d{4}-\d{2}-\d{2})\s*$/);
    return m && { version: m[1], date: m[2], body: rest.join('\n') };
  }).filter((r) => r && r.version !== current);
  if (sections.length === 0) throw new Error('release history: no earlier release found in CHANGELOG.md');
  const items = sections.map(({ version, date, body }) => {
    const intro = body.split(/\n(?=- |### )/)[0].trim();
    const summary = plain(sentences(intro.replace(/^The \w+ alpha\.\s*/, ''), 2));
    const hl = (body.match(/### Highlights\n([\s\S]*?)(?=\n### |$)/) || [, body.split(/\n### /)[0]])[1];
    const bullets = hl.split('\n').filter((l) => l.startsWith('- '));
    const titles = bullets.map((l) => {
      const bold = l.match(/^- \*\*(.+?)\*\*/);
      const t = plain(bold ? bold[1] : sentences(l.slice(2), 1));
      return t.length > 140 ? `${t.slice(0, 137).replace(/\s+\S*$/, '')}…` : t.replace(/[.:]$/, '');
    }).slice(0, 6);
    const more = bullets.length > titles.length ? `<li class="muted">${T[lang].more(bullets.length - titles.length)}</li>` : '';
    const when = longDate(date, lang);
    return `<li class="rel"><h2><a class="plain" href="${REPO}/releases/tag/v${version}">${esc(version)}</a></h2><p class="small muted"><time datetime="${date}">${when}</time></p>`
      + (summary ? `<p>${esc(summary)}</p>` : '')
      + (titles.length ? `<ul>${titles.map((t) => `<li>${esc(t)}</li>`).join('')}${more}</ul>` : '')
      + '</li>';
  });
  return `<ol class="releases"${lang === 'en' ? '' : ' lang="en"'}>${items.join('\n')}</ol>`;
}
const changelog = await loadChangelog();
const ctx = Object.fromEntries(LANGS.map((lang) => [lang, { ...ctxFor(lang), history: { list: releaseHistory(changelog, release.version, lang) } }]));

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
// wide (made by scripts/images.sh, see README) with the JPEG as fallback.
const WIDTHS = [720, 1440];
function picture(name, alt, sizes, eager, where) {
  for (const f of [`${name}.jpg`, ...WIDTHS.flatMap((w) => [`${name}-${w}.avif`, `${name}-${w}.webp`])]) {
    if (!fs.existsSync(path.join(root, 'site/assets', f))) throw new Error(`${where}: missing site/assets/${f}`);
  }
  const set = (ext) => WIDTHS.map((w) => `/assets/${name}-${w}.${ext} ${w}w`).join(', ');
  const load = eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"';
  const { width, height } = jpegSize(path.join(root, 'site/assets', `${name}.jpg`), where);
  return `<picture><source type="image/avif" srcset="${set('avif')}" sizes="${sizes}"><source type="image/webp" srcset="${set('webp')}" sizes="${sizes}"><img src="/assets/${name}.jpg" alt="${alt}" width="${width}" height="${height}" ${load}></picture>`;
}

// Width and height from the JPEG's frame header, so each <img> reserves its
// own aspect ratio while it loads.
function jpegSize(file, where) {
  const b = fs.readFileSync(file);
  for (let i = 2; i + 9 < b.length; ) {
    if (b[i] !== 0xff) break;
    const marker = b[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  throw new Error(`${where}: cannot read the size of ${file}`);
}

const lastChange = (file) => {
  try {
    const dirty = execFileSync('git', ['status', '--porcelain', '--', file], { cwd: root }).toString().trim();
    const date = execFileSync('git', ['log', '-1', '--format=%cs', '--', file], { cwd: root }).toString().trim();
    if (date && !dirty) return date;
  } catch { /* not a git checkout */ }
  return new Date().toISOString().slice(0, 10);
};

// Every page in every language: pages/x.html (English) and pages/<lang>/x.html.
const pageFiles = (dir) => (fs.existsSync(path.join(root, dir)) ? fs.readdirSync(path.join(root, dir)) : [])
  .filter((f) => f.endsWith('.html')).sort().map((f) => path.join(dir, f));
const pages = LANGS.flatMap((lang) => pageFiles(lang === 'en' ? 'pages' : `pages/${lang}`).map((file) => ({ lang, file })));
// The path of a page in another language: /x/ ↔ /de/x/.
const enPath = (p, lang) => (lang === 'en' ? p : p.slice(lang.length + 1));
const langPath = (p, lang) => (lang === 'en' ? p : `/${lang}${p}`);
const left = [];
const built = new Map(); // English path → { lang: { page, html, file } }
for (const { lang, file } of pages) {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  const m = src.match(/^<!--page\s+(\{[\s\S]*?\})\s*-->\n/);
  if (!m) throw new Error(`${file}: missing <!--page {…} --> front matter`);
  const page = JSON.parse(m[1]);
  if (lang !== 'en' && !page.path.startsWith(`/${lang}/`)) throw new Error(`${file}: path ${page.path} must start with /${lang}/`);
  if (!new RegExp(`<html lang="${lang}">`).test(src)) throw new Error(`${file}: needs <html lang="${lang}">`);
  const base = enPath(page.path, lang);
  Object.assign(page, Object.fromEntries(LANGS.map((l) => [`${l}Url`, ORIGIN + langPath(base, l)])));
  page.url = ORIGIN + page.path;
  page.altPath = langPath(base, T[lang].other.lang);
  const html = render(src.slice(m[0].length), { ...ctx[lang], page }, file);
  const out = path.join(root, 'site', page.path, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  html.split('\n').forEach((line, i) => {
    if (PLACEHOLDERS.some((p) => p.test(line))) left.push(`site${page.path}index.html:${i + 1}: ${line.trim().slice(0, 140)}`);
  });
  if (!built.has(base)) built.set(base, {});
  built.get(base)[lang] = { page, html, file };
}

// Drift guard: every English page has a counterpart in each language, with the
// same element ids (section anchors) and the same link targets once internal
// links are mapped back from /de/x/ to /x/.
const drift = [];
const ids = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((x) => x[1]));
const hrefs = (html, lang) => new Set([...html.matchAll(/\shref="([^"]+)"/g)].map((x) => x[1].replace(/&amp;/g, '&')
  .replace(new RegExp(`^(${ORIGIN.replace(/[.]/g, '\\.')})?/(${LANGS.filter((l) => l !== 'en').join('|')})/`), '$1/')));
const diff = (a, b) => [...a].filter((x) => !b.has(x));
for (const [base, byLang] of built) {
  const en = byLang.en;
  if (!en) { drift.push(`${Object.values(byLang)[0].file}: no English page at ${base}`); continue; }
  for (const lang of LANGS.filter((l) => l !== 'en')) {
    const other = byLang[lang];
    if (!other) { drift.push(`${en.file}: no ${lang} counterpart (pages/${lang}/${path.basename(en.file)})`); continue; }
    const [ia, ib, ha, hb] = [ids(en.html), ids(other.html), hrefs(en.html, 'en'), hrefs(other.html, lang)];
    for (const x of diff(ia, ib)) drift.push(`${other.file}: missing id="${x}" (in ${en.file})`);
    for (const x of diff(ib, ia)) drift.push(`${other.file}: extra id="${x}" (not in ${en.file})`);
    for (const x of diff(ha, hb)) drift.push(`${other.file}: missing link to ${x} (in ${en.file})`);
    for (const x of diff(hb, ha)) drift.push(`${other.file}: extra link to ${x} (not in ${en.file})`);
  }
}

// Sitemap: every indexed page in every language, each with its alternates.
const sitemap = [];
for (const [base, byLang] of built) {
  for (const lang of LANGS) {
    const b = byLang[lang];
    if (!b || b.page.noindex) continue;
    let lastmod = lastChange(b.file);
    if (base === '/' && isDate(release.date) && release.date > lastmod) lastmod = release.date;
    const alts = LANGS.filter((l) => byLang[l]).map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${b.page[`${l}Url`]}"/>`)
      .concat(`<xhtml:link rel="alternate" hreflang="x-default" href="${b.page.enUrl}"/>`);
    sitemap.push(`  <url><loc>${b.page.url}</loc><lastmod>${lastmod}</lastmod>${alts.join('')}</url>`);
  }
}
fs.writeFileSync(path.join(root, 'site/sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${sitemap.join('\n')}\n</urlset>\n`);

if (drift.length) {
  console.error(`build: ${drift.length} language drift problem(s):\n  ${drift.join('\n  ')}`);
  if (strict) { console.error('build: refused (--strict): every page needs its counterpart with the same ids and links'); process.exit(1); }
}
if (left.length) {
  console.error(`build: ${left.length} placeholder line(s) left:\n  ${left.join('\n  ')}`);
  if (strict) { console.error('build: refused (--strict): fill release.json and the marked legal fields first'); process.exit(1); }
}
console.log(`build: ${pages.length} pages (${LANGS.join(', ')}), version ${release.version}${left.length ? ' (with placeholders)' : ''}`);
