#!/usr/bin/env python3
"""
Presenter remote for the expo decks.

Run this from the folder that holds the deck html, then:
  - laptop:  http://localhost:8080/talk2-deck.html   (or talk2-ai.html locally)
  - phone:   http://<laptop-ip>:8080/remote          (join the laptop's hotspot first)

The phone page shows the current slide's beats and has big Prev/Next thumb zones.
Stdlib only - no pip, no npm, nothing to install at the venue.

Volume buttons cannot be used: no mobile browser exposes them to a web page.
Tap zones instead (and they can't accidentally change your volume mid-talk).
"""
import http.server, socketserver, json, socket, sys, os, threading, re, subprocess, time

PORT = int(os.environ.get("PRESENTER_PORT", "8080"))

_lock = threading.Lock()
STATE = {"idx": 0, "total": 0, "title": "", "beats": [], "titles": [], "seq": 0}
PENDING = []          # commands from the phone, consumed by the deck

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
                 "local_url": "", "error": "", "started_at": 0, "updated_at": 0}

URL_RE = re.compile(r"^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:[/:?#].*)?$")


def normalise_url(raw):
    """Accept what a human types on a phone: 'foo.com', 'www.foo.com/x', full urls."""
    u = (raw or "").strip()
    if not u:
        return ""
    if not re.match(r"^https?://", u, re.I):
        u = "https://" + u
    return u if URL_RE.match(u) else ""


def facelift_state():
    """Read the runner's status file; fill in what the server can see itself."""
    st = dict(IDLE_FACELIFT)
    try:
        with open(FACELIFT_STATUS) as fh:
            st.update(json.load(fh))
    except Exception:
        pass
    # The runner may die without writing 'ready'. A built index.html on disk is
    # the real proof the reveal will work, so let the filesystem override.
    if os.path.exists(os.path.join(FACELIFT_SITE, "index.html")):
        st["local_url"] = "/facelift-site/index.html"
        if st.get("status") in ("running", "queued"):
            st["status"] = "ready"
    st["fallback_url"] = ("/facelift-fallback/index.html"
                          if os.path.exists(os.path.join(FACELIFT_FALLBACK, "index.html")) else "")
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
    if os.path.isdir(FACELIFT_SITE):
        os.rename(FACELIFT_SITE, FACELIFT_SITE + "-prev-%d" % int(time.time()))


