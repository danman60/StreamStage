#!/usr/bin/env python3
"""
Presenter remote for the expo decks.

Run this from the folder that holds the deck html, then:
  - laptop:  http://localhost:8090/talk2-deck.html   (or talk2-ai.html locally)
  - phone:   http://<laptop-ip>:8090/remote          (join the laptop's hotspot first)

Port 8090, NOT 8080. The booth kiosk (expo-assets/kiosk/serve.py) owns 8080 for
its pages and 8081 for its telemetry listener, and its address is printed on the
booth sheet and bookmarked on the Fire Stick, so it is the one that cannot move.
Both servers now run on one laptop at once. PRESENTER_PORT still overrides this
— just never set it to 8080 or 8081.

The phone page shows the current slide's beats and has big Prev/Next thumb zones.
Stdlib only - no pip, no npm, nothing to install at the venue.

Volume buttons cannot be used: no mobile browser exposes them to a web page.
Tap zones instead (and they can't accidentally change your volume mid-talk).
"""
import http.server, socketserver, json, socket, sys, os, threading, re, subprocess, time
import tempfile, urllib.request, collections

DEFAULT_PORT = 8090          # see the module docstring: 8080/8081 belong to the kiosk
KIOSK_PORTS = (8080, 8081)   # only used to write a helpful error message
PORT = int(os.environ.get("PRESENTER_PORT", str(DEFAULT_PORT)))


def port_free(port):
    """True if this process can actually take `port` right now.

    Deliberately does NOT set SO_REUSEADDR. socketserver turns SO_REUSEADDR on
    (Server.allow_reuse_address below), and on WINDOWS — which is the
    presenting laptop — that flag lets a second process bind a port another
    process is already listening on. The bind then succeeds and the two servers
    split incoming connections at random, so the phone remote would talk to the
    kiosk half the time. A plain exclusive probe means the same thing on
    Windows and on Linux, so this check is what is trusted, not the bind.
    """
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    if hasattr(socket, "SO_EXCLUSIVEADDRUSE"):        # Windows only
        try:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        except OSError:
            pass
    try:
        s.bind(("0.0.0.0", port))
        return True
    except OSError:
        return False
    finally:
        s.close()


def pick_port(want, tries=20):
    """First free port at or above `want`, or None if there is no room.

    Skips the kiosk's two ports outright: falling forward onto 8080 or 8081
    would be the exact collision this exists to avoid.
    """
    for i in range(tries):
        p = want + i
        if p in KIOSK_PORTS:
            continue
        if port_free(p):
            return p
    return None

_lock = threading.Lock()
STATE = {"idx": 0, "total": 0, "title": "", "beats": [], "titles": [], "seq": 0, "stale": ""}

# ── stale-deck alarm ──────────────────────────────────────────────────────────
# A presenter server holds whatever the last DECK PAGE told it. On 2026-08-07 two
# instances had been up since Jul 28/29 still reporting a 38-slide talk 2 — the
# pre-rebuild deck — while the shipping talk 2 is 32 slides. One of them was the
# phone's saved host. Nothing anywhere said "this is the wrong deck": the phone
# cheerfully showed 1/38 and would have driven the wrong slides on stage.
#
# The slide COUNT is the cheapest reliable fingerprint of which deck is loaded, so
# the server compares it against the decks that are actually shipping and says so
# on the phone. Update these when a deck's length changes — a wrong number here
# produces a false alarm, which is noisy but never silent.
KNOWN_DECKS = {
    32: "talk 2 — the AI front desk",
    27: "talk 1 — the content day",
}
RETIRED_DECKS = {
    38: "the PRE-REBUILD talk 2 (38 slides). The shipping talk 2 is 32.",
    33: "talk 2 with the product grid and CTA as SEPARATE slides (2026-08-10 morning). They were merged into one final slide; the shipping talk 2 is 32.",
    14: "an OLD talk 1 (14 slides). The canonical talk 1 is 27.",
    13: "the stale talk1-video.html copy (13 slides). Canonical talk 1 is 27.",
}


def stale_deck_warning(total: int) -> str:
    """Empty string when the loaded deck looks right; plain English when it does not."""
    if not total:
        return ""
    if total in RETIRED_DECKS:
        return "STALE DECK — this is " + RETIRED_DECKS[total] + " Close that browser tab and open the current deck."
    if total not in KNOWN_DECKS:
        return f"Unrecognised deck ({total} slides). Expected 32 (talk 2) or 27 (talk 1)."
    return ""
PENDING = []          # commands from the phone, consumed by the deck

# THE DECK-MOVED-BY-ITSELF LEDGER.
# Bounded, in memory, no file to rotate — the only question it has to answer is
# "what moved the deck in the last few minutes, and from which device". Read it
# with GET /cmdlog. Ring of 60 is a couple of minutes of heavy pressing.
CMDLOG = collections.deque(maxlen=60)

def _cmdlog(kind, action, addr, ua):
    try:
        CMDLOG.append({
            "at": time.strftime("%H:%M:%S", time.localtime()),
            "kind": kind,               # POST (something asked) | DRAIN (deck took it)
            "action": action,
            "from": addr,
            "ua": (ua or "")[:80],
        })
    except Exception:
        pass                            # a log line must never break the show

# ------------------------------------------------------------- demo feeds ---
# The live scene slide needs the public demo feeds, but studiosage.ai serves them
# with no Access-Control-Allow-Origin, so the deck cannot read them cross-origin.
# Proxy them here instead: same origin as the deck, so no CORS and no deploy.
# Short cache because the scene polls every 2s and two panels want the same data.
DEMO_FEED_URL = "https://www.studiosage.ai/api/demo/%s?code=live26"
DEMO_FEED_TTL = 1.5
_demo_cache = {}      # which -> (fetched_at, payload)


