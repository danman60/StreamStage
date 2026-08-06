#!/usr/bin/env bash
# =============================================================================
# Pull the five films into the kiosk, and cut a poster frame for each.
#
#     ./expo-assets/kiosk/sync-media.sh
#
# Run this once now, and AGAIN every time a film is re-rendered — when the
# ElevenLabs VO lands, this script is the entire deploy. It always prefers the
# newest cut it can find:
#
#     promo-vo.mp4   (the VO cut — preferred once it exists)
#     promo.mp4      (the current mixed cut)
#     promo-web.mp4  / cd-film-web.mp4   (720p fallbacks)
#
# Films are copied, not symlinked, so the booth laptop is not depending on
# /mnt/data being mounted at 9am in a hotel ballroom.
# =============================================================================
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MEDIA="$HERE/media"
POSTERS="$MEDIA/posters"
mkdir -p "$MEDIA" "$POSTERS"

# product | source directory
SOURCES=(
  "studiosage|/mnt/data/sagevideo/promo/out"
  "compsync|/mnt/data/compsync-video/promo/out"
  "callboard|/mnt/data/callboard-video/promo/out"
  "costumecraft|/mnt/data/costumecraft-video/out"
  "reflect|/mnt/data/reflect-video/out"
)

# newest cut first
CANDIDATES=(promo-vo.mp4 promo.mp4 promo-web.mp4 cd-film-web.mp4)

have_ffmpeg=1
command -v ffmpeg >/dev/null 2>&1 || have_ffmpeg=0

missing=0
echo
echo "  Syncing booth films -> $MEDIA"
echo "  ---------------------------------------------------------------"

for entry in "${SOURCES[@]}"; do
  id="${entry%%|*}"
  dir="${entry##*|}"
  picked=""

  for c in "${CANDIDATES[@]}"; do
    if [[ -f "$dir/$c" ]]; then picked="$dir/$c"; break; fi
  done

  if [[ -z "$picked" ]]; then
    printf "  %-14s MISSING — nothing found in %s\n" "$id" "$dir"
    missing=$((missing + 1))
    continue
  fi

  dest="$MEDIA/$id.mp4"
  # Skip the copy only when the destination is byte-for-byte the same size AND
  # not older. Size is checked deliberately: an mtime-only test silently kept a
  # stale 720p cut of CompSync in place, which is exactly the kind of thing you
  # do not discover until the film is on a TV in front of somebody.
  src_size=$(stat -c %s "$picked" 2>/dev/null || echo 0)
  dst_size=$(stat -c %s "$dest"   2>/dev/null || echo -1)
  if [[ -f "$dest" && "$src_size" == "$dst_size" && "$picked" -ot "$dest" ]]; then
    printf "  %-14s up to date  (%s)\n" "$id" "$(basename "$picked")"
  else
    cp -f "$picked" "$dest.tmp" && mv -f "$dest.tmp" "$dest"
    size=$(du -h "$dest" | cut -f1)
    printf "  %-14s copied      (%s, %s)\n" "$id" "$(basename "$picked")" "$size"
  fi

  # Poster = frame 0, so the still that shows before playback is exactly the
  # frame the film opens on. Any other frame would visibly pop on tap.
  if [[ $have_ffmpeg -eq 1 ]]; then
    poster="$POSTERS/$id.jpg"
    if [[ ! -f "$poster" || "$dest" -nt "$poster" ]]; then
      ffmpeg -y -loglevel error -i "$dest" -frames:v 1 -q:v 3 "$poster" </dev/null 2>/dev/null \
        && printf "  %-14s poster\n" ""
    fi
  fi
done

echo "  ---------------------------------------------------------------"
if [[ $have_ffmpeg -eq 0 ]]; then
  echo "  note: ffmpeg not found — no poster frames cut (films still work)."
fi
if [[ $missing -gt 0 ]]; then
  echo "  !! $missing film(s) missing. The kiosk will still run: a product with"
  echo "     no film goes straight to its signup QR instead of a black screen."
else
  echo "  All five films present."
fi
echo
ls -la "$MEDIA"/*.mp4 2>/dev/null | awk '{printf "     %-10s %s\n", $5, $9}'
echo
