#!/usr/bin/env bash
# Re-encode every video talk1-deck.html plays, for SMOOTH PLAYBACK on DART's Chrome.
#
# Why: on 2026-08-11, robot-wall.mp4 (1080p / 2.6 Mbps / 15 MB) froze on slide 1 of talk 2 on this
# exact laptop; the 720p / 1.2 Mbps replacement plays. So the target is "comfortably under the one
# profile we have measured failing", not "as close to it as we dare".
#
# Daniel's call 2026-08-11: it is a projector, so smooth beats sharp. Everything is capped into a
# 1280x720 box (never upscaled), bitrate-capped, and given frequent keyframes so the scrubber on
# slides 14/17 seeks instantly.
#
# Sources from _orig/ when a master exists -- encoding from the master gives better quality at a
# low bitrate than re-compressing the already-compressed delivery file.
#
# Output filenames are UNCHANGED, into a separate folder, so nothing in the deck HTML has to be
# edited. See DEPLOY note at the bottom.

set -uo pipefail

SRC="$HOME/projects/StudioSage/live-demo/videos"
OUT="$SRC-lite"
LIST="${1:?usage: encode-talk1-lite.sh <file-with-one-filename-per-line>}"

mkdir -p "$OUT"

# Cap into a 1280x720 box, preserve aspect, never upscale, keep dimensions even (yuv420p needs it).
FIT="scale=w=trunc(min(1\,min(1280/iw\,720/ih))*iw/2)*2:h=trunc(min(1\,min(1280/iw\,720/ih))*ih/2)*2"

total=$(wc -l < "$LIST"); n=0
printf '%s  starting %s files -> %s\n' "$(date '+%H:%M:%S')" "$total" "$OUT"

while read -r f; do
  [ -z "$f" ] && continue
  n=$((n+1))
  # prefer the pre-compression master
  in="$SRC/_orig/$f"; tier=master
  [ -f "$in" ] || { in="$SRC/$f"; tier=delivery; }
  [ -f "$in" ] || { printf '  !! %-30s NO SOURCE\n' "$f"; continue; }

  # kiosk-testimonials is a dimmed full-bleed background wall (opacity .62), never looked at
  # directly, and is the single biggest file in the deck -- it can take a harder squeeze.
  case "$f" in
    kiosk-testimonials.mp4) crf=28; maxrate=900k;  bufsize=1800k ;;
    *)                      crf=25; maxrate=1400k; bufsize=2800k ;;
  esac

  # keep audio only where the source actually has some
  if ffprobe -v error -select_streams a -show_entries stream=codec_name -of csv=p=0 "$in" 2>/dev/null | grep -q .; then
    aud=(-c:a aac -b:a 96k -ac 2)
  else
    aud=(-an)
  fi

  ffmpeg -nostdin -y -v error -i "$in" \
    -vf "$FIT" \
    -c:v libx264 -preset slow -profile:v high -level 4.0 -pix_fmt yuv420p \
    -crf "$crf" -maxrate "$maxrate" -bufsize "$bufsize" \
    -g 60 -keyint_min 60 -sc_threshold 0 \
    "${aud[@]}" -movflags +faststart \
    "$OUT/$f" 2>>"$OUT/_encode-errors.log"

  if [ -f "$OUT/$f" ]; then
    ob=$(stat -c%s "$in"); nb=$(stat -c%s "$OUT/$f")
    printf '  %2d/%d %-30s %-8s %6.1fMB -> %5.1fMB  (%d%%)\n' \
      "$n" "$total" "$f" "$tier" \
      "$(echo "scale=2;$ob/1048576"|bc)" "$(echo "scale=2;$nb/1048576"|bc)" \
      "$(( nb*100/ob ))"
  else
    printf '  %2d/%d %-30s FAILED (see _encode-errors.log)\n' "$n" "$total" "$f"
  fi
done < "$LIST"

printf '%s  done. total: %s\n' "$(date '+%H:%M:%S')" "$(du -sh "$OUT" | cut -f1)"

# DEPLOY (not done by this script, and not to be done while the deck tab is open):
#   Windows will not let you overwrite an mp4 Chrome currently holds open -- that is what forced
#   the robot-wall-lite.mp4 rename this morning. Close the deck tab on DART first, then copy.
#   Filenames are identical, so talk1-deck.html needs no edit.