def demo_feed(which):
    """Fetch kb/wall for the scene. Never raises - the stage must not see a stack
    trace. On failure, serve the last good payload marked stale so the scene keeps
    whatever it already drew instead of blanking mid-demo."""
    now = time.time()
    hit = _demo_cache.get(which)
    if hit and now - hit[0] < DEMO_FEED_TTL:
        return hit[1]
    try:
        req = urllib.request.Request(
            DEMO_FEED_URL % which,
            headers={"user-agent": "presenter-server", "accept": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=6) as r:
            payload = json.loads(r.read().decode("utf-8", "replace"))
    except Exception as e:
        if hit:
            payload = dict(hit[1])
            payload["stale"] = True
        else:
            payload = {"offline": True, "error": str(e)[:200]}
    _demo_cache[which] = (now, payload)
    return payload

# ---------------------------------------------------------------- facelift ---
# The stage trick: Daniel takes ONE studio url from the room on the PLANT slide,
# types it into the phone remote, and ~75 minutes later reveals the rebuilt site.
# The remote POSTs here; this server launches facelift-run.sh in the background
# and exposes the run's status so BOTH the phone and the deck can read it.
#
# Source of truth for status is a FILE (facelift-out/status.json) written by the
# runner, not memory — so a server restart mid-talk doesn't lose the run.
HERE = os.path.dirname(os.path.abspath(__file__))
FACELIFT_DIR = os.path.join(HERE, "facelift-out")
FACELIFT_STATUS = os.path.join(FACELIFT_DIR, "status.json")
FACELIFT_SITE = os.path.join(FACELIFT_DIR, "site")
# The studio's site as it is TODAY, captured by the runner in the first seconds of a
# run and shown on the plant slide. A picture, not an embed — see facelift-before.cjs.
FACELIFT_BEFORE = os.path.join(FACELIFT_DIR, "before.png")
FACELIFT_RUNNER = os.path.join(HERE, "facelift-run.sh")
FACELIFT_FALLBACK = os.path.join(HERE, "facelift-fallback")

# --- remote build host -------------------------------------------------------
# facelift-run.sh needs bash AND the Claude CLI. The Windows presenting laptop
# has neither (no bash on PATH, no WSL), so a local Popen silently never starts:
# status sticks at "queued", runner.log stays 0 bytes, and the deck quietly falls
# back to the canned facelift-fallback. Verified failure on FIRMAMENT 2026-07-26.
#
# So: dispatch the build to SPYBALLOON over ssh (into a tmux session so it
# survives a dropped connection and can be watched), poll its status, and pull
# the finished site back here. The REVEAL still serves off this laptop — the
# network is only needed during the build window, not at reveal time.
FACELIFT_REMOTE      = os.environ.get("FACELIFT_REMOTE", "danman60@100.122.177.91")
FACELIFT_REMOTE_DIR  = os.environ.get(
    "FACELIFT_REMOTE_DIR",
    "/home/danman60/projects/StreamStage/expo-assets/decks/facelift-out")
FACELIFT_REMOTE_RUN  = os.environ.get(
    "FACELIFT_REMOTE_RUN",
    "/home/danman60/projects/StreamStage/expo-assets/decks/facelift-run.sh")
# Set FACELIFT_LOCAL=1 to run the build on this machine instead (Linux only).
FACELIFT_LOCAL       = os.environ.get("FACELIFT_LOCAL", "") == "1"
# -n: never let the remote command hold our stdin open, or ssh blocks on dispatch.
SSH = ["ssh", "-n", "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=no",
       "-o", "ConnectTimeout=15"]
# `ssh host 'cmd'` is NON-interactive: .bashrc bails early, nvm never loads, and
# facelift-run.sh dies with `claude exited rc=127`. Verified 2026-07-26. So the
# runner is launched through a login shell with the node bin dir forced on PATH.
FACELIFT_REMOTE_PATH = os.environ.get(
    "FACELIFT_REMOTE_PATH", "/home/danman60/.nvm/versions/node/v22.22.1/bin")

# statuses: idle · queued · running · ready · failed
IDLE_FACELIFT = {"status": "idle", "url": "", "stage": "", "deployed_url": "",
                 "local_url": "", "error": "", "started_at": 0, "updated_at": 0,
                 "before_url": ""}

URL_RE = re.compile(r"^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:[/:?#].*)?$")


def run_capture(cmd, timeout):
    """subprocess.run(capture_output=True) replacement that survives Windows OpenSSH.

    MEASURED ON FIRMAMENT 2026-07-26 (sshdiag.py, python 3.10.11), same host, same
    command, 30s budget:
        run(capture_output=True)              -> TIMEOUT 30.02s
        run(+stdin=DEVNULL)                   -> TIMEOUT 30.01s
        run(no -n)                            -> TIMEOUT 30.01s
        run(inside a daemon thread)           -> TIMEOUT 30.02s
        Popen(stdout=real file handle)        -> 0.08s rc=0, 218 bytes   <-- this
    ssh.exe hands the pipe write end to its posix-emulation layer and never closes
    it, so CPython's Windows reader thread blocks on read() forever and communicate()
    can never return. A real file handle has no reader thread and no EOF to wait for.
    It was never stdin, never `-n`, and never the abandoned dispatch child.

    Returns (rc, stdout_bytes, stderr_bytes). rc is None if the deadline passed.
    """
    fo, fe = tempfile.TemporaryFile(), tempfile.TemporaryFile()
    p = None
    try:
        p = subprocess.Popen(cmd, stdout=fo, stderr=fe, stdin=subprocess.DEVNULL)
        rc = p.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        rc = None
        try:
            p.kill()
        except Exception:
            pass
    finally:
        try:
            fo.seek(0); out = fo.read()
            fe.seek(0); err = fe.read()
        except Exception:
            out, err = b"", b""
        fo.close(); fe.close()
    return rc, out, err


def normalise_url(raw):
    """Accept what a human types on a phone: 'foo.com', 'www.foo.com/x', full urls."""
    u = (raw or "").strip()
    if not u:
        return ""
    if not re.match(r"^https?://", u, re.I):
        u = "https://" + u
    return u if URL_RE.match(u) else ""


# How old a facelift run may be before the phone stops calling it "ready".
# On 2026-08-07 a status.json from JULY 29 still said ready for steppinupdanceco.ca —
# a different studio entirely. The reveal is a live moment in the talk: pressing it
# with a stale status would have put the wrong studio's rebuilt site on the screen in
# front of the room. A facelift is built minutes before it is revealed, never days, so
# anything older than this is leftover state, not a result.
FACELIFT_MAX_AGE_S = 6 * 3600


# ── who owns the URL ─────────────────────────────────────────────────────────
# 2026-08-10, found live during rehearsal: Daniel typed decidedlyjazz.com, the
# runner was correctly given decidedlyjazz.com (proved from the process args),
# and the deck showed streamstageproductions.com with a started_at from the day
# before. Cause: status.json has TWO writers, and the headless session's write
# carries ITS OWN url and started_at, clobbering ours.
# The existing guard only defended `status`. The url matters just as much — it is
# what the room reads off the wall and what the operator checks before revealing.
# So the presenter now keeps its own record, in a file the runner never opens,
# and that record WINS for url/started_at/session. The runner's file is still the
# source of truth for progress (status, stage, deployed_url) — which is all it is
# actually authoritative about.
FACELIFT_OWN = os.path.join(FACELIFT_DIR, "presenter-run.json")


def _own_run():
    try:
        with open(FACELIFT_OWN) as fh:
            return json.load(fh)
    except Exception:
        return {}


def _write_own_run(url, started, session):
    try:
        os.makedirs(FACELIFT_DIR, exist_ok=True)
        tmp = FACELIFT_OWN + ".tmp"
        with open(tmp, "w") as fh:
            json.dump({"url": url, "started_at": int(started), "session": session or ""}, fh)
        os.replace(tmp, FACELIFT_OWN)
    except Exception:
        pass


def facelift_state():
    """Read the runner's status file; fill in what the server can see itself."""
    st = dict(IDLE_FACELIFT)
    raw = {}
    try:
        with open(FACELIFT_STATUS) as fh:
            raw = json.load(fh)
            st.update(raw)
    except Exception:
        pass
    # The status file has TWO writers: facelift-run.sh's say(), which always writes
    # `status`, and the headless Claude session, which is *told* to preserve the keys
    # and does not always do it. Measured 2026-08-09 during a real run: the session
    # rewrote status.json as {"updated_at","url","session","started_at"} — no `status`,
    # no `stage` — so this function fell back to IDLE while a build was actually
    # running, and the phone panel and the deck chip both read IDLE. On stage that
    # invites a second GO (409) and hides a live build. So: never trust the file to
    # carry `status`; infer it when it is missing.
    if not raw.get("status"):
        started = int(st.get("started_at") or 0)
        updated = int(st.get("updated_at") or 0)
        age = int(time.time()) - max(started, updated)
        if started and age <= FACELIFT_MAX_AGE_S:
            st["status"] = "running"
            st["stage"] = raw.get("stage") or "in progress (runner has not reported a stage)"
        else:
            st["status"] = "idle"
    # Age out a stale run rather than presenting it as a result. Kept visible (not
    # silently blanked) so the reason is obvious when it matters.
    try:
        age = int(time.time()) - int(st.get("updated_at") or 0)
        if st.get("status") == "ready" and age > FACELIFT_MAX_AGE_S:
            hrs = age // 3600
            st["status"] = "stale"
            st["error"] = (f"this facelift is {hrs}h old ({st.get('url') or 'unknown site'}) — "
                           "start a fresh one before revealing it")
    except Exception:
        pass
    # The runner may die without writing 'ready'. A built index.html on disk is
    # the real proof the reveal will work, so let the filesystem override.
    if os.path.exists(os.path.join(FACELIFT_SITE, "index.html")):
        st["local_url"] = "/facelift-site/index.html"
        if st.get("status") in ("running", "queued"):
            st["status"] = "ready"
    # OUR dispatch record wins for identity. Only for a run at least as new as the
    # file's, so an old presenter-run.json can never re-label a newer build.
    own = _own_run()
    if own.get("url") and int(own.get("started_at") or 0) >= int(st.get("started_at") or 0):
        st["url"] = own["url"]
        st["started_at"] = int(own["started_at"])
        if own.get("session"):
            st["session"] = own["session"]
    st["fallback_url"] = ("/facelift-fallback/index.html"
                          if os.path.exists(os.path.join(FACELIFT_FALLBACK, "index.html")) else "")
    # The "before" shot for THIS run, if it has landed yet. Tagged with its mtime so a
    # new run's shot is a new URL to the browser and can never be served from cache.
    try:
        st["before_url"] = "/facelift-before.png?t=%d" % int(os.path.getmtime(FACELIFT_BEFORE))
    except OSError:
        st["before_url"] = ""
    return st


def _write_status(**kw):
    st = {"updated_at": int(time.time())}
    st.update(kw)
    tmp = FACELIFT_STATUS + ".tmp"
    with open(tmp, "w") as fh:
        json.dump(st, fh)
    os.replace(tmp, FACELIFT_STATUS)


def _clear_previous_run():
    """A stale 'ready' must never masquerade as this run."""
    os.makedirs(FACELIFT_DIR, exist_ok=True)
    try:
        os.remove(FACELIFT_STATUS)
    except OSError:
        pass
    # The previous studio's "before" shot must never sit under the new url.
    try:
        os.remove(FACELIFT_BEFORE)
    except OSError:
        pass
    if os.path.isdir(FACELIFT_SITE):
        os.rename(FACELIFT_SITE, FACELIFT_SITE + "-prev-%d" % int(time.time()))


def _remote_poll(url, session, started):
    """Mirror the remote run's status locally; pull the site down when it's ready."""
    remote_status = FACELIFT_REMOTE_DIR + "/status.json"
    while True:
        time.sleep(5)
        # Pull the "before" shot as soon as the runner has written it — that is what
        # slide 5 shows while the rebuild runs, so it wants to arrive in seconds, not
        # at the end. One cheap attempt per poll until it lands, then never again.
        if not os.path.exists(FACELIFT_BEFORE):
            # Copy to a side name and rename: scp writes progressively, so copying straight
            # onto before.png publishes a HALF file. Measured 2026-08-10 — the deck picked up
            # the new mtime, swapped to it, and showed a broken image for ~18s while a 4.7 MB
            # shot came over. os.replace is atomic, so the deck only ever sees a whole file.
            part = FACELIFT_BEFORE + ".part"
            rc, _, _ = run_capture(["scp", "-q", "-o", "BatchMode=yes",
                                    "-o", "StrictHostKeyChecking=no",
                                    FACELIFT_REMOTE + ":" + FACELIFT_REMOTE_DIR + "/before.png",
                                    part], 120)
            if rc == 0 and os.path.exists(part) and os.path.getsize(part) > 0:
                os.replace(part, FACELIFT_BEFORE)
            else:
                try:
                    os.remove(part)
                except OSError:
                    pass
        try:
            rc, out, _ = run_capture(SSH + [FACELIFT_REMOTE, "cat " + remote_status], 30)
            if rc is None:
                raise TimeoutError("poll ssh exceeded 30s")
            st = json.loads(out or b"{}")
        except Exception as e:                     # network blip — keep polling
            _write_status(status="running", url=url, stage="link down (%s)" % type(e).__name__,
                          started_at=started, session=session)
            continue
        status = st.get("status", "running")
        # A finished build on the far side is the real proof, exactly as it is locally
        # (see facelift_state's filesystem override). The remote status.json is written
        # partly by the headless Claude session, which has been measured dropping the
        # `status` key entirely — and this poller only pulls the site when it reads
        # "ready". Measured 2026-08-09: the build was complete on the host at 11 min
        # while DART still showed `running` with no local_url, which is the Toronto
        # failure exactly ("the build was never late, the reveal wiring was"). So ask
        # the filesystem too, and stop depending on a key a model may not write.
        if status != "ready":
            rc2, out2, _ = run_capture(
                SSH + [FACELIFT_REMOTE,
                       "test -f %s/site/index.html && echo BUILT" % FACELIFT_REMOTE_DIR], 20)
            if rc2 == 0 and b"BUILT" in (out2 or b""):
                status = "ready"
                st["status"] = "ready"
                st.setdefault("stage", "build found on the host (status file did not say so)")
        st.setdefault("url", url)
        st["session"] = session
        # the runner's status.json has no started_at; without this the deck's
        # elapsed-time readout resets to 1970 the moment the first poll lands.
        st["started_at"] = started
        if status == "ready":
            st["stage"] = "copying build to this laptop"
            _write_status(**st)
            # Pull the built site down so the REVEAL is served locally and can
            # survive the venue network dying between now and the reveal.
            rc, _, cerr = run_capture(["scp", "-q", "-r", "-o", "BatchMode=yes",
                                       "-o", "StrictHostKeyChecking=no",
                                       FACELIFT_REMOTE + ":" + FACELIFT_REMOTE_DIR + "/site",
                                       FACELIFT_SITE], 600)
            if rc == 0 and os.path.exists(os.path.join(FACELIFT_SITE, "index.html")):
                st["stage"] = "done"
                _write_status(**st)
            else:
                st["status"] = "failed"
                st["error"] = "build finished but copy failed: " + \
                              (cerr or b"").decode("utf-8", "replace")[:200]
                _write_status(**st)
            return
        _write_status(**st)
        if status == "failed":
            return


def start_facelift(url):
    """Kick the build off (remote by default) and return (ok, message)."""
    _clear_previous_run()
    started = int(time.time())

    if FACELIFT_LOCAL:
        if not os.path.exists(FACELIFT_RUNNER):
            return False, "facelift-run.sh missing next to presenter-server.py"
        _write_own_run(url, started, "")
        _write_status(status="queued", url=url, stage="starting (local)", started_at=started)
        log = open(os.path.join(FACELIFT_DIR, "runner.log"), "ab")
        subprocess.Popen([FACELIFT_RUNNER, url, FACELIFT_DIR],
                         stdout=log, stderr=subprocess.STDOUT,
                         stdin=subprocess.DEVNULL, start_new_session=True)
        return True, "started (local)"

    session = "facelift-%d" % started
    _write_own_run(url, started, session)
    rdir = FACELIFT_REMOTE_DIR
    # Reset remote state, then run the skill inside tmux so it survives a dropped
    # ssh connection and can be watched live with: tmux attach -t <session>
    inner = ("export PATH={p}:$PATH; exec {run} \"{u}\" \"{d}\" >> {d}/runner.log 2>&1"
             ).format(p=FACELIFT_REMOTE_PATH, run=FACELIFT_REMOTE_RUN, u=url, d=rdir)
    remote_cmd = (
        "mkdir -p {d} && rm -f {d}/status.json && "
        "if [ -d {d}/site ]; then mv {d}/site {d}/site-prev-{ts}; fi && "
        # </dev/null and the redirects stop tmux inheriting ssh's pipes, which
        # would keep the ssh call open until the whole build finished.
        "tmux new-session -d -s {s} \"bash -lc '{inner}'\" </dev/null >/dev/null 2>&1 && "
        "echo DISPATCHED"
    ).format(d=rdir, ts=started, s=session, inner=inner.replace("'", "'\\''"))

    # ssh often does NOT return here even though the remote work ran fine: tmux
    # keeps the channel open. Verified 2026-07-26 — the build completed while ssh
    # sat at 45s. So a timeout is NOT a failure; the poller decides the truth.
    try:
        rc, dout, derr = run_capture(SSH + [FACELIFT_REMOTE, remote_cmd], 20)
        if rc is None:
            pass                               # dispatched; ssh just won't hang up
        elif rc != 0 and b"DISPATCHED" not in (dout or b""):
            err = (derr or b"").decode("utf-8", "replace")[:200]
            _write_status(status="failed", url=url, stage="dispatch",
                          started_at=started, error=err or "remote command failed")
            return False, "remote dispatch failed: " + (err or "unknown")
    except Exception as e:
        _write_status(status="failed", url=url, stage="dispatch",
                      started_at=started, error="ssh to %s failed: %s" % (FACELIFT_REMOTE, e))
        return False, "ssh dispatch failed: %s" % e

    _write_status(status="queued", url=url, stage="dispatched to %s" % FACELIFT_REMOTE,
                  started_at=started, session=session)
    threading.Thread(target=_remote_poll, args=(url, session, started), daemon=True).start()
    return True, "started on %s (tmux %s)" % (FACELIFT_REMOTE, session)


def _demo_token():
    """The demo reset/preflight token. Env first, then a file beside this script.
    NEVER hardcoded and never committed — demo-token.txt is gitignored."""
    t = os.environ.get("DEMO_RESET_TOKEN", "").strip()
    if t:
        return t
    try:
        with open(os.path.join(HERE, "demo-token.txt")) as fh:
            return fh.read().strip()
    except Exception:
        return ""


def _https_json(url, token=None, payload=None, timeout=45):
    """Small stdlib HTTPS helper — the presenter has no third-party deps by design."""
    import urllib.request, urllib.error
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method="POST" if data else "GET")
    req.add_header("content-type", "application/json")
    if token:
        req.add_header("x-demo-token", token)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8", "replace"))
    except Exception as e:
        return {"_error": "%s: %s" % (type(e).__name__, e)}


