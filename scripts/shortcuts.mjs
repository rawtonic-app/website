// Keyboard shortcuts page ({{shortcuts}}): generated from the app's own keymap,
// so it cannot drift from the app. The source is the app's
// src/utils/keyboardUtils.ts (KEYBIND_SECTIONS, KEYBIND_DEFINITIONS: each
// action's description key, default key and alias keys) and its locale files
// for the names, at the release the site describes:
//
//   RAWTONIC_APP=/path/to/app-checkout   read the files from a local checkout
//   (otherwise)                          fetch them from GitHub at release.json's
//                                        tag, or from main while that tag does
//                                        not exist yet (release.sh's site stage)
//
// The parser refuses a keymap it does not fully understand (an entry it
// cannot read, a name missing in a language), so a change of the app's file
// format stops the build instead of leaving keys out.
import fs from 'node:fs';
import path from 'node:path';

const FILES = ['src/utils/keyboardUtils.ts', 'src/i18n/locales/en.json', 'src/i18n/locales/de.json'];

export async function loadAppFiles(tag, { app = process.env.RAWTONIC_APP, fetchFn = fetch } = {}) {
  if (app) return Object.fromEntries(FILES.map((f) => [f, fs.readFileSync(path.join(app, f), 'utf8')]));
  for (const ref of [tag, 'main']) {
    const out = {};
    let missing = false;
    for (const f of FILES) {
      const url = `https://raw.githubusercontent.com/rawtonic-app/rawtonic/${ref}/${f}`;
      const res = await fetchFn(url);
      if (res.status === 404 && ref !== 'main') { missing = true; break; }
      if (!res.ok) throw new Error(`keyboard shortcuts: ${url} answered ${res.status} (set RAWTONIC_APP to a local app checkout)`);
      out[f] = await res.text();
    }
    if (!missing) {
      if (ref !== tag) console.log(`build: keyboard shortcuts from the app's main (tag ${tag} not on GitHub yet)`);
      return out;
    }
  }
  throw new Error('keyboard shortcuts: unreachable');
}

// The array literal after `name ... = [` up to its matching `];`, without comments.
function arrayLiteral(ts, name) {
  const start = ts.search(new RegExp(`export const ${name}\\b[^=]*=\\s*\\[`));
  if (start < 0) throw new Error(`keyboard shortcuts: ${name} not found in keyboardUtils.ts`);
  const open = ts.indexOf('[', ts.indexOf('=', start));
  let depth = 0;
  for (let i = open; i < ts.length; i++) {
    if (ts[i] === '[') depth++;
    else if (ts[i] === ']' && --depth === 0) return ts.slice(open + 1, i).replace(/\/\/[^\n]*/g, '');
  }
  throw new Error(`keyboard shortcuts: ${name} has no end`);
}
const strings = (s) => [...s.matchAll(/'([^']*)'/g)].map((m) => m[1]);

export function parseKeymap(ts) {
  const sections = [...arrayLiteral(ts, 'KEYBIND_SECTIONS').matchAll(/\{\s*id:\s*'(\w+)',\s*label:\s*'([\w.]+)'\s*\}/g)]
    .map((m) => ({ id: m[1], label: m[2] }));
  const body = arrayLiteral(ts, 'KEYBIND_DEFINITIONS');
  const entries = body.match(/\{[^{}]*\}/g) ?? [];
  const defs = entries.map((e) => {
    const field = (k) => (e.match(new RegExp(`\\b${k}:\\s*'([^']*)'`)) || [])[1];
    const combo = (e.match(/\bdefaultCombo:\s*\[([^\]]*)\]/) || [])[1];
    const aliases = (e.match(/\baliasCombos:\s*\[((?:\s*\[[^\]]*\]\s*,?)*)\s*\]/) || [])[1];
    const def = {
      action: field('action'), description: field('description'), section: field('section'),
      combos: [strings(combo ?? ''), ...[...(aliases ?? '').matchAll(/\[([^\]]*)\]/g)].map((m) => strings(m[1]))].filter((c) => c.length),
    };
    if (!def.action || !def.description || !def.section || combo === undefined) throw new Error(`keyboard shortcuts: cannot read the keymap entry ${e.replace(/\s+/g, ' ').slice(0, 120)}`);
    return def;
  });
  const count = (body.match(/\baction:/g) || []).length;
  if (defs.length !== count || !sections.length) throw new Error(`keyboard shortcuts: read ${defs.length} of ${count} keymap entries and ${sections.length} sections`);
  for (const d of defs) if (!sections.some((s) => s.id === d.section)) throw new Error(`keyboard shortcuts: ${d.action} has unknown section ${d.section}`);
  return { sections, defs };
}

