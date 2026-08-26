#!/usr/bin/env bash
# run.sh — build the share page on the local 3060, retrying until the ARTIFACT passes the gate.
# Gate checks the file, never the model's claim.
set -uo pipefail

TASK=/home/danman60/projects/StreamStage/tasks/sharepage/01-share-page.md
OUT=/home/danman60/projects/StreamStage/expo-assets/share/index.html
LOGDIR=/home/danman60/projects/StreamStage/tasks/sharepage/runs
HOST=http://localhost:11434
MODEL=gemma4:12b
MAX=4

mkdir -p "$LOGDIR" "$(dirname "$OUT")"
log(){ echo "[$(date +%H:%M:%S)] $*"; }

gate(){   # every check is against the file on disk
  [ -s "$OUT" ]                                  || { echo "gate: missing/empty"; return 1; }
  local v; v=$(grep -o '<video' "$OUT" | wc -l)
  [ "$v" -eq 6 ]                                 || { echo "gate: $v <video tags, want 6"; return 1; }
  for f in studiosage compsync callboard costumecraft reflect studiobeat; do
    grep -q "booth/$f.mp4" "$OUT"                || { echo "gate: missing $f.mp4"; return 1; }
  done
  grep -q 'streamstage-services' "$OUT"          && { echo "gate: included the excluded 197MB film"; return 1; }
  # no external hosts other than the R2 bucket
  local ext
  ext=$(grep -oE 'https?://[a-zA-Z0-9._-]+' "$OUT" | sort -u \
        | grep -v 'pub-626d1637ca4c4f34a7916019aaa3efce.r2.dev' | head -3)
  [ -n "$ext" ]                                  && { echo "gate: external host(s): $ext"; return 1; }
  grep -qi 'navigator.clipboard' "$OUT"          || { echo "gate: no copy-to-clipboard"; return 1; }
  return 0
}

for att in $(seq 1 $MAX); do
  stamp=$(date +%Y%m%d-%H%M%S)
  log "attempt $att/$MAX -> $MODEL"
  rm -f "$OUT"
  timeout 1500 python3 /home/danman60/projects/qa-agent/ollama-runner.py "$TASK" \
      --provider ollama --host "$HOST" --model "$MODEL" \
      > "$LOGDIR/attempt-$att-$stamp.log" 2>&1
  rc=$?
  if out=$(gate); then
    log "PASS attempt $att — $(wc -c < "$OUT") bytes, $(grep -c '<video' "$OUT") video tags"
    exit 0
  fi
  log "FAIL attempt $att (runner rc=$rc): $out"
done

log "FAIL_FINAL after $MAX attempts — supervisor builds this one"
exit 1