def preflight_report():
    """Everything the operator needs to know in one tap, from the phone in his hand.

    Same ground the shell preflight covers (tests/preflight.sh), but runnable from the
    stage-side device — because at 9:15 in a strange room nobody is opening a laptop
    terminal. Read-only: this changes nothing.
    """
    checks = []

    def add(cid, status, detail):
        checks.append({"id": cid, "status": status, "detail": detail})

    # -- the deck this presenter is driving
    total = STATE.get("total") or 0
    if total in KNOWN_DECKS:
        add("deck", "pass", "%d slides — %s" % (total, KNOWN_DECKS[total]))
    elif total == 0:
        add("deck", "warn", "no deck has checked in yet — open one on the laptop")
    else:
        add("deck", "fail", "%d slides — %s" % (total, stale_deck_warning(total) or "unknown deck"))

    # -- the booth kiosk, if it is on this machine
    kiosk = None
    for port in (8081, 8080, 8082):
        try:
            import urllib.request
            with urllib.request.urlopen("http://127.0.0.1:%d/health" % port, timeout=3) as r:
                kiosk = json.loads(r.read().decode("utf-8", "replace"))
                kiosk["_port"] = port
                break
        except Exception:
            continue
    if kiosk is None:
        add("kiosk", "warn", "no kiosk on this laptop (fine if the booth is elsewhere)")
    elif kiosk.get("hasTv"):
        add("kiosk", "pass", "up on %d, a TV is connected" % kiosk["_port"])
    else:
        add("kiosk", "warn", "up on %d, but no TV is connected yet" % kiosk["_port"])

    # -- the facelift reveal
    f = facelift_state()
    st = f.get("status")
    if st == "idle":
        add("facelift", "pass", "idle — nothing stale is armed")
    elif st == "ready":
        age = int(time.time()) - int(f.get("updated_at") or 0)
        add("facelift", "warn", "a build from %d min ago is armed (%s)" % (age // 60, f.get("url") or "?"))
    elif st == "stale":
        add("facelift", "pass", "stale build ignored; the reveal falls back to the pre-baked site")
    else:
        add("facelift", "warn", "%s %s" % (st, (f.get("stage") or "")[:40]))

    # -- the live demo (needs internet and the token)
    tok = _demo_token()
    if not tok:
        add("demo", "warn", "no demo token on this laptop — put it in demo-token.txt to check the demo")
    else:
        d = _https_json("https://www.studiosage.ai/api/demo/preflight", token=tok)
        if d.get("_error"):
            add("demo", "fail", "live-demo preflight unreachable (%s)" % d["_error"][:60])
        else:
            for c in d.get("checks", []):
                add("demo:" + c["id"], c.get("status", "fail"), c.get("detail", "")[:110])
    return {"checks": checks, "t": int(time.time())}


def resume_facelift_poll():
    """Re-attach to a run that was still going when this server last stopped.

    status.json is deliberately the source of truth so a restart mid-talk doesn't lose the
    run — but the thread that mirrors the remote build and scp's the site back only ever
    started inside start_facelift(). So before this, restarting the server (or losing the
    console it was launched from) orphaned the build: it kept running on the build host and
    finished fine, and the laptop never pulled it. Verified 2026-07-27 when the FIRMAMENT
    session dropped 15 minutes into a real grandriverdance.com run.
    """
    if FACELIFT_LOCAL:
        return
    # Read through facelift_state() rather than the raw file. The mirrored status.json
    # inherits whatever the remote had, and the headless session has been measured
    # writing it WITHOUT a `status` key — which made this function return immediately
    # and silently never resume, so a restart mid-run orphaned the build a second way.
    # Measured 2026-08-09 on DART. facelift_state() infers `running` from a recent
    # started_at, so one inference serves both the display and this.
    try:
        st = facelift_state()
    except Exception:
        return
    if st.get("status") not in ("queued", "running"):
        return
    if os.path.exists(os.path.join(FACELIFT_SITE, "index.html")):
        return                                  # already pulled; nothing to resume
    url = st.get("url") or ""
    session = st.get("session") or ""
    started = int(st.get("started_at") or time.time())
    print(" facelift: resuming poll for %s (tmux %s)" % (url or "?", session or "?"))
    threading.Thread(target=_remote_poll, args=(url, session, started), daemon=True).start()


def local_ips():
    ips = []
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))          # no traffic sent; just picks the default iface
        ips.append(s.getsockname()[0])
        s.close()
    except Exception:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if ip not in ips and not ip.startswith("127."):
                ips.append(ip)
    except Exception:
        pass
    return ips


