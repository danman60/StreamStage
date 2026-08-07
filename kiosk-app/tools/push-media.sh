#!/usr/bin/env bash
#
# Push the booth films onto a Fire Stick / Android TV over adb.
#
# The films are NOT in this repo and never will be (~360 MB). They live in
# StreamStage/expo-assets/kiosk/media/, which is itself gitignored.
#
# Target is app-scoped external storage:
#   /sdcard/Android/data/com.streamstage.boothloop/files/media
# That path is writable by `adb push` with NO storage permission on every Android
# version, which is why it was chosen over /sdcard/Movies.
#
# Usage:
#   ./tools/push-media.sh                      # first/only device
#   ./tools/push-media.sh <adb-serial>         # e.g. 192.168.1.42:5555, emulator-5556
#
set -euo pipefail

PKG=com.streamstage.boothloop
DEST="/sdcard/Android/data/$PKG/files/media"
SRC="${MEDIA_SRC:-$(cd "$(dirname "$0")/../../expo-assets/kiosk/media" && pwd)}"

if [ $# -ge 1 ]; then ADB=(adb -s "$1"); else ADB=(adb); fi

if [ ! -d "$SRC" ]; then
  echo "ERROR: media source not found: $SRC" >&2
  echo "Set MEDIA_SRC=/path/to/media and re-run." >&2
  exit 1
fi

echo "Device : $("${ADB[@]}" shell getprop ro.product.model | tr -d '\r')"
echo "Source : $SRC"
echo "Dest   : $DEST"
echo

"${ADB[@]}" shell mkdir -p "$DEST"

shopt -s nullglob
files=("$SRC"/*.mp4)
if [ ${#files[@]} -eq 0 ]; then
  echo "ERROR: no .mp4 files in $SRC" >&2
  exit 1
fi

for f in "${files[@]}"; do
  echo "--> $(basename "$f") ($(du -h "$f" | cut -f1))"
  "${ADB[@]}" push "$f" "$DEST/" >/dev/null
done

# Optional explicit running order. Without this the app uses its built-in booth order
# (streamstage-services first, then the six product films) — see Playlist.kt.
if [ -f "$SRC/playlist.txt" ]; then
  echo "--> playlist.txt"
  "${ADB[@]}" push "$SRC/playlist.txt" "$DEST/" >/dev/null
fi

echo
echo "On device:"
"${ADB[@]}" shell ls -la "$DEST"
echo
echo "Done. Launch with:"
echo "  adb ${1:+-s $1} shell monkey -p $PKG -c android.intent.category.LAUNCHER 1"
