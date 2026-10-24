# rawtonic.cc

The website of [Rawtonic](https://github.com/rawtonic-app/rawtonic), a free, open-source RAW developer.

- `site/` is the whole site: one static `index.html`, `assets/`, `robots.txt`, `sitemap.xml`. No build step, no analytics, no third-party scripts.
- The screenshots in `site/assets/readme-*.jpg` are the same files as `docs/images/` in the app repository.
- Fonts: Hanken Grotesk under the SIL Open Font License (`site/assets/fonts/OFL.txt`).

## Deploy

```sh
scripts/deploy.sh --dry-run   # what would change
scripts/deploy.sh             # backup of the live copy, rsync, check that the site answers 200
```

Roll back: unpack the newest file in `~/rawtonic-site-backups/` on the server over `~/rawtonic`.

## Rules

Same as the app (its AGENTS.md): no other products' content or trademarks for our features, honest claims (say what a measurement covers), privacy as in the app's PRIVACY.md — the site loads nothing from third parties and counts no visitors.
