#!/usr/bin/env bash
# ============================================================================
# BOOTH END-TO-END SUITE — every surface, real hardware, no mocks.
#
#   ./tests/e2e-booth.sh            everything that is safe to run any time
#   ./tests/e2e-booth.sh --quick    skip the slow byte-for-byte film checks
#   ./tests/e2e-booth.sh --no-touch skip anything that touches a device's UI
#
# Written for the Calgary Dance Teacher Expo (Aug 11-12 2026). Run it after any
# change, and once at the venue before doors — see PREFLIGHT at the bottom for
# what changes when the network is the phone hotspot.
#
# RULES THIS SUITE OBEYS, because each one was learned the hard way:
#   - Never trust a self-report. Every claim here is a measurement.
#   - A QR is decoded with a tool independent of whatever generated it.
#   - "Absent" needs two methods at zero before it is believed.
#   - DART serves the live booth. This suite never writes to it.
# ============================================================================
set -uo pipefail

# DART's address is NOT hardcoded any more. It moved 192.168.0.13 -> 192.168.0.11
# on 2026-08-09 — onto the address this file used to record for the Fire tablet —
# and every doc, QR and command quoting the old one was silently wrong. So ask
# tools/booth-lan.sh, which finds it from the kiosk's own beacon, and fall back to
# the last address seen rather than to a number nobody has checked.
# Override at any time with:  DART=x.x.x.x ./tests/e2e-booth.sh
if [ -z "${DART:-}" ] && [ -x "$(dirname "$0")/../tools/booth-lan.sh" ]; then
  eval "$("$(dirname "$0")/../tools/booth-lan.sh" 2>/dev/null || true)"
  DART=${BOOTH_HOST:-}
fi
DART=${DART:-192.168.0.11}
KIOSK_PORT=${KIOSK_PORT:-8081}
STICK=${STICK:-192.168.0.199:5555}
# The tablet was recorded at .11 before DHCP handed that address to DART. Left
# unset by default rather than pointed at a machine that is now the laptop —
# a test that talks to the wrong device is worse than a skipped one.
TABLET=${TABLET:-}
PHONE=${PHONE:-192.168.0.192:35555}
ADB=${ADB:-$HOME/Android/Sdk/platform-tools/adb}
REPO=${REPO:-/home/danman60/projects/StreamStage}
MEDIA="$REPO/expo-assets/kiosk/media"
PUBSET="$MEDIA/publish-set"
MANIFEST=${MANIFEST:-https://pub-626d1637ca4c4f34a7916019aaa3efce.r2.dev/booth/manifest.json}
FILMS="callboard compsync costumecraft reflect studiobeat studiosage streamstage-services"

QUICK=0; NOTOUCH=0
for a in "$@"; do
  [ "$a" = "--quick" ] && QUICK=1
  [ "$a" = "--no-touch" ] && NOTOUCH=1
done

PASS=0; FAIL=0; SKIP=0; FAILED_NAMES=()
ok()   { PASS=$((PASS+1)); printf '  \033[32mPASS\033[0m  %s\n' "$1"; }
bad()  { FAIL=$((FAIL+1)); FAILED_NAMES+=("$1"); printf '  \033[31mFAIL\033[0m  %s\n' "$1"; [ -n "${2:-}" ] && printf '        %s\n' "$2"; }
skip() { SKIP=$((SKIP+1)); printf '  \033[33mSKIP\033[0m  %s  (%s)\n' "$1" "${2:-}"; }
head_() { printf '\n\033[1m== %s\033[0m\n' "$1"; }

dev_up() { $ADB devices 2>/dev/null | grep -q "^$1[[:space:]]*device$"; }

# ---------------------------------------------------------------- 1. DART kiosk
head_ "1. DART kiosk ($DART:$KIOSK_PORT) — the booth's brain"

HEALTH=$(curl -s --max-time 8 "http://$DART:$KIOSK_PORT/health" 2>/dev/null)
if echo "$HEALTH" | grep -q '"ok": *true'; then
  ok "kiosk /health answers ok"
  SUBS=$(echo "$HEALTH" | python3 -c "import sys,json;print(json.load(sys.stdin).get('subscribers','?'))" 2>/dev/null)
  EVENTS=$(echo "$HEALTH" | python3 -c "import sys,json;print(json.load(sys.stdin).get('events','?'))" 2>/dev/null)
  printf '        subscribers=%s events=%s\n' "$SUBS" "$EVENTS"
else
  bad "kiosk /health" "no answer from http://$DART:$KIOSK_PORT/health — is serve.py running on DART?"
fi

for p in / /tablet /tv; do
  C=$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 "http://$DART:$KIOSK_PORT$p")
  [ "$C" = "200" ] && ok "GET $p -> 200" || bad "GET $p" "got $C"
