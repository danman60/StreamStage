#!/usr/bin/env bash
# preflight.sh — ONE command, on the morning of the show. Booth + decks + the live demo.
#
#   tests/preflight.sh                 check everything, change nothing
#   tests/preflight.sh --reset-demo    also restore the demo knowledge base to its seeds
#   BOOTH_HOST=192.168.5.22 tests/preflight.sh    skip discovery, check that address
#
# Exits non-zero if anything is wrong, so you never have to read it carefully to know.
# It NEVER writes to the booth and never texts or emails anyone. The only thing that
# changes anything is --reset-demo, which restores the DEMO tenant's seeds. That tenant
# is not a customer.
#
# Existing pieces this drives rather than duplicates:
#   tools/booth-lan.sh          answers "what address today"  (kiosk UDP beacon)
#   expo-assets/kiosk/preflight.sh   the booth-laptop checks that already existed
#   studiosage.ai/api/demo/preflight the 8 live-demo checks that already existed
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RESET_DEMO=0
[ "${1:-}" = "--reset-demo" ] && RESET_DEMO=1

FAILED=0
ok()   { printf '  \033[32mOK\033[0m    %s\n' "$*"; }
warn() { printf '  \033[33mWATCH\033[0m %s\n' "$*"; }
bad()  { printf '  \033[31mNO\033[0m    %s\n' "$*"; FAILED=1; }
sec()  { printf '\n\033[1m%s\033[0m\n' "$*"; }

echo "=================================================================="
echo "  STREAMSTAGE SHOW PREFLIGHT   $(date '+%a %d %b %Y, %H:%M %Z')"
echo "=================================================================="

# ---------------------------------------------------------------- 1. the address
sec "Where the booth is today"
if LAN="$(BOOTH_HOST="${BOOTH_HOST:-}" "$REPO/tools/booth-lan.sh" 2>/dev/null)"; then
  eval "$LAN"
  ok "$BOOTH_HOST  (via $BOOTH_SOURCE)"
  ok "kiosk $BOOTH_HOST:$KIOSK_PORT · telemetry :$TELEMETRY_PORT · presenter :$PRESENTER_PORT"
else
  bad "No booth found. Start it (decks/START-BOOTH.bat on DART) or set BOOTH_HOST=<ip>."
  BOOTH_HOST=""; KIOSK_PORT=8080; PRESENTER_PORT=8090
fi

# ---------------------------------------------------------------- 2. the booth laptop
if [ -n "$BOOTH_HOST" ]; then
  sec "The booth (delegating to expo-assets/kiosk/preflight.sh)"
  if "$REPO/expo-assets/kiosk/preflight.sh" "$BOOTH_HOST:$KIOSK_PORT" >/tmp/pf-kiosk.$$ 2>&1; then
    ok "kiosk preflight passed  (full output: /tmp/pf-kiosk.$$)"
  else
    # One failure is expected FROM THIS MACHINE and is not a booth problem: SPYBALLOON's
    # INPUT policy is DROP, so it cannot hear the UDP beacon that the tablet and phone
    # hear fine. Don't let that mark the whole show red.
    # Strip ANSI first — the marker is "\033[31mNO\033[0m", so a plain grep for "NO " finds
    # nothing and every failure silently looks like zero failures.
    PLAIN="$(sed 's/\x1b\[[0-9;]*m//g' /tmp/pf-kiosk.$$ 2>/dev/null)"
    NOLINES="$(printf '%s\n' "$PLAIN" | grep -cE '^\s+NO\b' || true)"
    BEACONONLY="$(printf '%s\n' "$PLAIN" | grep -E '^\s+NO\b' | grep -c 'UDP 45454' || true)"
    if [ "$NOLINES" = "1" ] && [ "$BEACONONLY" = "1" ]; then
      warn "kiosk is fine; the only failure is the beacon, which THIS machine cannot hear (INPUT DROP)."
      warn "  Confirm from the tablet or phone instead — they are not behind that firewall."
    else
      bad "kiosk preflight FAILED — read /tmp/pf-kiosk.$$"
      grep -E 'NO |WATCH' /tmp/pf-kiosk.$$ | head -n 8 | sed 's/^/        /'
    fi
  fi
fi

# ---------------------------------------------------------------- 3. the decks
sec "The decks"
if [ -n "$BOOTH_HOST" ]; then
  P="http://$BOOTH_HOST:$PRESENTER_PORT"
  ST="$(curl -s -m 6 "$P/state" 2>/dev/null)"
  if [ -z "$ST" ]; then
    bad "Presenter is not answering on $P. Double-click start-presenter.bat on DART."
  else
    TOT="$(echo "$ST" | python3 -c "import sys,json;print(json.load(sys.stdin).get('total','?'))" 2>/dev/null)"
    STALE="$(echo "$ST" | python3 -c "import sys,json;print(json.load(sys.stdin).get('stale') or '')" 2>/dev/null)"
    case "$TOT" in
      32|27) ok "presenter is serving a shipping deck ($TOT slides)" ;;
      0|'?') warn "presenter is up but no deck has reported in yet — open a deck on DART" ;;
      *)     bad "presenter reports $TOT slides. 32 = talk 2, 27 = talk 1. Anything else is a retired deck." ;;
    esac
    [ -n "$STALE" ] && bad "STALE DECK ALARM: $STALE"
    for d in talk1-deck.html talk2-deck.html; do
      C="$(curl -s -m 6 -o /dev/null -w '%{http_code}' "$P/$d")"
      [ "$C" = "200" ] && ok "$d serves ($C)" || bad "$d does not serve ($C)"
    done
  fi