REMOTE_PAGE = """<!doctype html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Presenter</title>
<style>
:root{--bg:#0b1016;--panel:#141c25;--ink:#e8f0f7;--dim:#8fa3b5;--cy:#4EC5D4;--am:#F59E0B}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;height:100%;background:var(--bg);color:var(--ink);
  font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;overscroll-behavior:none}
body{display:flex;flex-direction:column}
header{padding:10px 14px;background:var(--panel);display:flex;align-items:center;gap:10px;
  border-bottom:1px solid #223040;padding-top:max(10px,env(safe-area-inset-top))}
#dot{width:10px;height:10px;border-radius:50%;background:#4ade80;flex:none}
#dot.bad{background:#ef4444}
#pos{font-variant-numeric:tabular-nums;font-weight:800;color:var(--cy)}
#title{font-weight:700;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* Every size below is em-relative to main's font-size, so fitNotes() can shrink the whole
   notes page with one variable until the slide's beats fit on ONE phone screen. No scrolling
   on stage: a beat you have to swipe to is a beat you will not read. */
main{flex:1;overflow:hidden;padding:16px 16px 8px;-webkit-overflow-scrolling:touch;font-size:var(--nfs,20px)}
main.spill{overflow-y:auto}
h2{margin:0 0 .55em;font-size:1.3em;line-height:1.15;letter-spacing:-.02em}
ul{margin:0;padding:0;list-style:none}
li{padding:.62em 0;border-bottom:1px solid #1c2733;font-size:1em;line-height:1.35}
li:before{content:"\\25B8";color:var(--am);margin-right:.5em}
li.hot{background:#2a1d05;border-left:6px solid var(--am);border-bottom:none;margin:.45em 0;
  padding:.68em .6em;border-radius:10px;font-size:1.2em;font-weight:800;color:#ffd894}
li.hot:before{content:"\\26A0";color:var(--am)}
li.say{background:#0d1c22;border-left:6px solid var(--cy);border-bottom:none;margin:.45em 0;
  padding:.68em .6em;border-radius:10px;font-size:1.15em;font-style:italic;color:#cdeef3}
li.say:before{content:"\\201C";color:var(--cy);font-size:1.15em}
li.beat{color:var(--dim);font-size:.9em;text-transform:uppercase;letter-spacing:.08em;font-weight:800}
li.beat:before{content:"\\23F8";color:var(--dim)}
.empty{color:var(--dim);font-style:italic}
nav{display:flex;gap:10px;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:var(--panel);
  border-top:1px solid #223040}
/* Rescue row: its own full-width button above the nav so it is unmissable under
   stage light and cannot shrink the Prev/Next thumb zones. Amber, not cyan, so a
   panicked thumb never confuses it with Next. */
#rescuerow{padding:8px 12px 0;background:var(--panel)}
#rescuerow button{width:100%;padding:18px 0;font-size:18px;letter-spacing:.04em;
  background:#3a2a12;color:#f0c579;border:1px solid #6b4a17}
#rescuerow button:active{background:#b8791a;color:#1a1206}
button{flex:1;padding:26px 0;font-size:21px;font-weight:800;border-radius:16px;border:1px solid #2c3d4f;
  background:#1b2734;color:var(--ink);touch-action:manipulation}
button:active{background:var(--cy);color:#06121a}
#next{flex:2}
#jumpbtn{flex:1}
#jump{display:none;position:fixed;inset:0;z-index:20;background:var(--bg);overflow-y:auto;
  padding:14px 14px calc(90px + env(safe-area-inset-bottom));padding-top:max(14px,env(safe-area-inset-top))}
#jump.open{display:block}
#jumplist li{display:flex;gap:12px;align-items:baseline;padding:16px 8px;font-size:19px}
#jumplist li:before{content:none}
#jumplist .n{color:var(--cy);font-weight:800;font-variant-numeric:tabular-nums;min-width:2.2em}
#jumplist li.cur{background:#16222e;border-radius:10px}
#flbar{display:flex;gap:8px;padding:10px 12px;background:#101822;border-bottom:1px solid #223040}
#flurl2{flex:1;min-width:0;padding:14px 12px;font-size:18px;border-radius:10px;border:1px solid #2c3d4f;
  background:#0b1016;color:var(--ink)}
#flgo2{flex:none;padding:0 20px;font-size:17px;font-weight:800;border-radius:10px;border:1px solid #2c3d4f;
  background:#1b2734;color:var(--ink)}
#flgo2:active{background:var(--cy);color:#06121a}
/* Red, full width, above the notes — it must be impossible to mistake for the cyan
   facelift banner, and impossible to miss at a glance from a lectern. */
#stalenote{display:none;padding:10px 14px;font-size:15px;font-weight:800;line-height:1.35;
  background:#3b1111;color:#ffd7d7;border-bottom:1px solid #7d2020}
#flnote{display:none;padding:8px 14px;font-size:15px;font-weight:700;background:#0d1c22;color:var(--cy);
  border-bottom:1px solid #223040}
#flnote.on{display:block}
/* --- facelift panel --- */
#fl{display:none;position:fixed;inset:0;z-index:25;background:var(--bg);overflow-y:auto;
  padding:16px 16px calc(90px + env(safe-area-inset-bottom));padding-top:max(16px,env(safe-area-inset-top))}
#fl.open{display:block}
#pf{display:none;position:fixed;inset:0;z-index:26;background:var(--bg);overflow-y:auto;padding:18px 16px 90px}
#pf.open{display:block}
#pf h3{margin:6px 0 4px}
#pfrun{width:100%;padding:18px 0;font-size:18px;font-weight:800;margin:10px 0 4px}
#pfout{font-size:15px;line-height:1.35;margin:8px 0 4px}
#fl h3{margin:0 0 4px;font-size:22px}
#fl p.sub{margin:0 0 18px;color:var(--dim);font-size:15px}
#flurl{width:100%;padding:16px 14px;font-size:20px;border-radius:12px;border:1px solid #2c3d4f;
  background:#0f1720;color:var(--ink);margin-bottom:12px}
#flgo{width:100%;background:#12414a;border-color:#2b6c78;color:#d7f6fb}
#flstat{margin-top:20px;padding:16px 14px;border-radius:12px;background:var(--panel);border:1px solid #223040}
#flstat .k{color:var(--dim);font-size:13px;text-transform:uppercase;letter-spacing:.08em}
#flstat .v{font-size:19px;font-weight:800;margin-bottom:10px;word-break:break-all}
#flstat .v.ready{color:#4ade80}#flstat .v.failed{color:#ef4444}#flstat .v.running{color:var(--am)}
#flrow{display:flex;gap:10px;margin-top:14px}
#flrow button{padding:16px 0;font-size:16px}
</style></head><body>
<header><span id="dot"></span><span id="pos">-/-</span><span id="title">connecting…</span></header>
<div id="flbar">
  <input id="flurl2" type="url" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="their-studio.com">
  <button id="flgo2">GO</button>
</div>
<div id="flnote"></div>
<div id="stalenote"></div>
<main><h2 id="h"></h2><ul id="beats"></ul></main>
<section id="jump"><ul id="jumplist"></ul></section>
<section id="fl">
  <h3>Website facelift</h3>
  <p class="sub">Type the studio's web address from the room, then GO. It cooks in the background while you talk.</p>
  <input id="flurl" type="url" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="theirstudio.com">
  <button id="flgo">GO &mdash; start the rebuild</button>
  <div id="flstat">
    <div class="k">status</div><div class="v" id="flv">idle</div>
    <div class="k">their url</div><div class="v" id="flu">&mdash;</div>
    <div class="k">reveal</div><div class="v" id="flr">&mdash;</div>
  </div>
  <div id="flrow"><button id="flclose">Close</button><button id="flreset">CLEAR FACELIFT</button></div>
</section>
<section id="pf">
  <h3>Preflight</h3>
  <p class="sub">One tap, before you go up. Checks the deck, the booth, the reveal and the live demo. Changes nothing.</p>
  <button id="pfrun">RUN PREFLIGHT</button>
  <div id="pfout"></div>
  <!-- Both resets in one place, because they are the same job: put the show back to
       cold. "Reset demo" clears StudioSage's demo tenant; "Clear facelift" clears the
       rebuild run so the reveal is not armed with a stale build (and preflight stops
       flagging it). The facelift panel has the same clear on its own row. -->
  <div id="flrow"><button id="pfclose">Close</button><button id="pfclearfl">Clear facelift</button><button id="pfreset">Reset demo</button></div>
</section>
<div id="rescuerow"><button id="animbtn">&#9656; ANIMATED DEMO &mdash; rescue</button></div>
<nav><button id="prev">Prev</button><button id="flbtn">&#9733;</button><button id="pfbtn">&#10003;</button><button id="jumpbtn">Jump</button><button id="next">Next &rsaquo;</button></nav>
<script>
var lastSeq=-1, dot=document.getElementById('dot');
function send(action){
  fetch('/cmd',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({action:action})}).catch(function(){});
}
document.getElementById('prev').onclick=function(){send('prev')};
document.getElementById('next').onclick=function(){send('next')};
document.getElementById('animbtn').onclick=function(){
  send('animdemo');
  var b=this, t=b.textContent;                 // confirm the tap landed — no time to wonder on stage
  b.textContent='→ ANIMATED DEMO'; setTimeout(function(){b.textContent=t;},1400);
};
var jump=document.getElementById('jump');
document.getElementById('jumpbtn').onclick=function(){jump.classList.toggle('open')};
/* ---- preflight, from the phone in his hand ------------------------------
   At 9:15 in a strange room nobody opens a laptop terminal, so the same
   checks the shell preflight runs are one tap away here. Read-only except
   the explicit "Reset demo KB" button, which only ever touches the DEMO
   tenant — never a customer. */
var pf=document.getElementById('pf'), pfout=document.getElementById('pfout');
document.getElementById('pfbtn').onclick=function(){pf.classList.toggle('open'); };
document.getElementById('pfclose').onclick=function(){pf.classList.remove('open')};
function pfPaint(d){
  var col={pass:'#22c55e',warn:'#f59e0b',fail:'#ef4444'};
  pfout.innerHTML=(d.checks||[]).map(function(c){
    return '<div style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid #1f2937">'
      + '<b style="color:'+(col[c.status]||'#9ca3af')+';min-width:52px;font:800 13px/1.4 monospace">'
      + c.status.toUpperCase()+'</b>'
      + '<span style="flex:1"><b style="opacity:.75">'+c.id+'</b><br>'+c.detail+'</span></div>';
  }).join('') || '<i>no checks returned</i>';
}
document.getElementById('pfrun').onclick=function(){
  var b=this; b.textContent='CHECKING…'; b.disabled=true;
  fetch('/preflight',{cache:'no-store'}).then(function(r){return r.json();})
   .then(function(d){pfPaint(d); b.textContent='RUN PREFLIGHT'; b.disabled=false;})
   .catch(function(e){pfout.textContent='could not run: '+e; b.textContent='RUN PREFLIGHT'; b.disabled=false;});
};
/* RESET DEMO — a fresh demo environment, not just a fresh knowledge base.
   It used to send {} (email-only re-arm) under a button that said "Reset demo KB",
   and it left the conversation wall standing: the room's texts from the last run
   were still down the right-hand side of the live-demo slide while he told the
   next room it knew nothing yet. It now sends seeds + wall, which is the API's
   own "cold start" combination (StudioSage /api/demo/reset). The deck notices the
   rows disappear on its next 2s poll and rebuilds the scene empty by itself. */
/* RESET DEMO — a cold demo environment, not a fresh knowledge base.
   Daniel's expectation, verbatim: "the new button will remove all knowledge base and
   all all of text but keep the SMS number and QR code and the robot will be there now
   and this will be a fresh environment ready for testing so as soon as the email hits
   the Calgary ingest email endpoint it will correctly parse it and then when phones
   text that number it'll automatically start answering without need for onboarding."
   So: {wipe:true, wall:true} — EVERY knowledge-base row (seeds included) and EVERY
   text off the wall. The number, the QR and the ingest address are configuration, not
   data, so nothing needs re-arming afterwards. The button used to say "Reset demo KB"
   and send {} — an email-only re-arm that left the last room's texts on the wall. */
document.getElementById('pfreset').onclick=function(){
  /* \\n, not \n: this whole page is a normal (non-raw) Python string, so a single backslash-n
     becomes a REAL newline inside the JS string literal — an unterminated string, a
     SyntaxError, and the entire remote script dies. Measured 2026-08-10: the phone remote sat
     on "connecting…" with -/- for the slide and no working button. */
  if(!confirm('COLD DEMO: erase the whole demo knowledge base AND every text on the wall.\\n\\nThe number, the QR and the ingest address stay. Demo tenant only.'))return;
  var b=this; b.textContent='resetting…'; b.disabled=true;
  fetch('/demo-reset',{method:'POST',headers:{'content-type':'application/json'},
                       body:JSON.stringify({wipe:true,wall:true})})
   .then(function(r){return r.json();})
   .then(function(d){ b.textContent=d.ok?'reset ✓':'failed'; b.disabled=false;
                      if(!d.ok){pfout.textContent=d.error||'reset failed'; return;}
                      var res=d.result||{}, del=res.deleted||{}, st=res.state||{};
                      pfout.textContent='cold demo — knowledge base erased ('+(del.ingested_kb||0)
                        +' entries), wall cleared ('+(del.wall_messages||0)
                        +' texts), emails cleared ('+(del.original_emails||0)
                        +'). KB now holds '+(st.kb_total===undefined?'?':st.kb_total)
                        +'. Forward one email to calgary@ingest.studiosage.ai to prove it.';
                      setTimeout(function(){document.getElementById('pfrun').click();},400); })
   .catch(function(e){ b.textContent='failed'; b.disabled=false; pfout.textContent=''+e; });
};
function paintJump(s){
  var ul=document.getElementById('jumplist');
  if(ul.dataset.n==String((s.titles||[]).length)){          // list is stable; just move the marker
    Array.prototype.forEach.call(ul.children,function(li,i){li.classList.toggle('cur',i===s.idx);});
    return;
  }
  ul.innerHTML=''; ul.dataset.n=String((s.titles||[]).length);
  (s.titles||[]).forEach(function(t,i){
    var li=document.createElement('li');
    li.innerHTML='<span class="n">'+(i+1)+'</span><span>'+t+'</span>';
    if(i===s.idx)li.className='cur';
    li.onclick=function(){
      fetch('/cmd',{method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({action:'goto',i:i})}).catch(function(){});
      jump.classList.remove('open');
    };
    ul.appendChild(li);
  });
}
function paint(s){
  document.getElementById('pos').textContent=(s.idx+1)+'/'+s.total;
  /* Stale-deck alarm. The phone is the only screen Daniel looks at while presenting,
     so a wrong deck has to shout HERE or it will not be noticed until he is on stage
     driving slides that do not match what the room is seeing. */
  var st=document.getElementById('stalenote');
  if(s.stale){ st.textContent=s.stale; st.style.display='block'; }
  else { st.style.display='none'; }
  document.getElementById('title').textContent=s.title||'';
  document.getElementById('h').textContent=s.title||'';
  var ul=document.getElementById('beats'); ul.innerHTML='';
  if(!s.beats||!s.beats.length){
    var li=document.createElement('li'); li.className='empty'; li.textContent='no beats for this slide';
    ul.appendChild(li);
  } else {
    s.beats.forEach(function(b){
      var li=document.createElement('li'), t=b;
      if(t.indexOf('!!')===0){li.className='hot';t=t.slice(2);}          // must-say / must-do
      else if(t.indexOf('>>')===0){li.className='say';t=t.slice(2);}     // say it close to verbatim
      else if(t.indexOf('..')===0){li.className='beat';t=t.slice(2);}    // stage direction / pause
      li.textContent=t.trim(); ul.appendChild(li);
    });
  }
  document.querySelector('main').scrollTop=0;
  fitNotes();
  paintJump(s);
}
/* Shrink the notes until they fit the screen. 20px is the comfortable size; we only go down
   from there, and only as far as 12px — below that it stops being readable at arm's length,
   so the page is allowed to scroll instead (and says so by getting a scrollbar back). */
function fitNotes(){
  var m=document.querySelector('main');
  m.classList.remove('spill');
  for(var px=20; px>=12; px-=0.5){
    m.style.setProperty('--nfs', px+'px');
    if(m.scrollHeight<=m.clientHeight) break;
  }
  /* Always re-check at the end instead of returning early from the loop. The old version
     returned the moment a size fitted, so anything that STOLE HEIGHT afterwards left the
     page clipped by overflow:hidden with no scrollbar and no way to reach the lost lines.
     Measured on a Pixel 9 Pro at 384dp: scrollHeight 559 vs clientHeight 533 — the last beat
     was 26px past the fold and unreachable. */
  if(m.scrollHeight>m.clientHeight) m.classList.add('spill');
}
window.addEventListener('resize',fitNotes);
window.addEventListener('orientationchange',function(){setTimeout(fitNotes,250);});
/* What steals the height: #flnote is display:none until the first /state poll says the
   facelift is armed, and #flbar can wrap on a narrow phone. Both sit ABOVE main, so when they
   appear main gets shorter after fitNotes has already run. Watch the chrome above the notes
   and re-fit. Deliberately NOT observing main itself — fitNotes resizes main, which would
   feed straight back into the observer. */
if(window.ResizeObserver){
  var refit=new ResizeObserver(function(){fitNotes();});
  ['header','#flbar','#flnote'].forEach(function(sel){
    var el=document.querySelector(sel); if(el) refit.observe(el);
  });
}
/* Late-loading font metrics move the same lines on a cold phone. */
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(fitNotes);
/* ---- facelift panel ---- */
var fl=document.getElementById('fl');
document.getElementById('flbtn').onclick=function(){fl.classList.toggle('open')};
document.getElementById('flclose').onclick=function(){fl.classList.remove('open')};
document.getElementById('flgo').onclick=function(){
  var u=document.getElementById('flurl').value;
  if(!u){return;}
  document.getElementById('flv').textContent='sending…';
  fetch('/facelift',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({action:'start',url:u})})
    .then(function(r){return r.json()})
    .then(function(d){ if(!d.ok){document.getElementById('flv').textContent=d.error||'failed to start';}
                       if(d.facelift)paintFl(d.facelift); })
    .catch(function(){document.getElementById('flv').textContent='no connection to laptop'});
};
/* CLEAR FACELIFT — forget the run entirely: both status files go, the panel goes back
   to idle, and the deck's reveal falls through to the pre-baked fallback instead of
   opening full screen on the last studio that was rebuilt. Live on two buttons (the
   facelift panel and, beside "Reset demo", the preflight panel) because clearing the
   demo and clearing the facelift are the same act — putting the show back to cold. */
function clearFacelift(b){
  var t=b?b.textContent:null;
  if(b){b.textContent='clearing…'; b.disabled=true;}
  fetch('/facelift',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({action:'reset'})}).then(function(r){return r.json()})
    .then(function(d){
      if(d.facelift)paintFl(d.facelift);
      if(b){b.textContent='cleared ✓'; b.disabled=false;
            setTimeout(function(){b.textContent=t;},1600);}
    })
    .catch(function(e){ if(b){b.textContent='failed'; b.disabled=false;
                             setTimeout(function(){b.textContent=t;},1600);} });
}
document.getElementById('flreset').onclick=function(){ clearFacelift(this); };
document.getElementById('pfclearfl').onclick=function(){
  clearFacelift(this);
  setTimeout(function(){document.getElementById('pfrun').click();},600);
};
function flStart(u){
  if(!u){return;}
  fetch('/facelift',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({action:'start',url:u})})
    .then(function(r){return r.json()})
    .then(function(d){ if(d.facelift)paintFl(d.facelift); }).catch(function(){});
}
document.getElementById('flgo2').onclick=function(){
  var el=document.getElementById('flurl2');
  flStart(el.value); el.blur();
};
document.getElementById('flurl2').addEventListener('keydown',function(e){
  if(e.key==='Enter'){e.preventDefault();flStart(this.value);this.blur();}
});
function paintFl(f){
  if(!f)return;
  var v=document.getElementById('flv');
  v.textContent=f.status+(f.stage?' · '+f.stage:'');
  v.className='v '+(f.status==='ready'?'ready':f.status==='failed'?'failed':f.status==='running'||f.status==='queued'?'running':'');
  document.getElementById('flu').textContent=f.url||'—';
  var note=document.getElementById('flnote');
  if(f && f.status && f.status!=='idle'){
    note.classList.add('on');
    note.textContent='facelift: '+f.status+(f.url?(' · '+f.url):'');
  } else { note.classList.remove('on'); }
  var r=f.deployed_url||f.local_url||'';
  document.getElementById('flr').textContent=r?r:(f.error?('error: '+f.error):'—');
}
function poll(){
  fetch('/state',{cache:'no-store'}).then(function(r){return r.json()}).then(function(s){
    dot.classList.remove('bad');
    if(s.seq!==lastSeq){lastSeq=s.seq;paint(s);}
    paintFl(s.facelift);
  }).catch(function(){dot.classList.add('bad')});
}
setInterval(poll,400); poll();
</script></body></html>"""


