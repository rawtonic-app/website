#!/usr/bin/env node
// Builds the HTML pages of site/ from pages/ and release.json (the one place
// for version, dates, file names, sizes and SHA-256). No dependencies.
//
//   node scripts/build.mjs            build; placeholders (TBD, OFFEN FÜR NUTZER) allowed, listed
//   node scripts/build.mjs --strict   refuse to build while any placeholder is left, the
//                                     What's new block is not this release's, or a page names an
//                                     older release outside a data-history element (deploy.sh uses this)
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
//
// What's new: {{whatsnew}} on the home pages renders release.json's whatsNew
// (version, then per language summary, three items {title, text} and a note),
// written with the release's CHANGELOG section. --strict refuses it unless
// whatsNew.version is release.version and every language is filled.
//
// Stale versions: outside the release history, a page that names an older
// release than release.version (alpha.N, 0.1.0-alpha.N.M, beta.N, rc.N) must say
// so on purpose: the sentence goes inside an element with a data-history
// attribute (<span data-history>Since alpha.7</span>, <td data-history>). Every
// other mention is refused by --strict, so each release makes someone read the
// sentences that named the previous one.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { loadAppFiles, shortcutTables } from './shortcuts.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const strict = process.argv.includes('--strict');
const ORIGIN = 'https://rawtonic.cc';
const REPO = 'https://github.com/rawtonic-app/rawtonic';
const PLACEHOLDERS = [/\bTBD\b/, /OFFEN FÜR NUTZER/];