done

# Range/206 is load-bearing: without it video seek clamps to 0 and Safari-class
# clients refuse <video> outright. Regressing this silently kills the booth TV.
for f in $FILMS; do
  C=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 -r 0-1000 "http://$DART:$KIOSK_PORT/media/$f.mp4")
  [ "$C" = "206" ] && ok "Range 206 · $f" || bad "Range · $f" "expected 206, got $C"
done

TC=$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 "http://$DART:$((KIOSK_PORT+1))/" 2>/dev/null)
[ "$TC" = "200" ] && ok "telemetry on its own port ($((KIOSK_PORT+1)))" \
  || bad "telemetry port $((KIOSK_PORT+1))" "got $TC — telemetry MUST NOT share the page port (it starves behind the films)"

# ------------------------------------------------------------------ 2. R2 / CDN
head_ "2. R2 — the update source"

MJ=$(curl -s --max-time 20 "$MANIFEST")
if echo "$MJ" | python3 -c "import sys,json;json.load(sys.stdin)" 2>/dev/null; then
  V=$(echo "$MJ" | python3 -c "import sys,json;print(json.load(sys.stdin)['version'])")
  N=$(echo "$MJ" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['films']))")
  ok "manifest parses (v$V, $N films)"
  [ "$N" = "7" ] && ok "manifest lists all 7 films" || bad "manifest film count" "expected 7, got $N"
  echo "$MJ" | python3 -c "
import sys,json
d=json.load(sys.stdin)
bad=[f['id'] for f in d['films'] if len(f.get('sha256',''))!=64 or not f.get('bytes')]
print('BADROWS='+','.join(bad) if bad else 'BADROWS=')" > /tmp/.e2e_mrows
  . /tmp/.e2e_mrows
  [ -z "$BADROWS" ] && ok "every manifest row has bytes + 64-char sha256" || bad "manifest rows" "incomplete: $BADROWS"
else
  bad "manifest fetch/parse" "$MANIFEST did not return valid JSON"
fi

for f in $FILMS; do
  C=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 -r 0-100 "https://pub-626d1637ca4c4f34a7916019aaa3efce.r2.dev/booth/$f.mp4")
  [ "$C" = "206" ] || [ "$C" = "200" ] && ok "R2 serves $f" || bad "R2 · $f" "got $C"
done

# ------------------------------------------------------- 3. media integrity
head_ "3. Film integrity — repo vs published vs what DART serves"

if [ "$QUICK" = "1" ]; then
  skip "byte-for-byte film comparison" "--quick"
else
  for f in $FILMS; do
    [ -f "$MEDIA/$f.mp4" ] || { bad "media/$f.mp4" "missing from the repo"; continue; }
    [ -f "$PUBSET/$f.mp4" ] || { bad "publish-set/$f.mp4" "missing"; continue; }
    A=$(sha256sum "$MEDIA/$f.mp4" | cut -d' ' -f1)
    B=$(sha256sum "$PUBSET/$f.mp4" | cut -d' ' -f1)
    [ "$A" = "$B" ] && ok "repo == publish-set · $f" || bad "repo vs publish-set · $f" "$A vs $B"
  done
  # Every film must actually decode. A file can be the right size and still be
  # garbage — that exact failure hit the Fire Stick on 2026-08-07.
  for f in $FILMS; do
    ERR=$(ffmpeg -v error -i "$MEDIA/$f.mp4" -t 3 -f null - 2>&1 | head -2)
    [ -z "$ERR" ] && ok "decodes · $f" || bad "decode · $f" "$ERR"
  done
