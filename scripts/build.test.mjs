// Tests of scripts/build.mjs --strict's release checks: each case builds a copy
// of the site (pages, release.json, assets) with one change and expects the
// build to pass or to be refused with a given message.
//
//   node --test scripts/
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const release = JSON.parse(fs.readFileSync(path.join(root, 'release.json'), 'utf8'));

// A small changelog: the release history needs one earlier release.
const CHANGELOG = `# Changelog

## ${release.version} — ${release.date}

This release.

## 0.0.1-alpha.1 — 2026-01-01

The first alpha. Something.

### Highlights

- **A thing.** Measured.
`;

function build(change = () => {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rawtonic-site-test-'));
  try {
    for (const d of ['pages', 'scripts', 'site/assets']) fs.cpSync(path.join(root, d), path.join(dir, d), { recursive: true });
    fs.copyFileSync(path.join(root, 'release.json'), path.join(dir, 'release.json'));
    fs.writeFileSync(path.join(dir, 'CHANGELOG.md'), CHANGELOG);
    change(dir);
    const r = spawnSync(process.execPath, [path.join(dir, 'scripts/build.mjs'), '--strict'], {
      cwd: dir, encoding: 'utf8', env: { ...process.env, RAWTONIC_CHANGELOG: path.join(dir, 'CHANGELOG.md') },
    });
    const read = (f) => (r.status === 0 ? fs.readFileSync(path.join(dir, 'site', f), 'utf8') : '');
    return { status: r.status, out: r.stdout + r.stderr, index: read('index.html'), docsExport: read('docs/export/index.html') };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
const editJson = (dir, f) => {
  const p = path.join(dir, 'release.json');
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  f(j);
  fs.writeFileSync(p, JSON.stringify(j, null, 2));
};
const editPage = (dir, page, f) => {
  const p = path.join(dir, 'pages', page);
  fs.writeFileSync(p, f(fs.readFileSync(p, 'utf8')));
};
// "0.1.0-alpha.18" → "0.1.0-alpha.17": a release older than the current one.
const previous = release.version.replace(/(\d+)(\.\d+)?$/, (_, n) => String(Number(n) - 1));

test('the current site builds, with What’s new from release.json', () => {
  const r = build();
  assert.equal(r.status, 0, r.out);
  const short = release.version.replace(/^\d+\.\d+\.\d+-/, '');
  assert.match(r.index, new RegExp(`<h2 class="head" id="new-title">New in ${short.replace(/\./g, '\\.')}\\.</h2>`));
  const html = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  for (const it of release.whatsNew.en.items) assert.ok(r.index.includes(`<h3>${html(it.title)}</h3>`), it.title);
});

test('a What’s new of an older release is refused', () => {
  const r = build((dir) => editJson(dir, (j) => { j.whatsNew.version = previous; }));
  assert.notEqual(r.status, 0);
  assert.match(r.out, new RegExp(`whatsNew is for ${previous.replace(/\./g, '\\.')}, not`));
});

test('a missing German What’s new is refused', () => {
  const r = build((dir) => editJson(dir, (j) => { delete j.whatsNew.de; }));
  assert.notEqual(r.status, 0);
  assert.match(r.out, /whatsNew\.de: missing/);
});

test('an empty item text is refused', () => {
  const r = build((dir) => editJson(dir, (j) => { j.whatsNew.en.items[1].text = ''; }));
  assert.notEqual(r.status, 0);
  assert.match(r.out, /whatsNew\.en\.items\[1\]\.text: empty/);
});

test('an older version in page text is refused, in either language', () => {
  for (const page of ['code-signing.html', 'de/code-signing.html']) {
    const r = build((dir) => editPage(dir, page, (s) => s.replace('</main>', `<p>New in ${previous}.</p></main>`)));
    assert.notEqual(r.status, 0, page);
    assert.match(r.out, new RegExp(`pages/${page.replace(/\./g, '\\.')} .*names ${previous.replace(/\./g, '\\.')}`));
  }
});

test('an older version inside data-history is allowed, nested elements included', () => {
  const r = build((dir) => editPage(dir, 'code-signing.html', (s) => s.replace('</main>',
    `<p><span data-history>Since <span>${previous}</span> and <span>${previous}</span>, ${previous}</span> it does.</p></main>`)));
  assert.equal(r.status, 0, r.out);
});

test('the release history page may name every earlier release', () => {
  const r = build((dir) => editPage(dir, 'releases.html', (s) => s.replace('</main>', `<p>${previous}</p></main>`)));
  assert.equal(r.status, 0, r.out);
});

test('the current and newer versions in page text are fine', () => {
  const r = build((dir) => editPage(dir, 'code-signing.html', (s) => s.replace('</main>', `<p>Since ${release.version}.</p></main>`)));
  assert.equal(r.status, 0, r.out);
});

test('empty screenshot places are listed but not shown on the built pages', () => {
  const r = build();
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /screenshot place\(s\) still empty/);
  assert.ok(!r.docsExport.includes('class="shot-todo"'), 'a dashed screenshot box reached the built page');
  assert.ok(r.docsExport.includes('<!-- shot export-dialog -->'));
});