const release = JSON.parse(fs.readFileSync(path.join(root, 'release.json'), 'utf8'));
delete release._comment;
const whatsNew = release.whatsNew;
delete release.whatsNew;
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
      install: 'Er installiert für alle Benutzer unter „Programme“, deshalb fragt Windows nach Administratorrechten, und braucht etwa eine Minute, weil er die Grafik-Pipelines vorbereitet. Hast du eine frühere Version mit der -setup.exe installiert? Deinstalliere diese zuerst unter Einstellungen → Apps (deine Bibliotheken, Bearbeitungen und Einstellungen bleiben erhalten); sonst weist der MSI-Installer darauf hin und bricht ab.',
    },
  },
  setup: {
    en: {
      kind: 'installer',
      install: 'It installs for your user only, without administrator rights, and takes about a minute while it prepares the graphics pipelines.',
    },
    de: {
      kind: 'Installer',
      install: 'Er installiert nur für deinen Benutzer, ohne Administratorrechte, und braucht etwa eine Minute, weil er die Grafik-Pipelines vorbereitet.',
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
    skip: 'Skip to content', home: 'Rawtonic home', navMain: 'Main', navFooter: 'Footer', menu: 'Menu',
    features: 'Features', switching: 'Switching', whatsNew: 'What’s new', install: 'Install', contribute: 'Contribute',
    newIn: 'New in', released: 'Released', earlier: 'Earlier releases',
    github: 'Rawtonic on GitHub', support: 'Support', download: 'Download',
    other: { lang: 'de', code: 'DE', name: 'Deutsch' },
    footLine: 'free and open source', releases: 'Releases', history: 'Release history', changelog: 'Changelog',
    codeSigning: 'Code signing', privacy: 'Privacy', imprint: 'Imprint', credits: 'Photo credits', kofi: 'Support on Ko-fi',
    legal: 'Rawtonic is an independent project, not affiliated with, endorsed or sponsored by Adobe, Capture One or any camera maker. Lightroom, Capture One and camera names are trademarks of their owners and appear here only to say what Rawtonic imports from, works with or was measured against.',
    ogImageAlt: 'Rawtonic: The photograph comes first. A free, open-source RAW developer for macOS and Linux, beside a screenshot of Develop.',
    more: (n) => `and ${n} more`,
    docs: 'Docs', docsNav: 'Documentation', docsHome: 'All topics', shotTodo: 'Screenshot to come',
    docSections: { library: 'Import & Library', basics: 'Develop basics', local: 'Local adjustments', ai: 'AI tools', export: 'Export & sharing', reference: 'Reference' },
    docsSoon: 'Pages for this part are being written.',
  },
  de: {
    lang: 'de', root: '/de/', locale: 'de_DE', dateLocale: 'de-DE',
    skip: 'Zum Inhalt springen', home: 'Rawtonic-Startseite', navMain: 'Hauptmenü', navFooter: 'Fußzeile', menu: 'Menü',
    features: 'Funktionen', switching: 'Umsteigen', whatsNew: 'Neuigkeiten', install: 'Installation', contribute: 'Mitwirken',
    newIn: 'Neu in', released: 'Erschienen am', earlier: 'Frühere Versionen',
    github: 'Rawtonic auf GitHub', support: 'Unterstützen', download: 'Download',
    other: { lang: 'en', code: 'EN', name: 'English' },
    footLine: 'kostenlos und Open Source', releases: 'Releases', history: 'Versionsgeschichte', changelog: 'Changelog',
    codeSigning: 'Code-Signierung', privacy: 'Datenschutz', imprint: 'Impressum', credits: 'Bildnachweise', kofi: 'Auf Ko-fi unterstützen',
    legal: 'Rawtonic ist ein unabhängiges Projekt und steht in keiner Verbindung zu Adobe, Capture One oder einem Kamerahersteller, wird von ihnen weder empfohlen noch gesponsert. Lightroom, Capture One und Kameranamen sind Marken ihrer Inhaber und werden hier nur genannt, um zu sagen, woraus Rawtonic importiert, womit es zusammenarbeitet oder womit es verglichen wurde.',
    ogImageAlt: 'Rawtonic: „The photograph comes first.“ Ein kostenloser Open-Source-RAW-Entwickler für macOS und Linux, neben einem Screenshot von Entwickeln.',
    more: (n) => `und ${n} weitere`,
    docs: 'Anleitung', docsNav: 'Anleitung', docsHome: 'Alle Themen', shotTodo: 'Screenshot folgt',
    docSections: { library: 'Import & Bibliothek', basics: 'Grundlagen der Entwicklung', local: 'Lokale Anpassungen', ai: 'KI-Werkzeuge', export: 'Export & Weitergabe', reference: 'Nachschlagen' },
    docsSoon: 'Die Seiten zu diesem Teil entstehen gerade.',
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
// {{shortcuts}}: the app's keymap at this release (scripts/shortcuts.mjs), read
// only when a page uses it.
const usesShortcuts = ['pages', 'pages/docs', ...LANGS.filter((l) => l !== 'en').flatMap((l) => [`pages/${l}`, `pages/${l}/docs`])]
  .some((d) => fs.existsSync(path.join(root, d)) && fs.readdirSync(path.join(root, d)).some((f) => f.endsWith('.html') && fs.readFileSync(path.join(root, d, f), 'utf8').includes('{{shortcuts}}')));
const appFiles = usesShortcuts ? await loadAppFiles(release.tag) : null;
const ctx = Object.fromEntries(LANGS.map((lang) => [lang, {
  ...ctxFor(lang), history: { list: releaseHistory(changelog, release.version, lang) },
  shortcuts: appFiles ? shortcutTables(appFiles, lang) : '',
}]));

// What's new (release.json whatsNew): problems are collected and refused by
// --strict; a missing text renders as TBD so a plain build shows the gap.
const stale = [];
const ITEMS = 3;
if (!whatsNew || typeof whatsNew !== 'object') stale.push('release.json: no whatsNew block (version, en, de)');
else if (whatsNew.version !== release.version) stale.push(`release.json: whatsNew is for ${whatsNew.version}, not ${release.version}: write this release's What's new with its CHANGELOG section`);
const filled = (s) => typeof s === 'string' && s.trim() !== '' && !PLACEHOLDERS.some((p) => p.test(s));
function whatsNewFor(lang) {
  const w = (whatsNew && whatsNew[lang]) || {};
  const where = `release.json whatsNew.${lang}`;
  if (!whatsNew?.[lang]) stale.push(`${where}: missing`);
  const text = (s, key) => { if (!filled(s)) { stale.push(`${where}.${key}: empty`); return 'TBD'; } return s; };
  const items = Array.isArray(w.items) ? w.items : [];
  if (items.length !== ITEMS) stale.push(`${where}.items: ${items.length} items, the page shows ${ITEMS}`);
  return { summary: text(w.summary, 'summary'), note: text(w.note, 'note'),
    items: items.map((it, i) => ({ title: text(it?.title, `items[${i}].title`), text: text(it?.text, `items[${i}].text`) })) };
}
const shortVersion = (v) => v.replace(/^\d+\.\d+\.\d+-/, '');
// The texts are plain text (escaped here); the block's markup is the page's.
function whatsNewHtml(lang) {
  const t = T[lang], w = whatsNewFor(lang);
  return [
    '<div class="split-head">',
    `      <h2 class="head" id="new-title">${t.newIn} ${esc(shortVersion(release.version))}.</h2>`,
    `      <p class="muted">${t.released} ${ctx[lang].release.dateText}. ${esc(w.summary)} <a class="plain" href="${t.root}releases/">${t.earlier}</a></p>`,
    '    </div>',
    '    <div class="changes">',
    ...w.items.map((it) => `      <div><h3>${esc(it.title)}</h3><p>${esc(it.text)}</p></div>`),
    '    </div>',
    `    <p class="also">${esc(w.note)}</p>`,
  ].join('\n');
}
for (const lang of LANGS) ctx[lang].whatsnew = whatsNewHtml(lang);

// Release versions in page text: alpha.18, 0.1.0-alpha.11.1, beta.2, rc.1
// (bare numbers such as "1.30.0" are other software's versions).
const STAGE_RANK = { alpha: 0, beta: 1, rc: 2 };
const VERSION_RE = /\b(?:\d+\.\d+\.\d+-)?(alpha|beta|rc)\.(\d+)(?:\.(\d+))?/gi;
const versionKey = (stage, a, b) => [STAGE_RANK[stage.toLowerCase()], Number(a), Number(b || 0)];
// (a final release, without alpha/beta/rc, is newer than all of them)
const current = (() => { const m = release.version.match(new RegExp(VERSION_RE.source, 'i')); return m ? versionKey(m[1], m[2], m[3]) : [3, 0, 0]; })();
const older = (k) => { for (let i = 0; i < 3; i++) if (k[i] !== current[i]) return k[i] < current[i]; return false; };
// The HTML without its data-history elements (each with everything inside it).
function withoutHistory(html) {
  const open = /<([a-z][a-z0-9]*)\b[^>]*\sdata-history\b[^>]*>/gi;
  let out = '', from = 0, m;
  while ((m = open.exec(html))) {
    const name = m[1].toLowerCase(), tags = new RegExp(`<(/?)${name}\\b[^>]*>`, 'gi');
    tags.lastIndex = m.index + m[0].length;
    let depth = 1, t;
    while (depth > 0 && (t = tags.exec(html))) depth += t[1] ? -1 : 1;
    if (depth > 0) throw new Error(`data-history <${name}> is never closed`);
    // Keep the line breaks so line numbers stay right.
    out += html.slice(from, m.index) + html.slice(m.index, tags.lastIndex).replace(/[^\n]/g, '');
    from = open.lastIndex = tags.lastIndex;
  }
  return out + html.slice(from);
}

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
    const dirty = execFileSync('git', ['status', '--porcelain', '--', file], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const date = execFileSync('git', ['log', '-1', '--format=%cs', '--', file], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    if (date && !dirty) return date;
  } catch { /* not a git checkout */ }
  return new Date().toISOString().slice(0, 10);
};

// Every page in every language: pages/x.html (English) and pages/<lang>/x.html.
const pageFiles = (dir) => (fs.existsSync(path.join(root, dir)) ? fs.readdirSync(path.join(root, dir)) : [])
  .filter((f) => f.endsWith('.html')).sort().map((f) => path.join(dir, f));
// The user documentation lives one level down: pages/docs/x.html → /docs/x/.
const langDir = (lang) => (lang === 'en' ? 'pages' : `pages/${lang}`);
const pages = LANGS.flatMap((lang) => [...pageFiles(langDir(lang)), ...pageFiles(`${langDir(lang)}/docs`)].map((file) => ({ lang, file })));
const frontMatter = (file) => {
  const m = fs.readFileSync(path.join(root, file), 'utf8').match(/^<!--page\s+(\{[\s\S]*?\})\s*-->\n/);
  if (!m) throw new Error(`${file}: missing <!--page {…} --> front matter`);
  return { m, page: JSON.parse(m[1]) };
};

// Docs: one page per tool or workflow. Its front matter carries
// "docs": {"section", "order", "tool", "nav"}: section is one of DOC_SECTIONS
// (the navigation follows a photographer's workflow), tool is the app's own
// tool key (the Develop tool group key, e.g. "exposure", or a workflow key such
// as "export"), so the app can open /docs/<page>/ from that tool's ? later.
const DOC_SECTIONS = Object.keys(T.en.docSections);
const docs = Object.fromEntries(LANGS.map((lang) => [lang, pageFiles(`${langDir(lang)}/docs`)
  .map((file) => ({ file, page: frontMatter(file).page })).filter((d) => d.page.docs)]));
for (const lang of LANGS) {
  const tools = new Map();
  for (const { file, page } of docs[lang]) {
    const d = page.docs;
    if (!DOC_SECTIONS.includes(d.section)) throw new Error(`${file}: docs.section must be one of ${DOC_SECTIONS.join(', ')}`);
    if (typeof d.tool !== 'string' || !/^[a-zA-Z][\w.-]*$/.test(d.tool)) throw new Error(`${file}: docs.tool must be the app's tool key`);
    if (typeof d.nav !== 'string' || !Number.isFinite(d.order)) throw new Error(`${file}: docs needs nav (short title) and order (number)`);
    if (tools.has(d.tool)) throw new Error(`${file}: docs.tool ${d.tool} is already ${tools.get(d.tool)}`);
    tools.set(d.tool, file);
  }
}
const bySection = (lang, section) => docs[lang].filter((d) => d.page.docs.section === section)
  .sort((a, b) => a.page.docs.order - b.page.docs.order);
// {{docsnav}}: the side navigation of a docs page, current page marked.
const docsNav = (lang, current) => {
  const t = T[lang];
  const groups = DOC_SECTIONS.map((s) => {
    const items = bySection(lang, s).map(({ page }) => `<li><a href="${page.path}"${page.path === current ? ' aria-current="page"' : ''}>${esc(page.docs.nav)}</a></li>`);
    return `<li><span class="docs-sec">${esc(t.docSections[s])}</span>${items.length ? `<ul>${items.join('')}</ul>` : ''}</li>`;
  });
  return `<nav class="docs-nav" aria-label="${esc(t.docsNav)}"><a class="docs-home" href="${t.root}docs/"${current === `${t.root}docs/` ? ' aria-current="page"' : ''}>${esc(t.docsHome)}</a><ul>${groups.join('')}</ul></nav>`;
};
// {{docsindex}}: every section with its pages and their descriptions.
const docsIndex = (lang) => DOC_SECTIONS.map((s) => {
  const items = bySection(lang, s);
  const body = items.length
    ? `<ul class="docs-list">${items.map(({ page }) => `<li><a href="${page.path}">${esc(page.docs.nav)}</a><span>${esc(page.description)}</span></li>`).join('')}</ul>`
    : `<p class="muted">${esc(T[lang].docsSoon)}</p>`;
  return `<section class="docs-group"><h2 id="${s}">${esc(T[lang].docSections[s])}</h2>${body}</section>`;
}).join('\n');
// {{shot "id" "what it shows"}}: the place of a screenshot of a demo scene, made
// per release by the app (scripts/docs-shots/ there; see README). With
// site/assets/shot-<id>.jpg (German pages: shot-<id>-de.jpg first) it becomes that
// picture, with "what it shows" as its alt text; else the build lists it as empty.
const shots = [];
const shotsInEnglish = [];
const showShots = process.argv.includes('--show-shots');
const SHOT_SIZES = '(min-width: 1100px) 720px, 94vw';
const shotImage = (id, lang) => [...(lang === 'en' ? [] : [`shot-${id}-${lang}`]), `shot-${id}`]
  .find((name) => fs.existsSync(path.join(root, 'site/assets', `${name}.jpg`)));
const shot = (id, what, lang, where) => {
  const image = shotImage(id, lang);
  if (image) {
    if (lang !== 'en' && image === `shot-${id}`) shotsInEnglish.push(`${where}: ${id}`);
    const alt = what.charAt(0).toUpperCase() + what.slice(1);
    return `<figure class="shot crop" data-shot="${id}">{{picture ${image} "${alt}" "${SHOT_SIZES}"}}</figure>`;
  }
  shots.push(`${where}: ${id}`);
  // Hidden in the built site (user decision 2026-11-26: pages may go live without
  // screenshots); `--show-shots` renders the dashed boxes for a local preview.
  if (!showShots) return `<!-- shot ${id} -->`;
  return `<figure class="shot-todo" data-shot="${id}"><span>${esc(T[lang].shotTodo)}: ${esc(what)}</span></figure>`;
};
// The path of a page in another language: /x/ ↔ /de/x/.
const enPath = (p, lang) => (lang === 'en' ? p : p.slice(lang.length + 1));
const langPath = (p, lang) => (lang === 'en' ? p : `/${lang}${p}`);
const left = [];
const built = new Map(); // English path → { lang: { page, html, file } }
for (const { lang, file } of pages) {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  const { m, page } = frontMatter(file);
  if (lang !== 'en' && !page.path.startsWith(`/${lang}/`)) throw new Error(`${file}: path ${page.path} must start with /${lang}/`);
  if (!new RegExp(`<html lang="${lang}">`).test(src)) throw new Error(`${file}: needs <html lang="${lang}">`);
  const base = enPath(page.path, lang);
  Object.assign(page, Object.fromEntries(LANGS.map((l) => [`${l}Url`, ORIGIN + langPath(base, l)])));
  page.url = ORIGIN + page.path;
  page.altPath = langPath(base, T[lang].other.lang);
  const body = src.slice(m[0].length).replace(/\{\{shot\s+"([\w-]+)"\s+"([^"]+)"\s*\}\}/g, (_, id, what) => shot(id, what, lang, file));
  const html = render(body, { ...ctx[lang], page, docsnav: docsNav(lang, page.path), docsindex: docsIndex(lang) }, file);
  const out = path.join(root, 'site', page.path, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  html.split('\n').forEach((line, i) => {
    if (PLACEHOLDERS.some((p) => p.test(line))) left.push(`site${page.path}index.html:${i + 1}: ${line.trim().slice(0, 140)}`);
  });
  // The release history lists earlier releases by design.
  if (base !== '/releases/') {
    let h;
    try { h = withoutHistory(html); } catch (e) { throw new Error(`${file}: ${e.message}`); }
    h.split('\n').forEach((line, i) => {
      for (const v of line.matchAll(VERSION_RE)) {
        if (!older(versionKey(v[1], v[2], v[3]))) continue;
        const at = Math.max(0, v.index - 60);
        stale.push(`${file} (site${page.path}index.html:${i + 1}) names ${v[0]}: …${line.slice(at, v.index + v[0].length + 40).trim()}…`);
      }
    });
  }
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
if (stale.length) {
  console.error(`build: ${stale.length} stale release text problem(s):\n  ${stale.join('\n  ')}`);
  if (strict) { console.error(`build: refused (--strict): bring What's new and every sentence naming an older release than ${release.version} up to date, or mark a sentence that is history on purpose with data-history`); process.exit(1); }
}
if (left.length) {
  console.error(`build: ${left.length} placeholder line(s) left:\n  ${left.join('\n  ')}`);
  if (strict) { console.error('build: refused (--strict): fill release.json and the marked legal fields first'); process.exit(1); }
}
if (shots.length) console.log(`build: ${shots.length} screenshot place(s) still empty:\n  ${shots.join('\n  ')}`);
if (shotsInEnglish.length) console.log(`build: ${shotsInEnglish.length} screenshot place(s) show the English interface (no shot-<id>-<lang>.jpg):\n  ${shotsInEnglish.join('\n  ')}`);
console.log(`build: ${pages.length} pages (${LANGS.join(', ')}), version ${release.version}${left.length || stale.length ? ' (with problems)' : ''}`);
