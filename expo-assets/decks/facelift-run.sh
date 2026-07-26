#!/usr/bin/env bash
# facelift-run.sh <url> <rundir>
#
# Unattended driver for the on-stage "website facelift" reveal.
# Launched by presenter-server.py when Daniel types a url into the phone remote.
#
# Contract with the server:
#   - everything it needs is in <rundir>/status.json  (status/stage/url/…)
#   - the revealable build ends up in <rundir>/site/index.html
#   - anything printed here lands in <rundir>/runner.log
#
# Status values: queued -> running -> ready | failed
#
# Deploy policy: OFF by default. The block-deploy hook gates Vercel pushes, and
# nobody approved an unattended push, so the default reveal is served LOCALLY off
# this laptop (which is also the failure-proof path at a venue with bad wifi).
# Set FACELIFT_DEPLOY_OK=1 in the environment to let the run also publish to the
# client-demos project. Working-and-local beats broken-and-hosted.
set -uo pipefail

URL="${1:-}"
RUNDIR="${2:-}"
[ -n "$URL" ] && [ -n "$RUNDIR" ] || { echo "usage: facelift-run.sh <url> <rundir>"; exit 2; }

STATUS="$RUNDIR/status.json"
SITE="$RUNDIR/site"
CLIENT_DEMOS="$HOME/projects/client-demos/clients"
FALLBACK="$(cd "$(dirname "$0")" && pwd)/facelift-fallback"
START_TS=$(date +%s)

say() {   # say <status> <stage> [error]
  python3 - "$STATUS" "$URL" "$1" "$2" "${3:-}" "$START_TS" <<'PY'
import json,sys,time
path,url,status,stage,err,started=sys.argv[1:7]
try:
    cur=json.load(open(path))
except Exception:
    cur={}
cur.update({"url":url,"status":status,"stage":stage,"error":err,
            "started_at":int(started),"updated_at":int(time.time())})
json.dump(cur,open(path,"w"))
PY
  echo "[$(date '+%H:%M:%S')] $1 · $2 ${3:-}"
}

publish_site() {   # publish_site <dir>
  rm -rf "$SITE.tmp"
  mkdir -p "$SITE.tmp"
  cp -r "$1/." "$SITE.tmp/" || return 1
  rm -rf "$SITE"
  mv "$SITE.tmp" "$SITE"
  [ -f "$SITE/index.html" ]
}

say running "starting"

# ---------------------------------------------------------------------------
# Rehearsal mode: prove the phone -> server -> deck plumbing in ~20s without
# burning a 75-minute real run. FACELIFT_FAKE=1 ./facelift-run.sh <url> <dir>
# ---------------------------------------------------------------------------
if [ "${FACELIFT_FAKE:-}" = "1" ]; then
  say running "scraping (rehearsal)";  sleep 5
  say running "building (rehearsal)";  sleep 5
  say running "qa (rehearsal)";        sleep 5
  if publish_site "$FALLBACK"; then
    say ready "rehearsal build served locally"
    exit 0
  fi
  say failed "rehearsal" "could not stage the fallback site"
  exit 1
fi

# ---------------------------------------------------------------------------
# Real run: hand the url to the facelift skill in a headless Claude session.
# ---------------------------------------------------------------------------
PROMPT_FILE="$RUNDIR/prompt.txt"
DEPLOY_LINE="DO NOT deploy and DO NOT push anything. Publishing was not approved for this run."
if [ "${FACELIFT_DEPLOY_OK:-}" = "1" ]; then
  DEPLOY_LINE="Deploying to the client-demos project IS approved for this run (use the DEPLOY_OK=1 prefix the skill documents). Put the resulting live url in status.json as deployed_url."
fi

cat > "$PROMPT_FILE" <<EOF
facelift $URL

Operator instructions for this run (it is driving a LIVE stage reveal, so read these first):
- Run the facelift skill exactly as written, fully autonomous. Ask nothing. Take the documented
  fallback for anything missing and keep going.
- $DEPLOY_LINE
- The reveal is served off this laptop, so the FINAL build MUST be copied to:
      $SITE
  index.html plus its assets, relative paths only. Do that as soon as the build passes QA —
  before any deploy step — so a deploy problem can never cost us the reveal.
- Keep $STATUS updated as you go. It is a JSON object; preserve the existing keys and set:
      {"status":"running","stage":"<scrape|brand|build|qa|deploy>"}
  and at the end either {"status":"ready","stage":"done"} or {"status":"failed","error":"<why>"}.
  Write it with a tiny python/jq one-liner, not by hand-editing over the top of it.
- Budget: the reveal happens ~75 minutes after this starts. If you are running long, ship the
  strongest thing you have at the 60-minute mark rather than polishing.
EOF

say running "claude session starting"

# --dangerously-skip-permissions: unattended run, nobody at the keyboard to
# answer prompts. PreToolUse hooks (including the deploy gate) still apply.
claude --dangerously-skip-permissions -p "$(cat "$PROMPT_FILE")" \
  >> "$RUNDIR/claude.log" 2>&1
RC=$?
echo "claude exited rc=$RC"

# ---------------------------------------------------------------------------
# Belt and braces: if the session never copied the build, go find it. A site
# that exists but wasn't copied is a copy problem, not a failed facelift.
# ---------------------------------------------------------------------------
if [ ! -f "$SITE/index.html" ]; then
  say running "recovering the build"
  # Look in every place the skill is known to leave a finished build, newest
  # first. client-demos only gets populated when a deploy was approved, so the
  # scaffold dirs (~/projects/<Client>/mock, <name>site) matter MORE on the
  # default no-deploy path, not less.
  CANDIDATE=$(find "$CLIENT_DEMOS" -mindepth 1 -maxdepth 1 -type d \
                   -newermt "@$START_TS" -exec test -f '{}/index.html' \; -print 2>/dev/null |
              head -1)
  if [ -z "$CANDIDATE" ]; then
    CANDIDATE=$(find "$HOME/projects" -mindepth 2 -maxdepth 3 -name index.html \
                     -newermt "@$START_TS" -not -path '*/node_modules/*' \
                     -not -path '*/scrape/*' -printf '%T@ %h\n' 2>/dev/null |
                sort -rn | head -1 | cut -d' ' -f2-)
  fi
  if [ -n "$CANDIDATE" ] && [ -f "$CANDIDATE/index.html" ]; then
    publish_site "$CANDIDATE" && say ready "recovered from $CANDIDATE" && exit 0
  fi
fi

if [ -f "$SITE/index.html" ]; then
  say ready "done"
  exit 0
fi

say failed "done" "no build produced (claude rc=$RC) — reveal the pre-baked fallback instead"
exit 1
