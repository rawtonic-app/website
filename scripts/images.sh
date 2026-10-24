#!/bin/sh
# Makes the site's screenshot files from window captures.
#
#   scripts/images.sh DIR      # DIR holds <name>.png captures (Retina, 2x)
#
# For each <name>.png it writes site/assets/<name>.jpg (1440 px, on the page
# background, the fallback for browsers without AVIF or WebP) and
# <name>-720/-1440 .avif and .webp, which keep the window's transparent
# rounded corners. Captures narrower than 1440 px are not enlarged.
# Needs ImageMagick 7 (magick) and cwebp.
set -eu
src=${1:?usage: scripts/images.sh DIR-WITH-PNG-CAPTURES}
out=$(cd "$(dirname "$0")/.." && pwd)/site/assets
bg='#101316' # --bg in pages/partials/style.html
for png in "$src"/*.png; do
  name=$(basename "$png" .png)
  width=$(magick identify -format '%w' "$png")
  for w in 720 1440; do
    [ "$width" -lt "$w" ] && r=$width || r=$w
    magick "$png" -resize "${r}x" -quality 55 "$out/$name-$w.avif"
    cwebp -quiet -q 78 -alpha_q 90 -resize "$r" 0 "$png" -o "$out/$name-$w.webp"
  done
  [ "$width" -lt 1440 ] && r=$width || r=1440
  magick "$png" -resize "${r}x" -background "$bg" -alpha remove -alpha off -quality 82 -interlace JPEG "$out/$name.jpg"
  echo "$name: $(du -k "$out/$name-1440.webp" | cut -f1) KB webp at 1440"
done
