#!/usr/bin/env bash
#
# Publish the booth films to Cloudflare R2 so a Fire Stick can update itself over the internet.
#
#   ./tools/publish-films.sh
#
# That is the whole common case. No arguments.
#
# What it does, in order:
#   1. Reads the SAME films the kiosk serves: expo-assets/kiosk/media/*.mp4. There is one media
#      set, not a publish copy that can drift out of sync with the booth.
#   2. Works out which films actually changed (sha256), and uploads ONLY those.
#   3. Writes booth/manifest.json listing every film with its sha256 and byte size, so the stick
#      can refuse a half-downloaded file instead of playing a corrupt one.
#   4. Re-fetches everything over the PUBLIC https URL and checks it. It never assumes an upload
#      worked because rclone exited 0.
#
# Safety rules baked in:
#   - Nothing is ever deleted from R2 unless you pass --prune. A film vanishing from the bucket
#     while a stick is mid-update is the one unrecoverable outcome, so it takes a deliberate flag.
#   - Credentials are never written into this repo. They come from the rclone "r2:" remote that
#     is already configured on this machine, or from ~/.env.keys as a fallback.
#   - The booth films live under the booth/ prefix. The marketing site's videos are under
#     streamstage/ and are never touched.
#
# Options (you will rarely need these):
#   --dry-run     say what would happen, upload nothing
#   --force       re-upload every film even if it is unchanged
#   --prune       delete files in booth/ on R2 that are no longer in the local media folder
#   --media DIR   publish from somewhere other than expo-assets/kiosk/media
#   --prefix P    publish under a prefix other than booth/  (used by the test harness)
#
set -euo pipefail

BUCKET="streamstagesite"
PREFIX="booth"
PUBLIC_BASE="https://pub-626d1637ca4c4f34a7916019aaa3efce.r2.dev"
REMOTE="r2"

DRY_RUN=0
FORCE=0
PRUNE=0
SRC=""

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --force)   FORCE=1 ;;
    --prune)   PRUNE=1 ;;
    --media)   SRC="${2:?--media needs a directory}"; shift ;;
    --prefix)  PREFIX="${2:?--prefix needs a value}"; shift ;;
    -h|--help) sed -n '2,40p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $1  (try --help)" >&2; exit 2 ;;
  esac
  shift
done

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[ -n "$SRC" ] || SRC="${MEDIA_SRC:-$HERE/../../expo-assets/kiosk/media}"

# ---------------------------------------------------------------- helpers

say() { printf '%s\n' "$*"; }
hr()  { printf '%s\n' "------------------------------------------------------------------------"; }

human() { # bytes -> "36.9 MB"
  awk -v b="$1" 'BEGIN{
    if (b>=1073741824) printf "%.1f GB", b/1073741824;
    else if (b>=1048576) printf "%.1f MB", b/1048576;
    else if (b>=1024) printf "%.1f KB", b/1024;
    else printf "%d B", b;
  }'
}

die() { say ""; say "STOPPED: $*"; exit 1; }

need() { command -v "$1" >/dev/null 2>&1 || die "'$1' is not installed on this machine."; }

# ---------------------------------------------------------------- preflight

need rclone; need jq; need curl; need sha256sum; need awk

[ -d "$SRC" ] || die "the media folder does not exist: $SRC
  Set MEDIA_SRC=/path/to/media, or pass --media /path/to/media."
SRC="$(cd "$SRC" && pwd)"

