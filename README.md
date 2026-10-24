# rawtonic.cc

The website of [Rawtonic](https://github.com/rawtonic-app/rawtonic), a free, open-source RAW developer.

- `pages/` holds the pages (`index`, `switching`, `privacy`, `imprint`) and `pages/partials/` the shared head, styles, header and footer.
- `release.json` is the one place for release facts: version, date, file names, sizes and SHA-256.
- `scripts/build.mjs` (Node 20+, no dependencies) builds `site/**/index.html` and `site/sitemap.xml` from both. The built files are not committed.
- `site/` is what is served: the built pages, `assets/`, `robots.txt`. No analytics, no third-party scripts or fonts.
- Screenshots: `site/assets/readme-*.jpg` are the same files as `docs/images/` in the app repository. Each also exists as AVIF and WebP at 720 and 1440 px; pages use them through `{{picture name "alt" "sizes"}}`. After replacing a JPEG, make the variants again:
  ```sh
  cd site/assets && for f in readme-*.jpg; do b=${f%.jpg}; for w in 720 1440; do
    magick $f -resize ${w}x -quality 55 $b-$w.avif; cwebp -quiet -q 78 -resize $w 0 $f -o $b-$w.webp; done; done
  ```
- `site/assets/og-image.jpg` (1200 × 630) is the link preview image.
- Fonts: Hanken Grotesk under the SIL Open Font License (`site/assets/fonts/OFL.txt`).

## Build and preview

```sh
node scripts/build.mjs                  # lists placeholders still left (TBD, OFFEN FÜR NUTZER)
python3 -m http.server -d site 8000     # http://localhost:8000/
```

## Release

1. Fill `release.json`: `date` (YYYY-MM-DD), `dateText` (e.g. "28 October 2026"), each file's `size` (e.g. "36 MB") and `sha256` from the GitHub release.
2. Update "New in alpha.N" in `pages/index.html` from the app's CHANGELOG.
3. `node scripts/build.mjs --strict` must pass: it refuses while a `TBD` or an `OFFEN FÜR NUTZER` placeholder (privacy and imprint) is left.

## Deploy

```sh
scripts/deploy.sh --dry-run   # builds (--strict), shows what would change
scripts/deploy.sh             # builds, backup of the live copy, rsync, check that the site answers 200
```

Roll back: unpack the newest file in `~/rawtonic-site-backups/` on the server over `~/rawtonic`.

## Rules

Same as the app (its AGENTS.md): no other products' content or trademarks for our features; Lightroom and Capture One are named only to say what Rawtonic imports from or how it measured against them. Honest claims: every number says what it covers. Privacy as in the app's PRIVACY.md — the site loads nothing from third parties and counts no visitors.
