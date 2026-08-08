#!/usr/bin/env bash
# preflight.sh — "is the booth actually going to work in twenty minutes"
#
# One command, at 8am, with the coffee. It checks the things that have actually
# gone wrong before, says what it found in plain English, and EXITS NON-ZERO if
# anything is wrong — so you never have to read it carefully to know.
#
#   ./preflight.sh              check the kiosk on this laptop, port 8080
#   ./preflight.sh 8082         check a kiosk that fell forward to another port
#   ./preflight.sh 192.168.0.13:8080    check the booth laptop from somewhere else
#
# Green line = fine. Anything else = read that line, it says what to do.
# Needs nothing but curl and python3, both of which are already there.
set -uo pipefail

TARGET="${1:-8080}"
case "$TARGET" in
  *:*) HOST="${TARGET%%:*}"; PORT="${TARGET##*:}" ;;
  *)   HOST="127.0.0.1";     PORT="$TARGET" ;;
esac
BASE="http://$HOST:$PORT"
LOG="http://$HOST:$((PORT + 1))"
HERE="$(cd "$(dirname "${BASE_SOURCE:-${BASH_SOURCE[0]}}")" && pwd)"

FAILED=0
ok()   { printf '  \033[32mOK\033[0m    %s\n' "$*"; }
warn() { printf '  \033[33mWATCH\033[0m %s\n' "$*"; }
bad()  { printf '  \033[31mNO\033[0m    %s\n' "$*"; FAILED=1; }
head_() { printf '\n%s\n' "$*"; }

echo "=================================================================="
echo "  STREAMSTAGE BOOTH PREFLIGHT — $BASE"
echo "  $(date '+%a %d %b, %H:%M')"
echo "=================================================================="

# ---------------------------------------------------------------- 1. the server
head_ "The server"
HEALTH="$(curl -s -m 5 "$BASE/health" 2>/dev/null)"
if [ -z "$HEALTH" ]; then
  bad "Nothing is answering on $BASE."
  echo "        Start it:  python3 expo-assets/kiosk/serve.py"
  echo "        If it says it moved to another port, run:  ./preflight.sh <that port>"
  echo
  echo "  Stopped here — everything below needs the server."
  exit 1
fi

# One python pass over the health blob; everything after this reads its output.
eval "$(printf '%s' "$HEALTH" | python3 -c '
import json, sys
try:
    h = json.load(sys.stdin)
except Exception:
    print("PF_PARSE=bad"); sys.exit()
def q(v): return "\x27" + str(v).replace("\x27", "") + "\x27"
print("PF_PARSE=ok")
print("PF_IP=%s"        % q(h.get("ip", "?")))
print("PF_PID=%s"       % q(h.get("pid", "?")))
print("PF_UP=%s"        % q(h.get("uptimeS", "?")))
print("PF_STARTED=%s"   % q(h.get("startedAt", "?")))
print("PF_HASTV=%s"     % q(bool(h.get("hasTv"))))
print("PF_SUBS=%s"      % q(h.get("subscribers", 0)))
print("PF_WRITABLE=%s"  % q(bool(h.get("telemetryWritable"))))
print("PF_TDIR=%s"      % q(h.get("telemetryDir", "?")))
print("PF_SOURCE=%s"    % q(h.get("filmsSource", "?")))
print("PF_BEACON=%s"    % q(h.get("beaconPort") or 0))
print("PF_EXPECTED=%s"  % q(" ".join(h.get("expectedFilms") or [])))
print("PF_MISSING=%s"   % q(" ".join(h.get("missingFilms") or [])))
lf = h.get("leadFlush") or {}
print("PF_LQ=%s"        % q(lf.get("queued") if lf.get("queued") is not None else -1))
print("PF_LNOTE=%s"     % q(lf.get("note", "?")))
print("PF_EVENTS=%s"    % q(h.get("events", 0)))
')"

if [ "${PF_PARSE:-bad}" != "ok" ]; then
  bad "$BASE/health answered, but not with JSON. Something else is on this port."
  exit 1
fi

ok "Answering on $BASE — pid $PF_PID, up ${PF_UP}s (since $PF_STARTED)."
echo "        The address for the Fire Stick is:  http://$PF_IP:$PORT/tv"

