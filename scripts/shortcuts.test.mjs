// Tests of scripts/shortcuts.mjs: the keymap parser, key names and the
// source fallback (node --test scripts/).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { formatCombo, loadAppFiles, parseKeymap, shortcutTables } from './shortcuts.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const app = path.join(root, 'scripts/fixtures/app');
const ts = fs.readFileSync(path.join(app, 'src/utils/keyboardUtils.ts'), 'utf8');

test('the keymap is read whole: sections, defaults, aliases, comments inside entries', () => {
  const { sections, defs } = parseKeymap(ts);
  assert.deepEqual(sections.map((s) => s.id), ['library', 'view']);
  assert.equal(defs.length, 6);
  assert.deepEqual(defs.find((d) => d.action === 'flag_reject').combos, [['KeyX'], ['shift', 'KeyX']]);
  assert.deepEqual(defs.find((d) => d.action === 'copy_files').combos, []);
});

test('an entry the parser cannot read stops the build', () => {
  assert.throws(() => parseKeymap(ts.replace("defaultCombo: ['KeyG'],", "defaultCombo: KEY_G,")), /cannot read the keymap entry/);
  assert.throws(() => parseKeymap(ts.replace("section: 'view' },", "section: 'nowhere' },")), /unknown section/);
});

test('keys are named as the app names them', () => {
  assert.equal(formatCombo(['ctrl', 'shift', 'alt', 'KeyE'], true, 'en'), '⌥⇧⌘E');
  assert.equal(formatCombo(['ctrl', 'shift', 'alt', 'KeyE'], false, 'en'), 'Ctrl+Shift+Alt+E');
  assert.equal(formatCombo(['ctrl', 'shift', 'alt', 'KeyE'], false, 'de'), 'Strg+Umschalt+Alt+E');
  assert.equal(formatCombo(['ctrl', 'Equal'], true, 'en'), '⌘+');
  assert.equal(formatCombo(['Backslash'], false, 'en'), '\\');
});

test('a name missing in a language stops the build', () => {
  const files = { 'src/utils/keyboardUtils.ts': ts, 'src/i18n/locales/de.json': '{}' };
  assert.throws(() => shortcutTables(files, 'de'), /de\.json has no/);
});

test('without RAWTONIC_APP the files come from the release tag, else from main', async () => {
  const asked = [];
  const fetchFn = async (url) => {
    asked.push(url);
    if (url.includes('/v9.9.9/')) return { ok: false, status: 404 };
    return { ok: true, status: 200, text: async () => (url.endsWith('.ts') ? ts : '{}') };
  };
  const files = await loadAppFiles('v9.9.9', { app: '', fetchFn });
  assert.ok(asked[0].includes('/v9.9.9/src/utils/keyboardUtils.ts'));
  assert.ok(asked.slice(1).every((u) => u.includes('/main/')));
  assert.equal(files['src/utils/keyboardUtils.ts'], ts);
  const failing = async () => ({ ok: false, status: 500 });
  await assert.rejects(loadAppFiles('v9.9.9', { app: '', fetchFn: failing }), /answered 500/);
});