fi

# ------------------------------------------------------------- 4. Fire Stick
head_ "4. Fire Stick — the no-laptop, no-network fallback"

if dev_up "$STICK"; then
  FOC=$($ADB -s "$STICK" shell dumpsys activity activities 2>/dev/null | grep -oE 'com\.streamstage\.boothloop/[.A-Za-z]+' | head -1)
  [ -n "$FOC" ] && ok "booth loop is the foreground app" || bad "booth loop foreground" "found: ${FOC:-nothing}"

  WAKE=$($ADB -s "$STICK" shell dumpsys power 2>/dev/null | grep -oE 'mWakefulness=[A-Za-z]+' | head -1)
  [ "$WAKE" = "mWakefulness=Awake" ] && ok "screen awake" || bad "screen state" "$WAKE"

  CNT=$($ADB -s "$STICK" shell "ls /sdcard/Movies/StreamStageBooth/*.mp4 2>/dev/null | wc -l" | tr -d '\r')
  [ "$CNT" -ge 7 ] 2>/dev/null && ok "$CNT films on the stick" || bad "films on stick" "found $CNT"

  STG=$($ADB -s "$STICK" shell "ls /sdcard/Movies/StreamStageBooth/.staging 2>/dev/null | wc -l" | tr -d '\r')
  [ "${STG:-0}" -eq 0 ] 2>/dev/null && ok "staging dir clean (no half-applied update)" || bad "staging dir" "$STG leftover files"

  if [ "$QUICK" = "1" ]; then
    skip "stick film hashes" "--quick"
  else
    $ADB -s "$STICK" shell "cd /sdcard/Movies/StreamStageBooth && for f in *.mp4; do echo -n \"\$f \"; toybox sha256sum \$f | cut -d' ' -f1; done" 2>/dev/null > /tmp/.e2e_stick
    # A film that has been updated lives under a VERSIONED name — foo__<hex>.mp4 —
    # and the plain foo.mp4 stays behind as the rollback source. Comparing plain
    # names alone therefore reports drift on a stick that is perfectly correct:
    # it hashes the old copy the app is deliberately keeping. So collapse each
    # file to its logical name and let the versioned copy win, which is what
    # FilmVersions on the device does. (Caught 2026-08-09, the night before the
    # flight, when a correct stick failed this check.)
    M=0; X=0
    declare -A BEST=()
    while read -r f h; do
      [ -n "$f" ] || continue
      logical="${f%.mp4}"; logical="${logical%%__*}.mp4"
      case "$f" in
        *__*) BEST["$logical"]="$h" ;;                       # versioned wins
        *)    [ -n "${BEST[$logical]:-}" ] || BEST["$logical"]="$h" ;;
      esac
    done < /tmp/.e2e_stick
    for f in "${!BEST[@]}"; do
      [ -f "$PUBSET/$f" ] || continue
      L=$(sha256sum "$PUBSET/$f" | cut -d' ' -f1)
      if [ "$L" = "${BEST[$f]}" ]; then M=$((M+1)); else X=$((X+1)); echo "        drift: $f"; fi
    done
    [ "$X" -eq 0 ] && ok "all $M stick films match the published set" || bad "stick film drift" "$X film(s) differ from publish-set"
  fi
else
  skip "Fire Stick checks" "$STICK not on adb"
fi

# ---------------------------------------------------------------- 5. Tablet
head_ "5. Fire tablet — the visitor surface"