fi

# ---------------------------------------------------------------- 4. the facelift reveal
sec "The facelift reveal"
if [ -n "$BOOTH_HOST" ]; then
  FLF="$(mktemp)"; curl -s -m 6 "http://$BOOTH_HOST:$PRESENTER_PORT/facelift" -o "$FLF" 2>/dev/null
  if [ ! -s "$FLF" ]; then
    warn "no /facelift on the presenter (old build?)"
  else
    # NOTE: a heredoc IS stdin, so this cannot also be fed by a pipe. Pass the file.
    python3 - "$FLF" <<'PY'
import sys, json, time
f = json.load(open(sys.argv[1]))
st = f.get("status", "?")
age = int(time.time()) - int(f.get("updated_at") or 0) if f.get("updated_at") else None
if st == "idle":
    print("  \033[32mOK\033[0m    idle — nothing stale is armed. Plant a fresh url on stage.")
elif st == "ready":
    mins = (age // 60) if age is not None else "?"
    print(f"  \033[33mWATCH\033[0m a build from {mins} min ago is armed ({f.get('url','?')}).")
    print("        Fine if that is today's. If not, hit Reset run before you go up.")
elif st == "stale":
    print("  \033[32mOK\033[0m    a stale build is on disk and the deck will IGNORE it (falls back). " )
    print("        " + (f.get("error") or "")[:90])
elif st in ("running", "queued"):
    print(f"  \033[33mWATCH\033[0m a build is in flight ({f.get('stage','')[:40]}).")
else:
    print(f"  \033[33mWATCH\033[0m status={st}: {(f.get('error') or '')[:80]}")
PY
  fi
fi

# ---------------------------------------------------------------- 5. the live demo
sec "The StudioSage live demo"
TOKEN="${DEMO_RESET_TOKEN:-}"
if [ -z "$TOKEN" ] && [ -f "$HOME/.env.keys" ]; then
  TOKEN="$(grep -m1 '^DEMO_RESET_TOKEN=' "$HOME/.env.keys" 2>/dev/null | cut -d= -f2- | tr -d '"')"
fi
if [ -z "$TOKEN" ]; then
  warn "DEMO_RESET_TOKEN not set, so the 8 live-demo checks were skipped."
  warn "  Get it: cd ~/projects/StudioSage && vercel env pull --environment=production <file>"
else
  if [ "$RESET_DEMO" = 1 ]; then
    R="$(curl -s -m 45 -X POST "https://www.studiosage.ai/api/demo/reset" \
         -H "x-demo-token: $TOKEN" -H 'content-type: application/json' \
         -d '{"seeds":true}' 2>/dev/null)"
    echo "$R" | grep -qiE '"(ok|success)"\s*:\s*true|seeded' \
      && ok "demo knowledge base reset to its seeds" \
      || bad "demo reset did not confirm: $(echo "$R" | head -c 120)"
  fi
  DF="$(mktemp)"
  curl -s -m 40 "https://www.studiosage.ai/api/demo/preflight" -H "x-demo-token: $TOKEN" -o "$DF"
  python3 - "$DF" <<'PY'
import sys, json
try:
    d = json.load(open(sys.argv[1]))
except Exception:
    print("  \033[31mNO\033[0m    live-demo preflight did not answer"); sys.exit(2)
colour = {"pass": "\033[32mOK\033[0m   ", "warn": "\033[33mWATCH\033[0m", "fail": "\033[31mNO\033[0m   "}
worst = 0
for c in d.get("checks", []):
    s = c.get("status", "fail")
    worst = max(worst, {"pass": 0, "warn": 1, "fail": 2}[s])
    print(f"  {colour.get(s, s)} {c['id']:<16} {c.get('detail','')[:78]}")
print(f"  ---   wall: studiosage.ai/demo/wall?code={d.get('share_code','?')}"
      f"  ·  text {d.get('demo_number','?')}  ·  forward to {d.get('ingest_address','?')}")
sys.exit(2 if worst == 2 else 0)
PY
  [ $? -eq 2 ] && FAILED=1
fi

# ---------------------------------------------------------------- 6. what to open
sec "What to open"
if [ -n "$BOOTH_HOST" ]; then
  echo "  TV          http://$BOOTH_HOST:$KIOSK_PORT/tv"
  echo "  tablet      http://$BOOTH_HOST:$KIOSK_PORT/tablet"
  echo "  phone       http://$BOOTH_HOST:$PRESENTER_PORT/remote"
fi

echo
if [ "$FAILED" = 0 ]; then
  printf '\033[32m  PREFLIGHT PASSED\033[0m\n\n'
else
  printf '\033[31m  PREFLIGHT FAILED — read the NO lines above\033[0m\n\n'
fi
exit "$FAILED"
