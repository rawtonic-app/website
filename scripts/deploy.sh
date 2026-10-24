#!/bin/bash
# Deploys site/ to the web server: backup of the live copy, rsync, check.
# Usage: scripts/deploy.sh [--dry-run]
# Host and path default to the maintainer's server (SSH alias "deskmini",
# nginx container "rawtonic-web" serving ~/rawtonic); override with
# DEPLOY_HOST / DEPLOY_PATH / DEPLOY_URL.
set -euo pipefail
cd "$(dirname "$0")/.."
HOST=${DEPLOY_HOST:-deskmini}
DEST=${DEPLOY_PATH:-rawtonic}
URL=${DEPLOY_URL:-https://rawtonic.cc/}
DRY=""
[ "${1:-}" = "--dry-run" ] && DRY="--dry-run"

stamp=$(date +%Y%m%d-%H%M%S)
if [ -z "$DRY" ]; then
  # Keep the live copy before replacing it (the newest 10 are kept).
  ssh "$HOST" "mkdir -p ~/rawtonic-site-backups && tar -C ~ -czf ~/rawtonic-site-backups/$DEST-$stamp.tgz $DEST && ls -1t ~/rawtonic-site-backups/$DEST-*.tgz | tail -n +11 | xargs -r rm --"
fi
rsync -av --delete $DRY --exclude '*.bak' --exclude '*.previous' site/ "$HOST:$DEST/"
[ -n "$DRY" ] && exit 0
code=$(curl -sS -o /dev/null -w '%{http_code}' -H 'cache-control: no-cache' "$URL")
echo "deploy: $URL answers $code (backup ~/rawtonic-site-backups/$DEST-$stamp.tgz on $HOST)"
[ "$code" = 200 ]