if [ "$PF_HASTV" = "True" ]; then
  ok "A TV is talking to THIS server right now ($PF_SUBS screens on the stream)."
else
  warn "No TV is talking to this server yet. Normal before you open the TV page;"
  echo "        NOT normal once the big screen is up — then it means the TV is"
  echo "        pointed at a different server. Check the address on the Fire Stick."
fi

# ------------------------------------------------- 2. is there more than one?
head_ "Only one server?"
# Deliberately NOT `pgrep -f serve.py`: that also matches the shell that
# launched it and anything else whose command line merely contains the string
# (rangeserve.py, a grep, this script). Walk /proc instead and require argv[0]
# to be a python interpreter with an argument whose basename is exactly
# serve.py — which is the process, and only the process.
COPY_LIST="$(python3 -c '
import glob, os
for d in sorted(glob.glob("/proc/[0-9]*")):
    try:
        parts = [p.decode("utf-8", "replace") for p in open(d + "/cmdline", "rb").read().split(b"\0") if p]
    except OSError:
        continue
    if not parts or "python" not in os.path.basename(parts[0]):
        continue
    if any(os.path.basename(a) == "serve.py" for a in parts[1:]):
        print("%s  %s" % (d.rsplit("/", 1)[-1], " ".join(parts)))
' 2>/dev/null)"
COPIES="$(printf '%s' "$COPY_LIST" | grep -c . || true)"
if [ "$HOST" != "127.0.0.1" ]; then
  warn "Checking from another machine, so I cannot count copies on the laptop."
elif [ "$COPIES" -gt 1 ]; then
  bad "$COPIES copies of serve.py are running on this laptop."
  printf '%s\n' "$COPY_LIST" | sed 's/^/          /'
  echo "        Two servers split the booth in silence: a tap on one never reaches"
  echo "        a TV on the other, and both look healthy. Close all but one"
  echo "        (Ctrl-C in the extra window), then run this again."
elif [ "$COPIES" -eq 1 ]; then
  ok "One server, as it should be."
else
  warn "Could not find serve.py in the process list — is it running under another name?"
fi

# ------------------------------------------------------------- 3. the films
head_ "The films"
if [ "$PF_SOURCE" != "kiosk.js" ]; then
  warn "The film list came from the built-in fallback, not kiosk.js."
  echo "        Not fatal, but it means serve.py could not read CONFIG.products —"
  echo "        so a product added to kiosk.js would not be checked for here."
fi

N_OK=0; N_BAD=0
for FILM in $PF_EXPECTED; do
  # One request per film: a Range request that must come back 206. That single
  # answer proves three things at once — the file is there, it is served, and
  # seeking works. A 200 here is the failure that stops Safari-class clients
  # playing at all, and it looks completely fine in a browser address bar.
  CODE="$(curl -s -o /dev/null -m 8 -r 0-1023 -w '%{http_code}' "$BASE/media/$FILM.mp4" 2>/dev/null)"
  if [ "$CODE" = "206" ]; then
    N_OK=$((N_OK + 1))
    printf '  \033[32mOK\033[0m    %-22s served, and seeking works (206).\n' "$FILM"
  elif [ "$CODE" = "200" ]; then
    N_BAD=$((N_BAD + 1)); FAILED=1
    printf '  \033[31mNO\033[0m    %-22s served but WILL NOT SEEK (200, not 206).\n' "$FILM"
    echo "        A Safari-class client refuses to play at all without this."
  elif [ "$CODE" = "404" ]; then
    N_BAD=$((N_BAD + 1)); FAILED=1
    printf '  \033[31mNO\033[0m    %-22s is NOT on the laptop.\n' "$FILM"
    echo "        Fix:  ~/projects/StreamStage/expo-assets/kiosk/sync-media.sh"
  else
    N_BAD=$((N_BAD + 1)); FAILED=1
    printf '  \033[31mNO\033[0m    %-22s answered %s.\n' "$FILM" "${CODE:-nothing}"
  fi
done
echo "        $N_OK of $((N_OK + N_BAD)) films ready."

# The one film that is fetched off the telemetry port, so check it THERE too.
SVC_CODE="$(curl -s -o /dev/null -m 8 -r 0-1023 -w '%{http_code}' "$LOG/media/streamstage-services.mp4" 2>/dev/null)"
if [ "$SVC_CODE" = "206" ]; then
  ok "The recital film also seeks on the telemetry port, which is where the TV gets it."
