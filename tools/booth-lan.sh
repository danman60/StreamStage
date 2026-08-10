#!/usr/bin/env bash
# booth-lan.sh — answer "what address is the booth on today?" without anybody typing an IP.
#
# The venue LAN is new every morning, and DART's address has already moved once
# (192.168.0.13 -> 192.168.0.11 on 2026-08-09, which is the FIRE TABLET's old address).
# So nothing downstream should ever hardcode an address again. This is the one place
# that answers the question, and everything else sources it.
#
#   eval "$(tools/booth-lan.sh)"      # sets BOOTH_HOST / KIOSK_PORT / TELEMETRY_PORT / PRESENTER_PORT
#   tools/booth-lan.sh --human        # same thing, readable
#
# Order of resolution:
#   1. $BOOTH_HOST if you set it (an override always wins — venue wifi can eat broadcast)
#   2. the kiosk's own UDP beacon on 45454 (expo-assets/kiosk/BEACON.md) — authoritative,
#      because `host` is what the server believes about itself
#   3. nothing: exits 1 and says so, rather than guessing an address that used to work
#
# The presenter runs on the SAME machine as the kiosk, so one discovery answers both.
set -uo pipefail

HUMAN=0
[ "${1:-}" = "--human" ] && HUMAN=1

PRESENTER_PORT="${PRESENTER_PORT:-8090}"

if [ -n "${BOOTH_HOST:-}" ]; then
  HOST="$BOOTH_HOST"
  # Do NOT assume the port. serve.py's built-in default is 8080, but the booth is
  # started by START-BOOTH.bat as `--port 8081`, so assuming the default told
  # preflight the booth was DEAD while it was serving perfectly on 8081 — a
  # false alarm at 8am, from a helper whose whole job is to stop people guessing.
  # Ask the machine instead: /health names its own port.
  if [ -n "${KIOSK_PORT:-}" ]; then
    KPORT="$KIOSK_PORT"
  else
    KPORT=""
    for p in 8081 8080 8082 8083 8084 8085; do
      if curl -s -m 2 "http://$HOST:$p/health" 2>/dev/null | grep -q '"ok"'; then
        KPORT="$p"; break
      fi
    done
    # Nothing answered. Report the documented port rather than an empty string so
    # the caller prints a usable address in its "start it" message.
    KPORT="${KPORT:-8081}"
  fi
  TPORT="${TELEMETRY_PORT:-$((KPORT + 1))}"
  SOURCE="BOOTH_HOST override"
else
  BEACON="$(python3 - <<'PY'
import json, socket, sys, time
# Listen for the kiosk beacon. 4s is two cadences plus slack; the beacon is every 2s.
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
try:
    s.bind(("", 45454))
except Exception as e:
    # A failed bind must NOT look like "no beacon" — that is how you spend an hour
    # blaming the kiosk for a port already held on this machine.
    sys.stderr.write("beacon: cannot bind udp 45454 here (%s)\n" % e)
    print("", end=""); sys.exit(0)
s.settimeout(4.0)
deadline = time.time() + 4.0
while time.time() < deadline:
    try:
        data, _ = s.recvfrom(2048)
    except Exception:
        break
    try:
        p = json.loads(data.decode("utf-8", "replace"))
    except Exception:
        continue
    # Rule 1 of BEACON.md: match on `ss` first, never parse before that check.
    if p.get("ss") != "kiosk":
        continue
    print("%s %s %s" % (p.get("host", ""), p.get("port", 8080), p.get("telemetryPort", "")))
    sys.exit(0)
print("", end="")
PY
)"
  if [ -n "$BEACON" ]; then
    HOST="$(echo "$BEACON" | awk '{print $1}')"
    KPORT="$(echo "$BEACON" | awk '{print $2}')"
    TPORT="$(echo "$BEACON" | awk '{print $3}')"
    SOURCE="kiosk beacon (udp 45454)"
  else
    HOST=""; SOURCE="nothing"
  fi
fi

if [ -z "${HOST:-}" ]; then
  DROPPY=""
  if command -v iptables >/dev/null 2>&1; then
    iptables -L INPUT -n 2>/dev/null | head -1 | grep -q "policy DROP" && DROPPY=1
  fi
  if [ "$HUMAN" = 1 ]; then
    echo "No booth found."
    echo "  The kiosk beacon was not heard in 4s and BOOTH_HOST is not set."
    if [ -n "$DROPPY" ]; then
      echo "  NOTE: this machine's INPUT policy is DROP, so it cannot hear ANY beacon —"
      echo "  that is a property of this box, not of the booth. The tablet, phone and"
      echo "  stick are not behind it and discover the kiosk normally."
      echo "  To listen from here: sudo ufw allow 45454/udp"
    else
      echo "  Either the kiosk is not running, or this network drops broadcast."
    fi
    echo "  Fix: start the booth (decks/START-BOOTH.bat on DART), or set it by hand:"
    echo "      export BOOTH_HOST=192.168.x.y"
  else
    echo "# no booth found; set BOOTH_HOST=<ip> and re-run" >&2
  fi
  exit 1
fi

[ -z "${TPORT:-}" ] && TPORT=$((KPORT + 1))

if [ "$HUMAN" = 1 ]; then
  echo "Booth found via $SOURCE"
  echo "  host          $HOST"
  echo "  kiosk         http://$HOST:$KPORT/tv    ·  http://$HOST:$KPORT/tablet"
  echo "  telemetry     http://$HOST:$TPORT"
  echo "  presenter     http://$HOST:$PRESENTER_PORT/remote"
else
  echo "export BOOTH_HOST='$HOST'"
  echo "export KIOSK_PORT='$KPORT'"
  echo "export TELEMETRY_PORT='$TPORT'"
  echo "export PRESENTER_PORT='$PRESENTER_PORT'"
  echo "export BOOTH_SOURCE='$SOURCE'"
fi