# Credentials. Prefer the already-configured rclone remote; fall back to ~/.env.keys.
# Either way nothing secret is printed and nothing is written into the repo.
CRED_SOURCE="rclone remote '$REMOTE:'"
if ! rclone listremotes 2>/dev/null | grep -qx "$REMOTE:"; then
  if [ -f "$HOME/.env.keys" ]; then
    # shellcheck disable=SC1090,SC1091
    set +u; . "$HOME/.env.keys" >/dev/null 2>&1 || true; set -u
  fi
  : "${CLOUDFLARE_R2_ACCESS_KEY:=}"; : "${CLOUDFLARE_R2_SECRET_KEY:=}"; : "${CLOUDFLARE_R2_ENDPOINT:=}"
  [ -n "$CLOUDFLARE_R2_ACCESS_KEY" ] && [ -n "$CLOUDFLARE_R2_SECRET_KEY" ] && [ -n "$CLOUDFLARE_R2_ENDPOINT" ] \
    || die "no rclone remote called '$REMOTE:' and no R2 keys in ~/.env.keys.
  Run 'rclone config' and add an s3 remote named r2 (provider Cloudflare)."
  REMOTE="r2env"
  export RCLONE_CONFIG_R2ENV_TYPE=s3
  export RCLONE_CONFIG_R2ENV_PROVIDER=Cloudflare
  export RCLONE_CONFIG_R2ENV_ACCESS_KEY_ID="$CLOUDFLARE_R2_ACCESS_KEY"
  export RCLONE_CONFIG_R2ENV_SECRET_ACCESS_KEY="$CLOUDFLARE_R2_SECRET_KEY"
  export RCLONE_CONFIG_R2ENV_ENDPOINT="$CLOUDFLARE_R2_ENDPOINT"
  CRED_SOURCE="~/.env.keys (rclone remote '$REMOTE:' was not configured)"
fi

DEST="$REMOTE:$BUCKET/$PREFIX"
PUB="$PUBLIC_BASE/$PREFIX"

