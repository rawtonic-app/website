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

## Two languages

Every page exists in English (`pages/x.html`, `/x/`) and German (`pages/de/x.html`, `/de/x/`). Change both in the same commit:

- Edit the English page, then the same place in `pages/de/x.html`. Keep the element ids (section anchors such as `#install`) in English and identical, and link the same targets; internal links in German pages point into `/de/` (`/de/privacy/#relay`), external links stay the same.
- Text in the head, header and footer comes from the `T` table in `scripts/build.mjs` (`{{t.…}}` in the partials), one entry per language; add a string to both.
- German uses the polite "Sie", decimal commas ("1,5 s") and the app's German labels (`src/i18n/locales/de.json` in the app) for menu items and buttons. The privacy and imprint pages are translations; the English version prevails, as their German text says.
- The build checks the pairs: every English page needs its German file, and the two must have the same set of element ids and the same set of link targets (with `/de/x/` read as `/x/`). `--strict` (and so `scripts/deploy.sh`) refuses to build otherwise; a plain build lists the differences.
- The release history entries come from the app's English CHANGELOG and stay English on `/de/releases/`; only their dates and "and N more" are German.

## Release

1. Fill `release.json`: `date` (YYYY-MM-DD), `dateText` (e.g. "28 October 2026"), each file's (`mac`, `macIntel` = the experimental Intel DMG, `linux`, `windows` = the experimental, unsigned Windows download the site offers: `Rawtonic_<version>_x64.msi` from the release after 0.1.0-alpha.11.1 on, the `_x64-setup.exe` before; `scripts/build.mjs` words the install step after the file type and refuses any other file) `size` (e.g. "36 MB") and `sha256` from the GitHub release. Until the release exists these stay `TBD` in the repository on purpose (so a plain build shows them and `--strict` refuses to deploy); never fill them with guesses.
2. Update "New in alpha.N" in `pages/index.html` and `pages/de/index.html` from the app's CHANGELOG. The German release date is derived from `date`.
3. The release history page (`/releases/`) is generated: every earlier release in the app's `CHANGELOG.md` at `release.json`'s tag (fetched from GitHub at build time, so the tag must exist; `RAWTONIC_CHANGELOG=path/to/CHANGELOG.md` reads a local copy instead), newest first, with date, summary and highlight titles. No hand edits.
4. `node scripts/build.mjs --strict` must pass: it refuses while a `TBD` or an `OFFEN FÜR NUTZER` placeholder (privacy and imprint) is left.

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