elif [ -n "$SVC_CODE" ] && [ "$SVC_CODE" != "404" ]; then
  bad "The recital film answered $SVC_CODE on port $((PORT + 1)) — the TV fetches it from there."
fi

# --------------------------------------------------------- 4. the day's record
head_ "The record"
if [ "$PF_WRITABLE" = "True" ]; then
  ok "Telemetry is writable — $PF_TDIR"
else
  bad "TELEMETRY IS NOT WRITABLE: $PF_TDIR"
  echo "        Every tap, every film and every typed email would be lost."
fi

PROBE="$(curl -s -m 5 -o /dev/null -w '%{http_code}' -X POST "$LOG/log" \
  -H 'Content-Type: text/plain' \
  -d '[{"eid":"preflight","t":"preflight","ms":0,"surface":"preflight","type":"preflight"}]' 2>/dev/null)"
if [ "$PROBE" = "200" ]; then
  ok "A test event went to disk on port $((PORT + 1)) and came back confirmed."
elif [ "$PROBE" = "507" ]; then
  bad "The server could not WRITE the test event (507). Disk full, or permissions."
else
  bad "The telemetry port answered ${PROBE:-nothing} on port $((PORT + 1))."
  echo "        The pages compute it as page port + 1. If that port is not ours, no"
  echo "        event and no typed email reaches the disk all day."
fi

# ---- /events must stay something a phone can actually parse ----------------
# This killed the live booth once. The two Android apps read /events behind a
# hard 512KB buffer; a bigger reply is a TRUNCATED JSON array, which looks like
# data, throws on parse, is swallowed, and takes sethost / rediscover / reload
# / clearhost / diag down with it — the only tools for a tablet that cannot be
# reached over adb. Measured on DART before the show: 14,018,754 bytes.
EVHDR="$(curl -s -m 10 -D - -o "${TMPDIR:-/tmp}/pf-events.json" "$LOG/events" 2>/dev/null | tr -d '\r')"
EVBYTES="$(wc -c < "${TMPDIR:-/tmp}/pf-events.json" 2>/dev/null | tr -d ' ')"
EVKEPT="$(printf '%s' "$EVHDR" | awk -F': ' '/^X-Events-Returned/{print $2}')"
EVDROP="$(printf '%s' "$EVHDR" | awk -F': ' '/^X-Events-Dropped/{print $2}')"
EVPARSE="$(python3 -c 'import json,sys
try:
    print(len(json.load(open(sys.argv[1]))))
except Exception as e:
    print("BROKEN")' "${TMPDIR:-/tmp}/pf-events.json" 2>/dev/null)"

if [ "$EVPARSE" = "BROKEN" ]; then
  bad "/events did not come back as valid JSON. This is the failure that kills"
  echo "        the phone's command channel. Do not open the booth until it parses."
elif [ -z "${EVBYTES:-}" ] || [ "$EVBYTES" -eq 0 ]; then
  bad "/events returned nothing on port $((PORT + 1))."
elif [ "$EVBYTES" -gt 524288 ]; then
  bad "/events is $((EVBYTES / 1024)) KB — OVER the 512 KB the tablet and phone can read."
  echo "        The command channel WILL die. This server is running an old serve.py:"
  echo "        restart it so the reply gets capped."
elif [ "$EVBYTES" -gt 327680 ]; then
  warn "/events is $((EVBYTES / 1024)) KB, close to the 512 KB client limit."
else
  ok "/events is $((EVBYTES / 1024)) KB and parses — $EVPARSE events, well inside the 512 KB client limit."
fi
if [ -n "${EVDROP:-}" ] && [ "${EVDROP:-0}" -gt 0 ]; then
  warn "The server held back $EVDROP older events to stay under the cap (sent $EVKEPT)."
  echo "        Nothing is lost — it is all on disk, and the export takes the lot."
fi

