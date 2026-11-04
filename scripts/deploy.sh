#!/bin/bash
# Deploys site/ to Cloudflare (Workers static assets, project "rawtonic-website",
# custom domains rawtonic.cc and www.rawtonic.cc set in the Cloudflare dashboard;
# config: wrangler.jsonc). Needs `npx wrangler login` once on this machine.
# Usage: scripts/deploy.sh [--dry-run]
# Until 2026-11-04 the site was served by nginx on the maintainer's server
# (SSH alias "deskmini", ~/rawtonic, backups in ~/rawtonic-site-backups); to roll
# back, point the rawtonic.cc A record at the VPS proxy again.
set -euo pipefail
cd "$(dirname "$0")/.."
URL=${DEPLOY_URL:-https://rawtonic.cc/}
DRY=""
[ "${1:-}" = "--dry-run" ] && DRY="--dry-run"

# Build the pages from pages/ and release.json; refuses while a placeholder
# (TBD in release.json, OFFEN FÜR NUTZER on the legal pages) is left.
node scripts/build.mjs --strict

npx --yes wrangler deploy $DRY
[ -n "$DRY" ] && exit 0
code=$(curl -sS -o /dev/null -w '%{http_code}' -H 'cache-control: no-cache' "$URL")
echo "deploy: $URL answers $code"
[ "$code" = 200 ]
