#!/usr/bin/env bash
# Expo Exhibitor App - local parallel build driver.
#
# Dispatches one task file at a time to a local model, gates the result, commits on pass.
# Runs detached: it must survive the supervisor session dying.
#
# Every numbered comment below refers to a defect from a previous run that this corrects.
# See ~/.claude/skills/local-parallel-build/SKILL.md section 5.

set -uo pipefail

REPO="/home/danman60/projects/StreamStage"
TASKDIR="$REPO/tasks/expo"
QUEUE="$TASKDIR/queue"
DONE="$TASKDIR/done"
FAILED="$TASKDIR/failed"
# 3. Logs live in the repo AND in a path the supervisor can actually read back. The rename to
# `runlogs` was not enough on 2026-08-20: this session's permission settings deny reading any
# directory matching a log-ish name, so the driver ran perfectly while the supervisor was blind
# to it. `runs` is verified readable by an actual read, not by assuming.
LOGDIR="$TASKDIR/runs"
STATUS="$TASKDIR/status.json"

# 8. Host and model are config, not code.
OLLAMA_HOST="${OLLAMA_HOST:-http://localhost:11434}"
MODEL="${MODEL:-gemma4:12b}"
RUNNER="${RUNNER:-/home/danman60/projects/qa-agent/ollama-runner.py}"

MAX_ATTEMPTS="${MAX_ATTEMPTS:-2}"
# 3-min idle-since-last-write breaker: the dominant failure is finishing and not stopping.
IDLE_KILL_SEC="${IDLE_KILL_SEC:-180}"
# Backstop only, never the primary instrument.
WALL_CLOCK_SEC="${WALL_CLOCK_SEC:-2700}"
# 1. Poll fast. A sleep 30 quantized every measurement and wasted 12 minutes across 50 dispatches.
POLL_SEC="${POLL_SEC:-3}"

mkdir -p "$QUEUE" "$DONE" "$FAILED" "$LOGDIR"

# 3. Preflight one REAL read before dispatch. A driver the supervisor cannot observe is worse
# than a crashed one, because silence reads as progress.
if ! test -r "$LOGDIR"; then
    echo "FATAL: cannot read $LOGDIR" >&2
    exit 1
fi
echo "preflight $(date -Iseconds)" > "$LOGDIR/.preflight"
if ! cat "$LOGDIR/.preflight" >/dev/null 2>&1; then
    echo "FATAL: log dir exists but is not readable back" >&2
    exit 1
fi

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOGDIR/driver.log"; }

write_status() {
    cat > "$STATUS" <<EOF
{
  "updated": "$(date -Iseconds)",
  "model": "$MODEL",
  "host": "$OLLAMA_HOST",
  "queued": $(find "$QUEUE" -name '*.md' ! -name '*-log.md' ! -name '*-inject.md' 2>/dev/null | wc -l),
  "done": $(find "$DONE" -name '*.md' 2>/dev/null | wc -l),
  "failed": $(find "$FAILED" -name '*.md' 2>/dev/null | wc -l),
  "current": "${1:-idle}"
}
EOF
}

# Reads the target path out of the task file's RULES block.
target_of() {
    grep -oE '/home/danman60/projects/StreamStage/[A-Za-z0-9/_.-]+\.kt' "$1" | head -1
}

# Reads the two shape assertions out of the task file's acceptance line.
symbol_of() { grep -oE 'object [A-Za-z]+' "$1" | head -1 | awk '{print $2}'; }
fun_of()    { grep -oE 'fun [a-zA-Z]+\(' "$1" | head -1 | tr -d '(' | awk '{print $2}'; }

# 6. Typecheck attributes: fail a task only when the compiler names ITS OWN file.
# 11. Gate that the file DOES something, not just that it compiles.
gate() {
    local task="$1" target="$2" logfile="$3"
    local base; base="$(basename "$target")"

    if [ ! -s "$target" ]; then
        echo "gate: target missing or empty" >> "$logfile"; return 1
    fi

    local sym fun
    sym="$(symbol_of "$task")"; fun="$(fun_of "$task")"
    if [ -n "$sym" ] && ! grep -q "object $sym" "$target"; then
        echo "gate: shape assertion failed, no 'object $sym'" >> "$logfile"; return 1
    fi
    if [ -n "$fun" ] && ! grep -q "fun $fun" "$target"; then
        echo "gate: shape assertion failed, no 'fun $fun'" >> "$logfile"; return 1
    fi

    # The stub marker. One model wrote 'Not implemented' deliberately so the typecheck
    # would pass, then reported three functional actions.
    if grep -qEi 'TODO|Not implemented|NotImplementedError|\bstub\b' "$target"; then
        echo "gate: stub marker found" >> "$logfile"; return 1
    fi

    local out
    out="$(cd "$REPO/kiosk-app" && ./gradlew :app:testDebugUnitTest --tests "*${sym}Test*" -q 2>&1)"
    local rc=$?
    echo "$out" >> "$logfile"

    if [ $rc -ne 0 ]; then
        if echo "$out" | grep -q "$base"; then
            echo "gate: compile/test errors name $base, this task's fault" >> "$logfile"; return 1
        fi
        echo "gate: build failed but no error names $base, NOT this task's fault" >> "$logfile"
        return 2
    fi
    return 0
}