const lookupKey = (json, key) => key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), json);

// Key names: macOS with Apple's glyphs (⌥⇧⌘, as the app's menus), Windows and
// Linux as words. Punctuation keys are named by the US layout; the app shows
// the character of your own layout for the key in the same place.
const KEYS = {
  ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Backslash: '\\', Slash: '/', Comma: ',', Period: '.',
  BracketLeft: '[', BracketRight: ']', Quote: '\'', Semicolon: ';', Backquote: '`', Equal: '=', Minus: '-',
};
const WORDS = {
  en: { Space: 'Space', Enter: 'Enter', Tab: 'Tab', CapsLock: 'Caps Lock', Delete: 'Delete', Escape: 'Esc', ctrl: 'Ctrl', shift: 'Shift', alt: 'Alt' },
  de: { Space: 'Leertaste', Enter: 'Eingabe', Tab: 'Tab', CapsLock: 'Feststelltaste', Delete: 'Entf', Escape: 'Esc', ctrl: 'Strg', shift: 'Umschalt', alt: 'Alt' },
};
const MAC = { Space: 'Space', Enter: '↩', Tab: '⇥', CapsLock: '⇪', Delete: '⌫', Escape: 'Esc' };
function keyName(code, withCtrl, mac, lang) {
  if (/^Key[A-Z]$/.test(code) || /^Digit\d$/.test(code)) return code.slice(-1);
  if (/^F\d+$/.test(code)) return code;
  if (withCtrl && code === 'Equal') return '+';
  if (mac && MAC[code]) return MAC[code];
  return KEYS[code] ?? WORDS[lang][code] ?? code;
}
export function formatCombo(combo, mac, lang) {
  const key = combo[combo.length - 1];
  const withCtrl = combo.includes('ctrl');
  if (mac) return [['alt', '⌥'], ['shift', '⇧'], ['ctrl', '⌘']].filter(([m]) => combo.includes(m)).map(([, g]) => g).join('') + keyName(key, withCtrl, true, lang);
  return combo.map((part, i) => (i === combo.length - 1 ? keyName(part, withCtrl, false, lang) : WORDS[lang][part] ?? part)).join('+');
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const HEAD = { en: ['Action', 'macOS', 'Windows and Linux', 'or'], de: ['Aktion', 'macOS', 'Windows und Linux', 'oder'] };

// One table per section of the app's keyboard settings, in its order; actions
// without a default key are left out (they can be assigned in Settings).
export function shortcutTables(files, lang) {
  const { sections, defs } = parseKeymap(files['src/utils/keyboardUtils.ts']);
  const loc = JSON.parse(files[`src/i18n/locales/${lang}.json`]);
  const name = (key) => {
    const v = lookupKey(loc, key);
    if (typeof v !== 'string') throw new Error(`keyboard shortcuts: ${lang}.json has no ${key}`);
    return v;
  };
  const [hAction, hMac, hPc, or] = HEAD[lang];
  const kbd = (c, mac) => `<kbd>${esc(formatCombo(c, mac, lang))}</kbd>`;
  return sections.map((s) => {
    const rows = defs.filter((d) => d.section === s.id && d.combos.length).map((d) => `<tr><td>${esc(name(d.description))}</td>`
      + `<td>${d.combos.map((c) => kbd(c, true)).join(` ${or} `)}</td><td>${d.combos.map((c) => kbd(c, false)).join(` ${or} `)}</td></tr>`);
    if (!rows.length) return '';
    return `<h2 id="keys-${s.id}">${esc(name(s.label))}</h2>\n<div class="table-scroll"><table class="keys"><thead><tr><th>${hAction}</th><th>${hMac}</th><th>${hPc}</th></tr></thead><tbody>\n${rows.join('\n')}\n</tbody></table></div>`;
  }).filter(Boolean).join('\n');
}