def _remote_poll(url, session, started):
    """Mirror the remote run's status locally; pull the site down when it's ready."""
    remote_status = FACELIFT_REMOTE_DIR + "/status.json"
    while True:
        time.sleep(5)
        try:
            out = subprocess.run(SSH + [FACELIFT_REMOTE, "cat " + remote_status],
                                 capture_output=True, timeout=30).stdout
            st = json.loads(out or b"{}")
        except Exception as e:                     # network blip — keep polling
            _write_status(status="running", url=url, stage="link down (%s)" % type(e).__name__,
                          started_at=started, session=session)
            continue
        status = st.get("status", "running")
        st.setdefault("url", url)
        st["session"] = session
        if status == "ready":
            st["stage"] = "copying build to this laptop"
            _write_status(**st)
            # Pull the built site down so the REVEAL is served locally and can
            # survive the venue network dying between now and the reveal.
            r = subprocess.run(["scp", "-q", "-r", "-o", "BatchMode=yes",
                                FACELIFT_REMOTE + ":" + FACELIFT_REMOTE_DIR + "/site",
                                FACELIFT_SITE], capture_output=True, timeout=600)
            if r.returncode == 0 and os.path.exists(os.path.join(FACELIFT_SITE, "index.html")):
                st["stage"] = "done"
                _write_status(**st)
            else:
                st["status"] = "failed"
                st["error"] = "build finished but copy failed: " + \
                              (r.stderr or b"").decode("utf-8", "replace")[:200]
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
        _write_status(status="queued", url=url, stage="starting (local)", started_at=started)
        log = open(os.path.join(FACELIFT_DIR, "runner.log"), "ab")
        subprocess.Popen([FACELIFT_RUNNER, url, FACELIFT_DIR],
                         stdout=log, stderr=subprocess.STDOUT,
                         stdin=subprocess.DEVNULL, start_new_session=True)
        return True, "started (local)"

    session = "facelift-%d" % started
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
        r = subprocess.run(SSH + [FACELIFT_REMOTE, remote_cmd],
                           capture_output=True, timeout=20)
        if r.returncode != 0 and b"DISPATCHED" not in (r.stdout or b""):
            err = (r.stderr or b"").decode("utf-8", "replace")[:200]
            _write_status(status="failed", url=url, stage="dispatch",
                          started_at=started, error=err or "remote command failed")
            return False, "remote dispatch failed: " + (err or "unknown")
    except subprocess.TimeoutExpired:
        pass                                   # dispatched; ssh just won't hang up
    except Exception as e:
        _write_status(status="failed", url=url, stage="dispatch",
                      started_at=started, error="ssh to %s failed: %s" % (FACELIFT_REMOTE, e))
        return False, "ssh dispatch failed: %s" % e

    _write_status(status="queued", url=url, stage="dispatched to %s" % FACELIFT_REMOTE,
                  started_at=started, session=session)
    threading.Thread(target=_remote_poll, args=(url, session, started), daemon=True).start()
    return True, "started on %s (tmux %s)" % (FACELIFT_REMOTE, session)


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
main{flex:1;overflow-y:auto;padding:16px 16px 8px;-webkit-overflow-scrolling:touch}
h2{margin:0 0 14px;font-size:26px;line-height:1.15;letter-spacing:-.02em}
ul{margin:0;padding:0;list-style:none}
li{padding:13px 0;border-bottom:1px solid #1c2733;font-size:20px;line-height:1.4}
li:before{content:"\\25B8";color:var(--am);margin-right:10px}
li.hot{background:#2a1d05;border-left:6px solid var(--am);border-bottom:none;margin:10px 0;
  padding:16px 14px;border-radius:10px;font-size:24px;font-weight:800;color:#ffd894}
li.hot:before{content:"\\26A0";color:var(--am)}
li.say{background:#0d1c22;border-left:6px solid var(--cy);border-bottom:none;margin:10px 0;
  padding:16px 14px;border-radius:10px;font-size:23px;font-style:italic;color:#cdeef3}
li.say:before{content:"\\201C";color:var(--cy);font-size:26px}
li.beat{color:var(--dim);font-size:18px;text-transform:uppercase;letter-spacing:.08em;font-weight:800}
li.beat:before{content:"\\23F8";color:var(--dim)}
.empty{color:var(--dim);font-style:italic}
nav{display:flex;gap:10px;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:var(--panel);
  border-top:1px solid #223040}
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
#flnote{display:none;padding:8px 14px;font-size:15px;font-weight:700;background:#0d1c22;color:var(--cy);
  border-bottom:1px solid #223040}
#flnote.on{display:block}
/* --- facelift panel --- */
#fl{display:none;position:fixed;inset:0;z-index:25;background:var(--bg);overflow-y:auto;
  padding:16px 16px calc(90px + env(safe-area-inset-bottom));padding-top:max(16px,env(safe-area-inset-top))}
#fl.open{display:block}
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
  <div id="flrow"><button id="flclose">Close</button><button id="flreset">Reset run</button></div>
</section>
<nav><button id="prev">Prev</button><button id="flbtn">&#9733;</button><button id="jumpbtn">Jump</button><button id="next">Next &rsaquo;</button></nav>
<script>
var lastSeq=-1, dot=document.getElementById('dot');
function send(action){
  fetch('/cmd',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({action:action})}).catch(function(){});
}
document.getElementById('prev').onclick=function(){send('prev')};
document.getElementById('next').onclick=function(){send('next')};
var jump=document.getElementById('jump');
document.getElementById('jumpbtn').onclick=function(){jump.classList.toggle('open')};
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
  paintJump(s);
}
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
document.getElementById('flreset').onclick=function(){
  fetch('/facelift',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({action:'reset'})}).then(function(r){return r.json()})
    .then(function(d){if(d.facelift)paintFl(d.facelift)}).catch(function(){});
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
    def _json(self, obj, code=200):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.send_header("cache-control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
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
        if self.path.startswith("/state"):
            with _lock:
                out = dict(STATE)
            out["facelift"] = facelift_state()
            return self._json(out)
        if self.path.startswith("/cmd"):          # deck drains queued commands
            with _lock:
                out = list(PENDING)
                PENDING.clear()
            return self._json({"cmds": out})
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
                STATE["seq"] += 1
            return self._json({"ok": True})
        if self.path.startswith("/facelift"):      # phone kicks off the rebuild
            action = data.get("action") or "start"
            if action == "reset":
                try:
                    os.remove(FACELIFT_STATUS)
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
            if a in ("next", "prev"):
                with _lock:
                    PENDING.append(a)
            elif a == "goto":
                try:
                    with _lock:
                        PENDING.append("goto:%d" % int(data.get("i", 0)))
                except Exception:
                    pass
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
    print("=" * 58)
    print(" PRESENTER REMOTE")
    print("=" * 58)
    print(" laptop :  http://localhost:%d/%s" % (PORT, decks[0] if decks else ""))
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
    try:
        Server(("0.0.0.0", PORT), Handler).serve_forever()
    except KeyboardInterrupt:
        sys.exit(0)