class Handler(http.server.SimpleHTTPRequestHandler):
    # HTTP/1.1 so keep-alive works and the browser stops reopening a socket
    # per video chunk.
    protocol_version = "HTTP/1.1"

    def _serve_range(self):
        """Serve a byte range for static files.

        SimpleHTTPRequestHandler ignores Range entirely and answers 200 with the
        whole body. For a 37 MB video that means: no seeking (the scrub bar
        snaps back to 0), and Safari-based clients refuse the <video> outright
        because they require 206. Measured on FIRMAMENT 2026-08-06:
        `Range: bytes=0-1000` came back `200` with all 37,866,989 bytes.

        Returns True if it handled the request. Falls through to the normal
        path for anything it does not understand, so a malformed Range header
        degrades to the old behaviour rather than failing.
        """
        rng = self.headers.get("Range")
        if not rng or not rng.strip().lower().startswith("bytes="):
            return False
        path = self.translate_path(self.path)
        if not os.path.isfile(path):
            return False
        try:
            size = os.path.getsize(path)
            spec = rng.split("=", 1)[1].strip()
            if "," in spec:                       # multi-range: not worth it
                return False
            first, _, last = spec.partition("-")
            if first == "":                       # suffix form: bytes=-500
                length = int(last)
                if length <= 0:
                    return False
                start, end = max(0, size - length), size - 1
            else:
                start = int(first)
                end = int(last) if last else size - 1
            end = min(end, size - 1)
            if start > end or start >= size:
                self.send_response(416)
                self.send_header("content-range", "bytes */%d" % size)
                self.send_header("content-length", "0")
                self.end_headers()
                return True
        except (ValueError, OSError):
            return False

        ctype = self.guess_type(path)
        length = end - start + 1
        try:
            f = open(path, "rb")
        except OSError:
            return False
        with f:
            f.seek(start)
            self.send_response(206)
            self.send_header("content-type", ctype)
            self.send_header("content-range", "bytes %d-%d/%d" % (start, end, size))
            self.send_header("content-length", str(length))
            self.send_header("accept-ranges", "bytes")
            self.end_headers()
            remaining = length
            while remaining > 0:
                chunk = f.read(min(64 * 1024, remaining))
                if not chunk:
                    break
                try:
                    self.wfile.write(chunk)
                except (BrokenPipeError, ConnectionResetError):
                    # the browser seeked away mid-chunk; normal, not an error
                    return True
                remaining -= len(chunk)
        return True

    def end_headers(self):
        # advertise range support on every static response so the browser will
        # even try to seek
        if not self.path.startswith(("/state", "/cmd", "/facelift", "/demo-", "/remote")):
            self.send_header("accept-ranges", "bytes")
        super().end_headers()

    def _json(self, obj, code=200):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.send_header("cache-control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.startswith("/facelift-before.png"):
            # the studio's site as it is TODAY — one file, whatever the run id.
            # Cache-busting lives in the ?t= the deck is handed by /facelift.
            self.path = "/facelift-out/before.png"
            return super().do_GET()
        if self.path.startswith("/facelift-site"):
            # stable alias -> facelift-out/site/... so the deck never has to know
            # where the runner drops the build
            self.path = self.path.replace("/facelift-site", "/facelift-out/site", 1)
            return super().do_GET()
        # /facelift (+query) is the status API; /facelift-fallback/... and
        # /facelift-out/... are plain static dirs and must fall through.
        if self.path == "/facelift" or self.path.startswith("/facelift?"):
            return self._json(facelift_state())
        if self.path.startswith("/remote"):
            body = REMOTE_PAGE.encode()
            self.send_response(200)
            self.send_header("content-type", "text/html; charset=utf-8")
            self.send_header("content-length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if self.path.startswith("/preflight"):    # phone: one-tap show check
            return self._json(preflight_report())
        if self.path.startswith("/demo-kb"):      # live scene: knowledge feed
            return self._json(demo_feed("kb"))
        if self.path.startswith("/demo-wall"):    # live scene: text feed
            return self._json(demo_feed("wall"))
        if self.path.startswith("/state"):
            with _lock:
                out = dict(STATE)
            out["facelift"] = facelift_state()
            return self._json(out)
        # /cmdlog MUST be tested before /cmd — startswith("/cmd") matches "/cmdlog"
        # too, and GET /cmd is DESTRUCTIVE: it hands the queue to the caller and
        # clears it. Reading the log would have eaten the phone's next press.
        if self.path.startswith("/cmdlog"):       # who moved the deck, and from where
            with _lock:
                return self._json({"entries": list(CMDLOG)})
        if self.path.startswith("/cmd"):          # deck drains queued commands
            with _lock:
                out = list(PENDING)
                PENDING.clear()
            if out:
                _cmdlog("DRAIN", ",".join(out), self.client_address[0],
                        self.headers.get("user-agent", ""))
            return self._json({"cmds": out})
        if self._serve_range():
            return
        return super().do_GET()

    def do_POST(self):
        n = int(self.headers.get("content-length") or 0)
        try:
            data = json.loads(self.rfile.read(n) or b"{}")
        except Exception:
            data = {}
        if self.path.startswith("/state"):        # deck reports where it is
            with _lock:
                STATE.update({
                    "idx": int(data.get("idx", 0)),
                    "total": int(data.get("total", 0)),
                    "title": str(data.get("title", "")),
                    "beats": list(data.get("beats", []))[:24],
                    "titles": list(data.get("titles", STATE.get("titles", [])))[:60],
                })
                STATE["stale"] = stale_deck_warning(STATE["total"])
                STATE["seq"] += 1
            return self._json({"ok": True})
        if self.path.startswith("/demo-reset"):    # phone: a FRESH DEMO, not just a fresh KB
            tok = _demo_token()
            if not tok:
                return self._json({"ok": False,
                                   "error": "no demo token on this laptop (demo-token.txt)"}, 400)
            # The phone asks for wipe + wall: erase the knowledge base entirely and clear
            # the wall. Both default TRUE here so an older cached /remote page, or a curl
            # with an empty body, gets the cold environment the button now promises rather
            # than the old email-only re-arm. `seeds` is passed through only if a caller
            # explicitly asks for it — it is the opposite instruction to a wipe.
            payload = {"wipe": data.get("wipe", True) is not False,
                       "wall": data.get("wall", True) is not False}
            if data.get("seeds") is True and data.get("wipe") is not True:
                payload = {"seeds": True, "wall": payload["wall"]}
            r = _https_json("https://www.studiosage.ai/api/demo/reset",
                            token=tok, payload=payload)
            if r.get("_error"):
                return self._json({"ok": False, "error": r["_error"][:120]}, 502)
            return self._json({"ok": True, "result": r})
        if self.path.startswith("/facelift"):      # phone kicks off the rebuild
            action = data.get("action") or "start"
            if action == "reset":
                for _p in (FACELIFT_STATUS, FACELIFT_OWN):
                    try:
                        os.remove(_p)
                    except OSError:
                        pass
                return self._json({"ok": True, "facelift": facelift_state()})
            url = normalise_url(data.get("url"))
            if not url:
                return self._json({"ok": False, "error": "that doesn't look like a web address"}, 400)
            cur = facelift_state()
            if cur["status"] in ("queued", "running") and not data.get("force"):
                return self._json({"ok": False, "error": "a run is already going — hold Reset to clear it",
                                   "facelift": cur}, 409)
            ok, msg = start_facelift(url)
            return self._json({"ok": ok, "error": "" if ok else msg,
                               "facelift": facelift_state()}, 200 if ok else 500)
        if self.path.startswith("/cmd"):          # phone presses a button
            a = data.get("action")
            # WHO MOVED THE DECK. On 2026-08-10 the deck stepped back a slide with
            # nobody at the laptop, and there was no way to tell whether that came
            # from the phone's Prev, the volume rocker (which sends prev in
            # PRESENTER mode, screen off included), a stray tab, or the deck itself.
            # Every command is now recorded with its source address, readable at
            # GET /cmdlog. Costs one dict per press and answers the question.
            _cmdlog("POST", str(a), self.client_address[0],
                    self.headers.get("user-agent", ""))
            if a in ("next", "prev"):
                with _lock:
                    PENDING.append(a)
            elif a == "goto":
                try:
                    with _lock:
                        PENDING.append("goto:%d" % int(data.get("i", 0)))
                except Exception:
                    pass
            elif a == "animdemo":
                # The rescue: jump to the animated offline demo. Same thing the O key
                # and the on-slide "Animated version" button do, but from the phone, so
                # it does not need him to reach the laptop mid-demo.
                with _lock:
                    PENDING.append("animdemo")
            elif a == "facelift":
                # talk1 keeps the rebuild on an overlay rather than a slide, so the phone
                # needs a way to pop it. talk2 ignores this command harmlessly.
                with _lock:
                    PENDING.append("facelift")
            return self._json({"ok": True})
        return self._json({"error": "unknown"}, 404)

    def log_message(self, *a):                    # keep the console quiet
        pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    decks = [f for f in os.listdir(".") if f.endswith(".html") and "deck" in f.lower()]

    # ---- ports, settled BEFORE anything is printed, so every address below
    # ---- is an address that actually answers.
    WANTED = PORT
    chosen = pick_port(WANTED)
    if chosen is None:
        print("=" * 58)
        print(" THE PRESENTER REMOTE COULD NOT START — no free port.")
        print("=" * 58)
        print(" Nothing between %d and %d is free. Something on this laptop" % (WANTED, WANTED + 19))
        print(" is using a lot of ports.")
        print("")
        print(" What to do:")
        print("   1. Close any other presenter windows and try again.")
        print("   2. Or pick a port yourself:  PRESENTER_PORT=9100 python3 presenter-server.py")
        sys.exit(1)
    PORT = chosen

    print("=" * 58)
    print(" PRESENTER REMOTE")
    print("=" * 58)
    if PORT != WANTED:
        # Two very different reasons land here and they used to print the same
        # sentence. "ALREADY IN USE" against 8080 sent a reader hunting for a
        # process that does not exist and cannot exist: pick_port SKIPS 8080 and
        # 8081 outright, so asking for one is refused by this file, not by the
        # operating system. Freeing the port would change nothing. Say which it is.
        if WANTED in KIOSK_PORTS:
            print(" PORT %d IS RESERVED FOR THE BOOTH KIOSK — the remote is on %d." % (WANTED, PORT))
            print("")
            print(" Nothing is 'in use'. This server REFUSES 8080 and 8081 by design:")
            print(" expo-assets/kiosk/serve.py owns them, its address is printed on the")
            print(" booth sheet and bookmarked on the Fire Stick, so the presenter moves.")
            print(" Setting PRESENTER_PORT=%d cannot work — do not keep retrying it." % WANTED)
        else:
            print(" PORT %d WAS ALREADY IN USE — the remote moved to %d." % (WANTED, PORT))
            print("")
            print(" What is probably already on %d:" % WANTED)
            print("   - another copy of this presenter server, in a window you left open")
            print("   - the booth kiosk, if you started it with --port %d" % WANTED)
        print("")
        print(" THE ADDRESSES BELOW ARE THE REAL ONES. Any QR image or bookmark")
        print(" made for port %d is wrong." % WANTED)
        print("=" * 58)
    for d in sorted(decks):                       # both talks live in this folder now
        print(" laptop :  http://localhost:%d/%s" % (PORT, d))
    here = os.path.dirname(os.path.abspath(__file__))
    shown = False
    for ip in local_ips():
        print(" phone  :  http://%s:%d/remote" % (ip, PORT))
        png = "QR-remote-%s.png" % ip
        if os.path.exists(os.path.join(here, png)):
            print("           ^ scan %s in this folder (double-click it)" % png)
            shown = True
    if not shown:
        print("\n (no QR image for this network - type the phone url above by hand.")
        print("  to add one, ask Claude for QR-remote-<ip>.png)")
    print("\n Phone must be on the same wifi / the laptop's hotspot.")
    print(" Ctrl-C to stop.\n")
    resume_facelift_poll()
    try:
        srv = Server(("0.0.0.0", PORT), Handler)
    except OSError as exc:
        # port_free() said yes a moment ago, so this is a genuine surprise
        # (a race, or a firewall refusal). Still no stack trace on stage.
        print("")
        print(" THE PRESENTER REMOTE COULD NOT START.")
        print(" It could not open port %d: %s" % (PORT, exc))
        print(" Most likely something grabbed the port in the last second, or")
        print(" Windows Firewall blocked it (say YES to 'Allow Python on private")
        print(" networks'). Try again, or: PRESENTER_PORT=9100 python3 presenter-server.py")
        sys.exit(1)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        sys.exit(0)
