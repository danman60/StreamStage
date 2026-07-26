#!/usr/bin/env bash
# demo-panic.sh — "get it off the screen NOW"
#
# Wipes the projected demo wall and hard-disarms SMS routing, in that order,
# and prints what happened. Safe to run twice. Needs nothing but internet.
#
# Put a terminal on DART with this already typed. One Enter under pressure.
#
#   ./demo-panic.sh          wipe the wall + disarm routing   (the panic button)
#   ./demo-panic.sh status   just show me the current state
#   ./demo-panic.sh wall     wipe the wall only, leave routing armed
#   ./demo-panic.sh off      disarm routing only, leave the wall alone
set -uo pipefail

TOKEN="${DEMO_RESET_TOKEN:-a7cb85563ad52b460b26ffe236554b41}"
BASE="https://www.studiosage.ai"
H=(-H "content-type: application/json" -H "x-demo-token: $TOKEN")

status() {
  echo "  routing : $(curl -s -m 8 "$BASE/api/demo/route-all")"
  echo "  tenant  : $(curl -s -m 8 "$BASE/api/demo/reset")"
}

wipe_wall() {
  echo "→ wiping the wall…"
  curl -s -m 15 -X POST "$BASE/api/demo/reset" "${H[@]}" -d '{"wall":true}' > /dev/null \
    && echo "  wall cleared (the screen catches up within ~3s)" \
    || echo "  !! wall wipe FAILED — leave the slide instead, that always works"
}

disarm() {
  echo "→ disarming routing…"
  curl -s -m 15 -X POST "$BASE/api/demo/route-all" "${H[@]}" -d '{"action":"off"}' > /dev/null \
    && echo "  routing off (new texts stop routing to the demo)" \
    || echo "  !! disarm FAILED — leave the armed slides, they self-disarm in ~20s"
}

case "${1:-panic}" in
  status) status ;;
  wall)   wipe_wall; status ;;
  off)    disarm;    status ;;
  *)      wipe_wall; disarm; echo; status ;;
esac

echo
echo "Reminder: leaving the armed slides ALSO disarms within ~20s and needs no laptop."