# The day's file can be huge even when the reply is not; say so, because that
# is the thing that gets worse hour by hour.
EVFILE="$(printf '%s' "$HEALTH" | python3 -c 'import json,sys
try: print(json.load(sys.stdin).get("eventsFileBytes",0))
except Exception: print(0)')"
LOGFILE="$(printf '%s' "$HEALTH" | python3 -c 'import json,sys
try: print(json.load(sys.stdin).get("applogFileBytes",0))
except Exception: print(0)')"
echo "        on disk today: events $((EVFILE / 1024)) KB, app logs $((LOGFILE / 1024)) KB (app logs are NOT in /events)"
rm -f "${TMPDIR:-/tmp}/pf-events.json"

# ------------------------------------------------------------- 5. the leads
head_ "The leads"
if [ "$PF_LQ" = "-1" ]; then
  warn "The lead queue has not been looked at yet (the server only just started)."
elif [ "$PF_LQ" = "0" ]; then
  ok "No leads waiting to be sent. ($PF_LNOTE)"
else
  warn "$PF_LQ typed lead(s) are on disk and NOT yet sent upstream."
  echo "        $PF_LNOTE"
  echo "        They are safe — they retry on their own once there is internet."
  echo "        To push them now:  python3 expo-assets/kiosk/flush-leads.py"
fi

# ------------------------------------------------------------ 6. the beacon
head_ "The beacon"
if [ "$PF_BEACON" = "0" ]; then
  warn "The beacon is off. The tablet and phone fall back to sweeping 254"
  echo "        addresses, which still works — it is just slow on a busy floor."
else
  BEACON_OUT="$(BP="$PF_BEACON" python3 -c '
import json, os, socket
port = int(os.environ["BP"])
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
try:
    s.bind(("", port))
except OSError as exc:
    print("BIND " + str(exc)); raise SystemExit
s.settimeout(5)
try:
    data, addr = s.recvfrom(4096)
except socket.timeout:
    print("SILENT"); raise SystemExit
try:
    p = json.loads(data.decode())
except Exception:
    print("JUNK"); raise SystemExit
if p.get("ss") != "kiosk":
    print("JUNK"); raise SystemExit
print("HEARD %s %s:%s" % (addr[0], p.get("host"), p.get("port")))
' 2>/dev/null)"
  case "$BEACON_OUT" in
    HEARD*)
      set -- $BEACON_OUT
      ok "Heard on UDP $PF_BEACON, announcing $3."
      ;;
    SILENT|"")
      # Sending host cannot normally hear its own broadcast, so this is only a
      # real failure when checking from another machine.
      if [ "$HOST" = "127.0.0.1" ]; then
        warn "Nothing heard on UDP $PF_BEACON — expected on the sending laptop"
        echo "        itself, which does not receive its own broadcast. Run"
        echo "        ./preflight.sh $PF_IP:$PORT from the tablet's network to really test it."
      else
        bad "Nothing on UDP $PF_BEACON in 5 seconds, from another machine."
        echo "        Discovery still works by sweeping, so this is not fatal today."
      fi
      ;;
    BIND*)
      warn "Could not listen on UDP $PF_BEACON (${BEACON_OUT#BIND }) — cannot tell."
      ;;
    *)
      warn "Something is on UDP $PF_BEACON but it is not ours."
      ;;
  esac
fi

# -------------------------------------------------------------- 7. the disk
head_ "The disk"
DISK_DIR="$PF_TDIR"
[ -d "$DISK_DIR" ] || DISK_DIR="."
AVAIL_K="$(df -Pk "$DISK_DIR" 2>/dev/null | awk 'NR==2{print $4}')"
if [ -z "${AVAIL_K:-}" ]; then
  warn "Could not read free space for $DISK_DIR."
elif [ "$AVAIL_K" -lt 262144 ]; then
  bad "Only $((AVAIL_K / 1024)) MB free. Below ~256 MB the day's record is at risk."
elif [ "$AVAIL_K" -lt 1048576 ]; then
  warn "$((AVAIL_K / 1024)) MB free. Enough for the day, but keep an eye on it."
else
  ok "$((AVAIL_K / 1048576)) GB free."
fi

# ------------------------------------------------------------------ verdict
echo
echo "=================================================================="
if [ "$FAILED" -eq 0 ]; then
  echo "  READY. Open the TV, open the tablet, click the TV once for sound."
  echo "=================================================================="
  exit 0
fi
echo "  NOT READY — fix the red lines above and run this again."
echo "=================================================================="
exit 1
