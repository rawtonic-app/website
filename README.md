# rawtonic.cc

The website of [Rawtonic](https://github.com/rawtonic-app/rawtonic), a free, open-source RAW developer.

- `pages/` holds the English pages (`index`, `switching`, `windows`, `code-signing`, `releases`, `credits`, `privacy`, `imprint`), `pages/de/` their German counterparts (served under `/de/`) and `pages/partials/` the shared head, styles, header and footer.
- `release.json` is the one place for release facts: version, date, file names, sizes and SHA-256.
- `scripts/build.mjs` (Node 20+, no dependencies) builds `site/**/index.html` and `site/sitemap.xml` from both. The built files are not committed.
- `site/` is what is served: the built pages, `assets/`, `robots.txt`. No analytics scripts, no third-party scripts or fonts.
- Screenshots: `site/assets/shot-*` are window captures of the app (made with a QA build through its QA control channel, `window.capture` at Retina 2×), cropped as PNG. `scripts/images.sh DIR` turns each `DIR/<name>.png` into `<name>.jpg` (1440 px on the page background, the fallback) and AVIF and WebP at 720 and 1440 px that keep the window's transparent corners; pages use them through `{{picture name "alt" "sizes"}}`, which takes each image's width and height from its JPEG. The capture PNGs are not committed. Photographs and their licences: `CREDITS.md` and the `/credits/` page.
- `site/assets/og-image.jpg` (1200 × 630) is the link preview image.
- Fonts: Hanken Grotesk under the SIL Open Font License (`site/assets/fonts/OFL.txt`).

## Build and preview

```sh
node scripts/build.mjs                  # lists placeholders still left (TBD, OFFEN FÜR NUTZER)
python3 -m http.server -d site 8000     # http://localhost:8000/
```

## Documentation (`/docs/`)

User documentation for photographers: one page per tool or workflow, English in `pages/docs/x.html` (`/docs/x/`), German in `pages/de/docs/x.html` (`/de/docs/x/`), same pairing rules as every other page. `pages/docs/index.html` is the overview.

- **Front matter.** Besides `path`, `title` and `description` (the description is also the page's line on the overview), a tool page carries `"docs": {"section": "basics", "order": 20, "tool": "exposure", "nav": "Basic tone"}`. `section` is one of `library`, `basics`, `local`, `ai`, `export`, `reference` (Import & Library → Develop basics → Local adjustments → AI tools → Export & sharing, the order a photographer meets them, then Reference for lookup pages such as the shortcuts); `order` sorts within it; `nav` is the short name in the side navigation. `tool` is the app's own key for the tool: the Develop tool group key (`key` of its `ToolGroup` in the app's `StudioDevelop.tsx`, e.g. `exposure`, `noiseReduction`), with `.control` for a page about one control (`noiseReduction.aiDenoise`), or the workflow key (`export`). Each `tool` is unique per language; the build checks section, tool and nav. The app's `?` links will find pages by this key.
- **Navigation** is generated: `{{docsnav}}` (side navigation, current page marked) and `{{docsindex}}` (overview) come from the front matter, so a new page needs no edits elsewhere. Section names are in the `T` table (`docSections`).
- **Voice.** Written for photographers, not programmers, like the release notes: what a tool does, why it works that way and when to use it. Numbers only measured ones, with what they cover. Other editors are named only to say "if you come from …" (in a `<p class="when">`), never in a heading or as the name of one of our features. German with "du" and the app's German labels.
- **Keyboard shortcuts** (`/docs/shortcuts/`) are generated, never typed: `{{shortcuts}}` renders one table per section of the app's keymap (`src/utils/keyboardUtils.ts`: `KEYBIND_SECTIONS`, `KEYBIND_DEFINITIONS` with each action's default and alias keys) with the action names from the app's `en.json`/`de.json`, macOS and Windows/Linux key names side by side (`scripts/shortcuts.mjs`). The build reads these files from GitHub at `release.json`'s tag (from `main` while the tag does not exist yet, as in release.sh's `site` stage), or from a local checkout with `RAWTONIC_APP=/path/to/app`; it refuses a keymap entry it cannot read or a name missing in a language, so a change of the app's key table reaches the page with the next release and a change of its format stops the build. `node --test scripts/` uses the small copy in `scripts/fixtures/app/`.
- **Screenshots.** `{{shot "id" "what it shows"}}` marks the place of a screenshot of a licence-clean demo scene. The app makes them per release (its `scripts/docs-shots/`: a QA build on the private demo library, one entry per place id in `scripts/docs-shots/shots.json`, English and German interface; release.sh stage `docs-shots`, its stage `site` runs `scripts/images.sh` on them and commits `site/assets/shot-<id>.*` and `shot-<id>-de.*`). The build maps each place to its picture by the id, so no page is edited per release: with `site/assets/shot-<id>.jpg` the place becomes that `{{picture}}` (German pages take `shot-<id>-de.jpg` first and fall back to the English capture, which the build lists), "what it shows" is its alt text, so it must describe what the capture shows. A place without its image is listed as empty and not shown on the built page (an HTML comment marks it; pages may go live before their screenshots); `node scripts/build.mjs --show-shots` shows the empty ones as dashed boxes for a local preview. A new place needs an entry in the app's shot list, or it stays empty (release.sh lists it).
- **Rule.** A change to a tool in the app updates its page here in the same release.

## Two languages

Every page exists in English (`pages/x.html`, `/x/`) and German (`pages/de/x.html`, `/de/x/`). Change both in the same commit:

- Edit the English page, then the same place in `pages/de/x.html`. Keep the element ids (section anchors such as `#install`) in English and identical, and link the same targets; internal links in German pages point into `/de/` (`/de/privacy/#relay`), external links stay the same.
- Text in the head, header and footer comes from the `T` table in `scripts/build.mjs` (`{{t.…}}` in the partials), one entry per language; add a string to both.
- German addresses the reader as "du" (du/dein/dich, lowercase; maintainer decision 2026-11-04), uses decimal commas ("1,5 s") and the app's German labels (`src/i18n/locales/de.json` in the app) for menu items and buttons. The privacy and imprint pages are translations; the English version prevails, as their German text says.
- The build checks the pairs: every English page needs its German file, and the two must have the same set of element ids and the same set of link targets (with `/de/x/` read as `/x/`). `--strict` (and so `scripts/deploy.sh`) refuses to build otherwise; a plain build lists the differences.
- The release history entries come from the app's English CHANGELOG and stay English on `/de/releases/`; only their dates and "and N more" are German.

## Release

The site follows each release; nothing about the version is written by hand in the pages.

1. **What's new** — `release.json` `whatsNew`: `version` and, for `en` and `de`, a one-line `summary`, three `items` (`title`, `text`) and a `note` (how to update, what changes for existing edits). Plain text, rendered into the home page's "New in …" block (`{{whatsnew}}`). It is written together with the release's CHANGELOG section, on the website branch `release-VERSION` (see the app's `docs/RELEASING.md`).
2. **Facts** — `scripts/release.sh` in the app repository (stage `site`) writes `version`, `date`, `dateText`, `tag` and every file (`mac`, `macIntel` = the experimental Intel DMG, `linux`, `windows` = the MSI the site offers, `otherAssets`) with its size (MiB, rounded half-up) and SHA-256 from the release's own `SHA256SUMS.txt` onto that branch, and runs `node scripts/build.mjs --strict`. `scripts/build.mjs` words the Windows install step after the file type (`Rawtonic_<version>_x64.msi` from the release after 0.1.0-alpha.11.1 on, the `_x64-setup.exe` before) and refuses any other file. Never fill these by hand with guesses.
3. **Publish** — `scripts/release.sh --publish VERSION` publishes the GitHub release, merges `release-VERSION` into `main`, runs `scripts/deploy.sh` and checks that rawtonic.cc and /de/ show the version.
4. The release history page (`/releases/`) is generated: every earlier release in the app's `CHANGELOG.md` at `release.json`'s tag (fetched from GitHub at build time, so the tag must exist; `RAWTONIC_CHANGELOG=path/to/CHANGELOG.md` reads a local copy instead), newest first, with date, summary and highlight titles. No hand edits.

`node scripts/build.mjs --strict` refuses while a `TBD` or an `OFFEN FÜR NUTZER` placeholder (privacy and imprint) is left, while `whatsNew.version` is not `version` or a language's text is missing, and while a page (except the release history) names an older release than `version` — `alpha.17`, `0.1.0-alpha.11.1`, `beta.2` — outside an element marked `data-history`. A sentence that names an old release on purpose ("Since alpha.7 it is signed", a measurement of alpha.6) gets the attribute on its element or a `<span data-history>` around it; every other one must be updated. So each release makes someone read the sentences that named the release before it. `node --test scripts/` tests these checks (deploy.sh runs it first).

## Deploy

```sh
scripts/deploy.sh --dry-run   # builds (--strict), shows what wrangler would upload
scripts/deploy.sh             # builds, uploads to Cloudflare, checks that the site answers 200
```

Hosting (since 2026-11-04): Cloudflare Workers static assets, project `rawtonic-website` (`wrangler.jsonc`), custom domains rawtonic.cc and www.rawtonic.cc in the Cloudflare dashboard. Needs `npx wrangler login` once. Roll back a bad deploy with `npx wrangler rollback` (previous version), or move hosting back by pointing the rawtonic.cc A record at the VPS proxy (91.98.129.92), which serves the copy on the maintainer's server (backups in `~/rawtonic-site-backups/`).

## Rules

Same as the app (its AGENTS.md): no other products' content or trademarks for our features; Lightroom and Capture One are named only to say what Rawtonic imports from or how it measured against them. Honest claims: every number says what it covers. The site uses no cookies, analytics scripts or tracking. Cloudflare, which already delivers it, provides aggregated traffic counts without individual profiles; GitHub counts release downloads. See the privacy page.

## Licence

Code under AGPL-3.0-or-later, texts and own graphics under CC BY-SA 4.0, screenshots, photographs and fonts under their own licences: see [LICENSES.md](LICENSES.md).