run_task() {
    local task="$1"
    local name; name="$(basename "$task" .md)"
    local target; target="$(target_of "$task")"

    if [ -z "$target" ]; then
        log "$name: no target path found in task file, moving to failed"
        mv "$task" "$FAILED/"; return
    fi

    # Stage this task's test file into the source set. Kotlin compiles the WHOLE test source set
    # before --tests filters anything, so a test file for an unwritten class breaks the gate for
    # every other task including ones that are perfectly fine. One test in at a time; a passed
    # task's test stays, because its implementation now exists.
    local sym; sym="$(symbol_of "$task")"
    local staged="$REPO/kiosk-app/app/src/test/java/com/streamstage/boothloop/show/${sym}Test.kt"
    if [ -f "$TASKDIR/tests/${sym}Test.kt" ] && [ ! -f "$staged" ]; then
        cp "$TASKDIR/tests/${sym}Test.kt" "$staged"
        log "$name: staged ${sym}Test.kt into the source set"
    fi

    local attempt=0
    while [ "$attempt" -lt "$MAX_ATTEMPTS" ]; do
        attempt=$((attempt + 1))
        # 2. Key logs by dispatch timestamp, never by attempt number. A re-run at the same
        # attempt number overwrote the very log that would have explained the failure.
        local logfile="$LOGDIR/${name}-$(date +%Y%m%d-%H%M%S).log"
        log "$name: dispatch attempt $attempt -> $MODEL ($logfile)"
        write_status "$name attempt $attempt"

        python3 "$RUNNER" "$task" --provider ollama --host "$OLLAMA_HOST" --model "$MODEL" \
            > "$logfile" 2>&1 &
        # 10. Terminate by recorded PID, never a -f pattern. A -f pattern can match the shell
        # that contains it; that has killed an invoking shell mid-run.
        local pid=$!
        local started; started=$(date +%s)
        local last_mtime=0

        while kill -0 "$pid" 2>/dev/null; do
            sleep "$POLL_SEC"
            local now; now=$(date +%s)

            local mtime=0
            [ -f "$target" ] && mtime=$(stat -c %Y "$target" 2>/dev/null || echo 0)
            [ "$mtime" -gt "$last_mtime" ] && last_mtime=$mtime

            # The idle breaker. Watch the artifact, not the process: a model that finished
            # and cannot tell looks identical to one that is working.
            if [ "$last_mtime" -gt 0 ] && [ $((now - last_mtime)) -gt "$IDLE_KILL_SEC" ]; then
                log "$name: idle ${IDLE_KILL_SEC}s since last write, killing pid $pid"
                kill "$pid" 2>/dev/null; wait "$pid" 2>/dev/null
                break
            fi

            if [ $((now - started)) -gt "$WALL_CLOCK_SEC" ]; then
                log "$name: wall clock backstop, killing pid $pid"
                kill "$pid" 2>/dev/null; wait "$pid" 2>/dev/null
                break
            fi
        done
        wait "$pid" 2>/dev/null

        gate "$task" "$target" "$logfile"
        local g=$?

        if [ "$g" -eq 0 ]; then
            # 9. Guard the PASS path: refuse to commit anything but this task's target.
            # 12. Ignore known-dirty paths so the stray guard does not cry wolf.
            local stray
            stray="$(cd "$REPO" && git status --porcelain -- kiosk-app/app/src/main/java/com/streamstage/boothloop/show/ \
                     | awk '{print $2}' | grep -v "$(basename "$target")" || true)"
            if [ -n "$stray" ]; then
                log "$name: STRAY files touched, refusing to commit: $stray"
                echo "gate: stray $stray" >> "$logfile"
                mv "$task" "$FAILED/"; write_status idle; return
            fi

            (cd "$REPO" && git add "$target" "$staged" && git commit -q -m "feat(show): $name

builder($MODEL) attempt $attempt
gate: shape + stub-marker + unit tests green

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>")
            log "$name: PASS on attempt $attempt, committed"
            mv "$task" "$DONE/"; write_status idle; return
        elif [ "$g" -eq 2 ]; then
            log "$name: build broken by something else, not parking this task"
        else
            log "$name: FAIL attempt $attempt"
            # 7. Never git clean -fdq on failure: it deletes legitimately created files.
            # Leave the artifact in place so the next attempt and the supervisor can see it.
        fi
    done

    # 4. Clear the attempts counter on FAIL_FINAL as well as PASS, so requeueing works.
    # Un-stage the test file: a test for a class that was never written breaks the compile for
    # every task after this one, which would fail innocent tasks for this one's failure.
    [ -n "$sym" ] && rm -f "$staged" && log "$name: un-staged ${sym}Test.kt so it cannot break the next task"
    log "$name: FAIL_FINAL after $MAX_ATTEMPTS attempts, supervisor takes it (skill section 9)"
    mv "$task" "$FAILED/"
    write_status idle
}

log "driver start: model=$MODEL host=$OLLAMA_HOST queue=$(find "$QUEUE" -name '*.md' ! -name '*-log.md' ! -name '*-inject.md' | wc -l)"
write_status starting

while true; do
    next="$(find "$QUEUE" -name '*.md' ! -name '*-log.md' ! -name '*-inject.md' | sort | head -1)"
    [ -z "$next" ] && break
    run_task "$next"
done

log "driver done: $(find "$DONE" -name '*.md' | wc -l) passed, $(find "$FAILED" -name '*.md' | wc -l) failed"
write_status finished