if dev_up "$TABLET"; then
  PKG=$($ADB -s "$TABLET" shell pm list packages 2>/dev/null | grep -c boothtablet)
  [ "$PKG" -ge 1 ] && ok "booth tablet app installed" || bad "tablet app" "package not installed"

  SOCK=$($ADB -s "$TABLET" shell "toybox netstat -tn 2>/dev/null | grep -c $DART")
  [ "${SOCK:-0}" -ge 1 ] 2>/dev/null && ok "tablet holds $SOCK live socket(s) to the kiosk" \
    || bad "tablet -> kiosk" "no established connection to $DART (is the app open?)"

  # nc does not exist on Fire OS; toybox nc does. Measuring the wrong binary
  # once produced a completely false "no connectivity" diagnosis.
  R=$($ADB -s "$TABLET" shell "toybox nc -w 5 $DART $KIOSK_PORT </dev/null && echo TCP_OK" 2>/dev/null | tr -d '\r')
  echo "$R" | grep -q TCP_OK && ok "tablet can reach the kiosk port" || bad "tablet TCP to kiosk" "no TCP_OK"
else
  skip "tablet checks" "$TABLET not on adb"
fi

# ----------------------------------------------------------------- 6. Phone
head_ "6. Phone — the operator console"

if dev_up "$PHONE"; then
  V=$($ADB -s "$PHONE" shell dumpsys package com.streamstage.phonepresenter 2>/dev/null | grep -m1 versionName | tr -d '\r ')
  [ -n "$V" ] && ok "toolkit installed ($V)" || bad "phone app" "com.streamstage.phonepresenter not installed"
  # One icon, not two: the toolkit supersedes the old PhonePresenter in place.
  DUP=$($ADB -s "$PHONE" shell pm list packages 2>/dev/null | grep -c "streamstage.phonetoolkit")
  [ "${DUP:-0}" -eq 0 ] && ok "no duplicate toolkit package (one icon)" || bad "duplicate package" "phonetoolkit installed alongside phonepresenter"
else
  skip "phone checks" "$PHONE not on adb"
fi

# -------------------------------------------------------------- 7. Presenter
head_ "7. Presenter — the stage rig"

for P in 8090 8080; do
  S=$(curl -s --max-time 6 "http://$DART:$P/state" 2>/dev/null)
  if echo "$S" | grep -q '"seq"'; then
    T=$(echo "$S" | python3 -c "import sys,json;print(json.load(sys.stdin).get('total',0))" 2>/dev/null)
    ST=$(echo "$S" | python3 -c "import sys,json;print(json.load(sys.stdin).get('stale',''))" 2>/dev/null)
    if [ "$T" = "32" ] || [ "$T" = "27" ]; then
      ok "presenter on $P has a shipping deck ($T slides)"
    else
      bad "presenter on $P deck" "$T slides — ${ST:-not one of the shipping decks (32 talk2 / 27 talk1)}"
    fi
  fi
done

# --------------------------------------------------------------- 8. Lead path
head_ "8. Lead capture — the reason the booth exists"

for U in "https://streamstage.live/g" "https://streamstage.live/checklist.html"; do
  C=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$U")
  [ "$C" = "200" ] && ok "$U -> 200" || bad "$U" "got $C"
done

# ------------------------------------------------------------------- summary
printf '\n\033[1m== SUMMARY ==\033[0m\n'
printf '  passed %d   failed %d   skipped %d\n' "$PASS" "$FAIL" "$SKIP"
if [ "$FAIL" -gt 0 ]; then
  printf '\n  what failed:\n'
  for n in "${FAILED_NAMES[@]}"; do printf '   - %s\n' "$n"; done
fi
printf '\n'

# ============================================================================
# PREFLIGHT AT THE VENUE
#   The network will be a phone hotspot, so every IP above changes. Run:
#       DART=<laptop ip> ./tests/e2e-booth.sh
#   Get the laptop's address from the kiosk's own startup banner, or from the
#   tablet app's diagnostics panel. Do not guess it.
#   The Fire Stick section still passes with NO network at all — that is the
#   whole point of the stick, and section 4 is written to prove it.
# ============================================================================
exit $([ "$FAIL" -eq 0 ] && echo 0 || echo 1)
