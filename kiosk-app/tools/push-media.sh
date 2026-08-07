#!/usr/bin/env bash
#
# Push the booth films onto a Fire Stick over adb, and grant the read permission.
#
# The films are NOT in this repo and never will be (~350 MB). They live in
# StreamStage/expo-assets/kiosk/media/, which is itself gitignored.
#
# TARGET PATH: /sdcard/Movies/StreamStageBooth
#
# An earlier version of this script pushed to app-private external storage
# (/sdcard/Android/data/com.streamstage.boothloop/files/media) and claimed in a comment that
# adb can always write there "on every Android version with no storage permission".
#
#   THAT CLAIM WAS WRONG. On Fire OS 8 it fails outright:
#     $ adb shell ls /sdcard/Android/data/
#     ls: /sdcard/Android/data/: Permission denied
#
# Verified on the real booth device — Fire TV Stick 4K Max 2nd gen (AFTKRT), Fire OS 8 /
# Android 11, API 30. Amazon locks /sdcard/Android/data/** down harder than stock Android 11.
# /sdcard/Movies/ and /sdcard/Download/ ARE freely adb-writable on the same device, so the
# films go to Movies and the app reads them with READ_EXTERNAL_STORAGE.
#
# Usage:
#   ./tools/push-media.sh                       # first/only device
#   ./tools/push-media.sh 192.168.0.199:5555    # the booth stick
#
set -euo pipefail

PKG=com.streamstage.boothloop
DEST="/sdcard/Movies/StreamStageBooth"
SRC="${MEDIA_SRC:-$(cd "$(dirname "$0")/../../expo-assets/kiosk/media" && pwd)}"

if [ $# -ge 1 ]; then ADB=(adb -s "$1"); else ADB=(adb); fi

if [ ! -d "$SRC" ]; then
  echo "ERROR: media source not found: $SRC" >&2
  echo "Set MEDIA_SRC=/path/to/media and re-run." >&2
  exit 1
fi

echo "Device : $("${ADB[@]}" shell getprop ro.product.model | tr -d '\r')"
echo "Fire OS: API $("${ADB[@]}" shell getprop ro.build.version.sdk | tr -d '\r')"
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

# Shared storage needs a read permission. This is a dedicated booth device we control, so
# grant it non-interactively rather than making someone accept a dialog with the remote.
echo
echo "Granting storage read permission..."
SDK=$("${ADB[@]}" shell getprop ro.build.version.sdk | tr -d '\r')
if [ "$SDK" -ge 33 ]; then
  PERM=android.permission.READ_MEDIA_VIDEO
else
  PERM=android.permission.READ_EXTERNAL_STORAGE
fi
if "${ADB[@]}" shell pm grant "$PKG" "$PERM" 2>&1 | grep -q .; then
  echo "  NOTE: 'pm grant $PERM' reported something — check it is installed and the name is right."
else
  echo "  granted: $PERM"
fi

echo
echo "On device:"
"${ADB[@]}" shell ls -la "$DEST"
echo
echo "Launch with:"
echo "  adb ${1:+-s $1} shell monkey -p $PKG -c android.intent.category.LAUNCHER 1"
