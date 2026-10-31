# rawtonic.cc

The website of [Rawtonic](https://github.com/rawtonic-app/rawtonic), a free, open-source RAW developer.

- `pages/` holds the pages (`index`, `switching`, `releases`, `credits`, `privacy`, `imprint`) and `pages/partials/` the shared head, styles, header and footer.
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

## Release

1. Fill `release.json`: `date` (YYYY-MM-DD), `dateText` (e.g. "28 October 2026"), each file's (`mac`, `macIntel` = the experimental Intel DMG, `linux`, `windows` = the experimental, unsigned installer) `size` (e.g. "36 MB") and `sha256` from the GitHub release. Until the release exists these stay `TBD` in the repository on purpose (so a plain build shows them and `--strict` refuses to deploy); never fill them with guesses.
2. Update "New in alpha.N" in `pages/index.html` from the app's CHANGELOG.
3. The release history page (`/releases/`) is generated: every earlier release in the app's `CHANGELOG.md` at `release.json`'s tag (fetched from GitHub at build time, so the tag must exist; `RAWTONIC_CHANGELOG=path/to/CHANGELOG.md` reads a local copy instead), newest first, with date, summary and highlight titles. No hand edits.
4. `node scripts/build.mjs --strict` must pass: it refuses while a `TBD` or an `OFFEN FÜR NUTZER` placeholder (privacy and imprint) is left.

## Deploy

```sh
scripts/deploy.sh --dry-run   # builds (--strict), shows what would change
scripts/deploy.sh             # builds, backup of the live copy, rsync, check that the site answers 200
```

Roll back: unpack the newest file in `~/rawtonic-site-backups/` on the server over `~/rawtonic`.

## Rules

Same as the app (its AGENTS.md): no other products' content or trademarks for our features; Lightroom and Capture One are named only to say what Rawtonic imports from or how it measured against them. Honest claims: every number says what it covers. The site uses no cookies, analytics scripts or tracking. Cloudflare, which already delivers it, provides aggregated traffic counts without individual profiles; GitHub counts release downloads. See the privacy page.