shopt -s nullglob
FILES=("$SRC"/*.mp4)
shopt -u nullglob
[ ${#FILES[@]} -gt 0 ] || die "there are no .mp4 files in $SRC"

TOTAL_LOCAL=0
for f in "${FILES[@]}"; do TOTAL_LOCAL=$(( TOTAL_LOCAL + $(stat -c %s "$f") )); done

say "Booth film publish  —  local media  ->  Cloudflare R2"
hr
say "Films from : $SRC"
say "             ${#FILES[@]} films, $(human "$TOTAL_LOCAL") on disk"
say "Uploads to : $DEST/"
say "Public URL : $PUB/"
say "Credentials: $CRED_SOURCE"
[ "$DRY_RUN" = 1 ] && say "MODE       : dry run — nothing will be uploaded"
say ""

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# ---------------------------------------------------------------- what is published now

say "Looking at what is already published..."
PREV_MANIFEST="$WORK/prev.json"
if rclone cat "$DEST/manifest.json" >"$PREV_MANIFEST" 2>"$WORK/cat.err" && jq -e . "$PREV_MANIFEST" >/dev/null 2>&1; then
  PREV_VERSION="$(jq -r '.version // 0' "$PREV_MANIFEST")"
  say "  found a manifest from $(jq -r '.updated // "an unknown time"' "$PREV_MANIFEST") (version $PREV_VERSION, $(jq -r '.films|length' "$PREV_MANIFEST") films)"
else
  echo '{"version":0,"films":[]}' >"$PREV_MANIFEST"
  PREV_VERSION=0
  say "  nothing published yet under $PREFIX/ — this is the first publish"
fi

# Sizes of the objects actually sitting in the bucket. A manifest that claims a film is published
# is not proof the object is there, or that it is the right length.
REMOTE_LS="$WORK/remote.json"
rclone lsjson "$DEST" >"$REMOTE_LS" 2>/dev/null || echo '[]' >"$REMOTE_LS"
remote_size() { jq -r --arg n "$1" '(.[]|select(.Name==$n)|.Size) // -1' "$REMOTE_LS" | head -1; }

# ---------------------------------------------------------------- decide

say ""
say "Checking each film (reading it to compute its sha256, so this takes a moment)..."
say ""

IDS=(); FILESN=(); BYTES=(); SHAS=(); ACTION=(); REASON=(); UPDATED=()
TO_UPLOAD=0; UPLOAD_BYTES=0; NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

for f in "${FILES[@]}"; do
  name="$(basename "$f")"
  id="${name%.mp4}"
  b="$(stat -c %s "$f")"
  s="$(sha256sum "$f" | cut -d' ' -f1)"

  prev_sha="$(jq -r --arg i "$id" '(.films[]?|select(.id==$i)|.sha256) // ""' "$PREV_MANIFEST")"
  prev_upd="$(jq -r --arg i "$id" '(.films[]?|select(.id==$i)|.updated) // ""' "$PREV_MANIFEST")"
  rsize="$(remote_size "$name")"

  if [ "$FORCE" = 1 ]; then
    a="UPLOAD"; r="--force was given"
  elif [ -z "$prev_sha" ]; then
    a="UPLOAD"; r="never published before"
  elif [ "$prev_sha" != "$s" ]; then
    a="UPLOAD"; r="the film changed since the last publish"
  elif [ "$rsize" = "-1" ]; then
    a="UPLOAD"; r="the manifest lists it but the file is missing from R2"
  elif [ "$rsize" != "$b" ]; then
    a="UPLOAD"; r="the copy on R2 is $(human "$rsize"), should be $(human "$b")"
  else
    a="SKIP"; r="already published, sha256 matches"
  fi

  if [ "$a" = "UPLOAD" ]; then
    TO_UPLOAD=$((TO_UPLOAD+1)); UPLOAD_BYTES=$((UPLOAD_BYTES+b)); u="$NOW"
  else
    u="${prev_upd:-$NOW}"
  fi

  IDS+=("$id"); FILESN+=("$name"); BYTES+=("$b"); SHAS+=("$s")
  ACTION+=("$a"); REASON+=("$r"); UPDATED+=("$u")
  printf '  %-28s %10s  %-6s %s\n' "$name" "$(human "$b")" "$a" "$r"
done

say ""
if [ "$TO_UPLOAD" -eq 0 ]; then
  say "Nothing to upload — all ${#FILES[@]} films are already on R2 and match byte for byte."
else
  say "$TO_UPLOAD of ${#FILES[@]} films need uploading ($(human "$UPLOAD_BYTES")). The rest are skipped."
fi

# ---------------------------------------------------------------- upload

if [ "$DRY_RUN" = 0 ] && [ "$TO_UPLOAD" -gt 0 ]; then
  say ""
  for i in "${!IDS[@]}"; do
    [ "${ACTION[$i]}" = "UPLOAD" ] || continue
    printf '  uploading %s (%s)... ' "${FILESN[$i]}" "$(human "${BYTES[$i]}")"
    t0=$(date +%s)
    if rclone copyto "$SRC/${FILESN[$i]}" "$DEST/${FILESN[$i]}" \
         --s3-chunk-size 32M --transfers 1 --retries 3 >"$WORK/up.log" 2>&1; then
      say "done in $(( $(date +%s) - t0 ))s"
    else
      say "FAILED"
      sed 's/^/    /' "$WORK/up.log" | tail -20
      die "the upload of ${FILESN[$i]} failed. Nothing was deleted; the previously published
  films are untouched and the stick is unaffected. Fix the network and run this again."
    fi
  done
fi

# ---------------------------------------------------------------- manifest

CHANGED=$([ "$TO_UPLOAD" -gt 0 ] && echo 1 || echo 0)
PREV_IDS="$(jq -r '[.films[]?.id]|sort|join(",")' "$PREV_MANIFEST")"
NOW_IDS="$(printf '%s\n' "${IDS[@]}" | sort | paste -sd, -)"
[ "$PREV_IDS" = "$NOW_IDS" ] || CHANGED=1

if [ "$CHANGED" = 1 ]; then VERSION=$((PREV_VERSION+1)); else VERSION=$PREV_VERSION; fi
[ "$VERSION" -ge 1 ] || VERSION=1

MANIFEST="$WORK/manifest.json"
{
  for i in "${!IDS[@]}"; do
    jq -nc --arg id "${IDS[$i]}" --arg file "${FILESN[$i]}" \
           --argjson bytes "${BYTES[$i]}" --arg sha "${SHAS[$i]}" --arg upd "${UPDATED[$i]}" \
           '{id:$id,file:$file,bytes:$bytes,sha256:$sha,updated:$upd}'
  done
} | jq -s --argjson v "$VERSION" --arg now "$NOW" --arg base "$PUB/" \
      '{version:$v, updated:$now, base:$base, films:.}' >"$MANIFEST"

say ""
if [ "$DRY_RUN" = 1 ]; then
  say "Dry run: would write manifest version $VERSION with ${#IDS[@]} films, then verify. Stopping here."
  exit 0
fi

# If the published manifest already says exactly this, leave it alone. A re-run with nothing
# changed should write nothing at all, not even 2 KB of JSON with a new timestamp on it.
SAME_MANIFEST=0
if [ "$PREV_VERSION" -ge 1 ] && \
   diff -q <(jq -S '{version,base,films}' "$PREV_MANIFEST" 2>/dev/null) \
           <(jq -S '{version,base,films}' "$MANIFEST") >/dev/null 2>&1; then
  SAME_MANIFEST=1
  cp "$PREV_MANIFEST" "$MANIFEST"   # keep the published timestamp; it is still the truth
fi

if [ "$SAME_MANIFEST" = 1 ]; then
  say "manifest.json is already correct (version $VERSION, ${#IDS[@]} films) — left untouched."
else
  printf 'Writing manifest.json (version %s, %s films)... ' "$VERSION" "${#IDS[@]}"
  rclone copyto "$MANIFEST" "$DEST/manifest.json" \
    --header-upload "Cache-Control: no-cache, max-age=0" >"$WORK/up.log" 2>&1 \
    || { say "FAILED"; sed 's/^/  /' "$WORK/up.log" | tail -20; \
         die "the films uploaded but the manifest did not. Run this again — nothing is broken,
  the stick simply will not see the new films until the manifest lands."; }
  say "done"
fi

# ---------------------------------------------------------------- extra files on R2

EXTRA=()
while read -r n; do
  [ -n "$n" ] || continue
  [ "$n" = "manifest.json" ] && continue
  found=0
  for x in "${FILESN[@]}"; do [ "$x" = "$n" ] && found=1 && break; done
  [ "$found" = 0 ] && EXTRA+=("$n")
done < <(jq -r '.[].Name' "$REMOTE_LS")

if [ ${#EXTRA[@]} -gt 0 ]; then
  say ""
  if [ "$PRUNE" = 1 ]; then
    say "Deleting ${#EXTRA[@]} file(s) on R2 that are no longer in the local media folder (--prune):"
    for n in "${EXTRA[@]}"; do
      printf '  deleting %s... ' "$n"
      if rclone deletefile "$DEST/$n" >/dev/null 2>&1; then say "gone"; else say "could not delete (left alone)"; fi
    done
  else
    say "These files are on R2 but not in your local media folder. They were LEFT ALONE:"
    for n in "${EXTRA[@]}"; do say "  $n"; done
    say "  (they are not in the manifest, so no stick will download them."
    say "   To actually delete them, re-run with --prune.)"
  fi
fi

# ---------------------------------------------------------------- verify over the public internet

say ""
hr
say "Verifying over the public internet — not trusting the upload."
say ""

fetch_total() { # url -> total byte length, via a 1-byte Range request
  local url="$1" hdr
  # "Content-Range: bytes 0-0/20070800" -> 20070800  (the total length, which is the point)
  hdr="$(curl -sS -m 45 -r 0-0 -D - -o /dev/null "$url" 2>/dev/null || true)"
  printf '%s' "$hdr" | tr -d '\r' | awk 'tolower($1)=="content-range:"{n=split($NF,a,"/"); print a[n]; exit}'
}

CB="$(date +%s)"
PUBMAN="$WORK/public-manifest.json"
MAN_OK=0
for attempt in 1 2 3 4; do
  if curl -fsS -m 45 -H 'Cache-Control: no-cache' "$PUB/manifest.json?cb=$CB.$attempt" -o "$PUBMAN" \
     && jq -e . "$PUBMAN" >/dev/null 2>&1; then MAN_OK=1; break; fi
  sleep 3
done

if [ "$MAN_OK" != 1 ]; then
  say "  manifest.json could NOT be fetched from $PUB/manifest.json"
  say ""
  say "The films may well be uploaded, but the stick cannot see them without the manifest."
  say "Check that this machine has internet, then run this command again. Re-running is safe:"
  say "it uploads only what is missing."
  exit 1
fi

if ! diff -q <(jq -S . "$MANIFEST") <(jq -S . "$PUBMAN") >/dev/null 2>&1; then
  say "  NOTE: the manifest served publicly is not byte-identical to the one just written."
  say "        Each film is still checked against the LOCAL file below, so this is only a warning"
  say "        (usually a stale cache — re-run in a minute if any row fails)."
fi

printf '  %-24s %12s %12s  %-8s %s\n' "film" "should be" "on R2" "sha256" "result"
printf '  %-24s %12s %12s  %-8s %s\n' "------------------------" "------------" "------------" "--------" "------"

FAILS=0
for i in "${!IDS[@]}"; do
  id="${IDS[$i]}"; name="${FILESN[$i]}"; b="${BYTES[$i]}"; s="${SHAS[$i]}"
  msha="$(jq -r --arg i "$id" '(.films[]?|select(.id==$i)|.sha256) // ""' "$PUBMAN")"
  mbytes="$(jq -r --arg i "$id" '(.films[]?|select(.id==$i)|.bytes) // -1' "$PUBMAN")"

  total=""
  for attempt in 1 2 3; do
    total="$(fetch_total "$PUB/$name?cb=$CB.$attempt")"
    [ -n "$total" ] && [ "$total" = "$b" ] && break
    sleep 2
  done

  shaflag="ok"; result="OK"
  if [ "$msha" != "$s" ];      then shaflag="MISMATCH"; result="FAIL — manifest sha256 is not the local film's"; fi
  if [ "$mbytes" != "$b" ];    then result="FAIL — manifest says $mbytes bytes, the film is $b"; fi
  if [ -z "$total" ];          then result="FAIL — the file did not answer on the public URL"; fi
  if [ -n "$total" ] && [ "$total" != "$b" ]; then result="FAIL — R2 is serving $total bytes, should be $b"; fi

  [ "${result#FAIL}" = "$result" ] || FAILS=$((FAILS+1))
  printf '  %-24s %12s %12s  %-8s %s\n' "$name" "$b" "${total:-none}" "$shaflag" "$result"
done

say ""
hr
if [ "$FAILS" -eq 0 ]; then
  say "All ${#IDS[@]} films verified over the public internet. Manifest version $VERSION is live."
  say ""
  say "  Manifest : $PUB/manifest.json"
  if [ "$TO_UPLOAD" -eq 0 ]; then
    say "  Uploaded : nothing — everything was already published and matched"
  else
    say "  Uploaded : $TO_UPLOAD film(s), $(human "$UPLOAD_BYTES")"
  fi
  say ""
  say "On the Fire Stick: press MENU, choose \"Update films\", press Update."
  say "If the stick has no network it just keeps playing what is on its disk. Nothing breaks."
  exit 0
else
  say "$FAILS of ${#IDS[@]} films FAILED verification. The manifest is live but at least one film"
  say "on R2 does not match what the stick will be told to expect."
  say ""
  say "Do NOT press Update on the stick yet — it will refuse the bad file anyway, but there is"
  say "no point. The booth keeps playing what is on its disk either way."
  say ""
  say "What to do:"
  say "  1. Just run this command again. It re-uploads only the films that do not match."
  say "  2. Still failing on the same film? Check your internet, then run:"
  say "       $0 --force"
  say "  3. If a row says \"did not answer on the public URL\", R2 may need a minute to catch up."
  say "     Wait 60 seconds and run it again before doing anything else."
  exit 1
fi
