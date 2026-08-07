#!/usr/bin/env python3
"""StreamStage booth kiosk server — Calgary Dance Teacher Expo, Aug 11–12 2026.

    python3 expo-assets/kiosk/serve.py

That is the whole start command. Python 3 standard library only, no pip, no
internet, no build step.

It does three things and nothing else:

  1. Serves the kiosk files (tablet.html, tv.html, the films, the QR SVGs).
  2. Relays the tablet's taps to the TV  — GET /bus is a Server-Sent Events
     stream, POST /bus publishes to it. This is what lets the TV be a Fire
     Stick on the same wifi instead of a second window on the laptop.
     The operator's PHONE is a third publisher on that same bus: play, pause,
     resume, stop and the attract order, all POSTed to /bus, all relayed over
     the same SSE stream. Commands are never retained, and a command that does
     not say it came from the phone may not start an operator-only film.
     The exact JSON is phone-app/BUS-CONTRACT.md.
  3. Appends every telemetry event to telemetry/events-YYYY-MM-DD.jsonl,
     flushed and fsync'd on arrival, so two days of floor traffic survive a
     crash, a browser wipe or a flat battery. Emails typed on the tablet land
     the same way: POST /lead (on the telemetry port) appends to
     telemetry/leads-YYYY-MM-DD.jsonl. flush-leads.py sends them upstream
     after the day, when there is internet again.

There is no internet dependency anywhere. The laptop and the TV only need to
be on the same local network — a travel router or the laptop's own hotspot is
enough, and is what you should use, because venue wifi will fail.

Ports: the kiosk takes 8080 (the pages) and 8081 (telemetry, always one above
the page port). The deck presenter takes 8090. They no longer collide, so the
booth kiosk and the phone-driven deck remote run on ONE laptop at the SAME
time. If 8080 is somehow busy anyway, this moves itself up and says so in
plain English rather than dying in a stack trace.
"""

import argparse
import json
import os
import queue
import socket
import sys
import threading
import time
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
TELEMETRY_DIR = os.path.join(HERE, "telemetry")

# The kiosk keeps 8080 because its address is written down in places this file
# cannot reach: the booth sheet, README-BOOTH.md, and the Fire Stick's bookmark,
# which is typed on a TV remote and is not something anyone wants to retype at
# 8am. Telemetry is always DEFAULT_PORT + 1 (see the note in main()).
#
# The deck presenter used to default to 8080 too and now defaults to 8090 —
# see expo-assets/decks/presenter-server.py. Both can run on one laptop.
DEFAULT_PORT = 8080
PRESENTER_DEFAULT_PORT = 8090       # only used to write a helpful error message

# ---------------------------------------------------------------------------
# The relay. Every connected page (tablet, TV, a second TV if he ever adds one)
# holds one queue. A publish fans out to all of them.
# ---------------------------------------------------------------------------
_subscribers: "list[queue.Queue]" = []
_subscribers_lock = threading.Lock()

# The last STATE each screen announced, replayed to anything that connects
# late. This is what makes a Fire Stick survive a reload mid-show: it
# reconnects and is immediately told what the TV is doing.
#
# Only state is retained — never commands. Replaying a retained "play" would
# mean a screen that joins an hour later starts a film somebody asked for an
# hour ago. Found exactly that way in testing: a tablet opened after the show
# had returned to attract came up mid-film on a stale product.
RETAINABLE = {"tv"}
_retained: "dict[str, dict]" = {}
_retained_lock = threading.Lock()

# ---------------------------------------------------------------------------
# OPERATOR COMMANDS.
#
# The phone (phone-app/) is a third publisher on this same bus: it POSTs to
# /bus exactly like the tablet does, and the TV actions it. There is no second
# transport, no websocket and no telemetry on this path. The wire format is
# owned by phone-app/BUS-CONTRACT.md — read that, not this comment, for the
# exact JSON.
#
# Two kinds of message travel here and they are not the same thing:
#
#   STATE    {"type":"tv", ...}     — what a screen IS doing. Retained (above).
#   COMMAND  {"type":"pause", ...}  — what somebody wants done. NEVER retained,
#            {"type":"playfilm",...}  because a replayed command makes a screen
#                                     that joins an hour late start an hour-old
#                                     film. Measured exactly that way.
#
# RETAINABLE is a whitelist and no command type is in it, so nothing below has
# to remember to exclude them — but command_of() exists so the rule can be
# asserted rather than inferred.
COMMANDS = {"play", "playfilm", "pause", "resume", "stop", "playlist", "ping"}

# What marks a command as coming from the OPERATOR rather than from a visitor
# surface. phone-app/BUS-CONTRACT.md §2 is the authority on the wire format and
# the phone stamps every command it sends with "src":"phone" — so that field is
# the marker, and it is now load-bearing rather than decorative.
#
# "origin":"operator" is accepted as an equivalent spelling. Neither is a
# secret and neither is meant to be one: this is a booth on a trade-show floor
# behind its own travel router, not an authentication boundary. What it does
# buy is the thing Daniel actually asked for — the visitor tablet, which sends
# neither field, cannot start the operator-only film even if somebody finds a
# way to make it publish. Absence means visitor, always.
OPERATOR_SRC = {"phone", "operator"}

# Films only an OPERATOR may start.
#
# streamstage-services.mp4 is StreamStage's own recital-filming film. It is not
# a product, it has never had a tablet tile, and Daniel was explicit that only
# the phone in his hand starts it — a visitor tapping it on the booth tablet is
# a sales pitch nobody asked for, playing to the wrong person.
#
# Hiding a tile is not enforcement, so the refusal lives HERE, on the wire: a
# command that does not say it came from the operator is refused 403 and is
# never published. tv.html carries the same check, because the tablet and TV
# also talk over BroadcastChannel when they are two windows on ONE laptop, and
# that path never reaches this process at all.
OPERATOR_ONLY_FILMS = {"streamstage-services"}

_log_lock = threading.Lock()
_counts = {"events": 0, "publishes": 0, "leads": 0, "refused": 0}


def command_of(msg: dict) -> "str | None":
    """The command a bus message is asking for, or None if it is not one.

    The flat form is the contract: {"type":"pause"}, {"type":"playfilm",...}.
    {"type":"cmd","cmd":"pause"} is accepted as an equivalent envelope so a
    future client that prefers a namespace is not locked out — the phone does
    not send it and nothing depends on it.
    """
    if not isinstance(msg, dict):
        return None
    t = msg.get("type")
    if t == "cmd":
        c = msg.get("cmd")
        return c if isinstance(c, str) and c in COMMANDS else None
    return t if t in COMMANDS else None


def is_operator(msg: dict) -> bool:
    """Did this command come from the operator's phone?

    Absence is a visitor. tablet.html has never sent either field and must
    never gain the operator-only film by omission.
    """
    for k in ("src", "origin"):
        v = msg.get(k)
        if isinstance(v, str) and v.strip().lower() in OPERATOR_SRC:
            return True
    return False


def film_of(msg: dict) -> "str | None":
    """Which film a play command is asking for. `product` is the older name."""
    for k in ("film", "product"):
        v = msg.get(k)
        if isinstance(v, str) and v:
            return v
    return None


def order_of(msg: dict) -> "list[str]":
    """The film ids in a playlist command, in order."""
    v = msg.get("order")
    if not isinstance(v, list):
        v = msg.get("films") if isinstance(msg.get("films"), list) else []
    return [x for x in v if isinstance(x, str)]


def refuse_reason(msg: dict) -> "str | None":
    """Why this command must not be published, or None to let it through.

    This does NOT touch the tablet's email gate and cannot be used to skip it.
    The gate lives in tablet.html and is raised by the tablet's own first tap;
    nothing on this wire arms or disarms it, and the tablet stamps
    src:"tablet" on every command it sends, operator sheet included.
    """
    cmd = command_of(msg)
    if cmd is None or is_operator(msg):
        return None
    if cmd in ("play", "playfilm"):
        film = film_of(msg)
        if film in OPERATOR_ONLY_FILMS:
            return "operator-only film: " + film
    elif cmd == "playlist":
        # The attract order is an operator control outright, not merely one
        # that must not name the operator-only film. Nothing on a visitor
        # surface sends it, the tablet has no UI for it, and naming that film
        # in an order is the one way a visitor surface could put it on the
        # screen without ever sending a play. tv.html refuses the same thing on
        # the local transports, and the two must agree.
        bad = [f for f in order_of(msg) if f in OPERATOR_ONLY_FILMS]
        if bad:
            return "operator-only film in playlist: " + ", ".join(bad)
        return "playlist is an operator control"
    return None


def publish(msg: dict) -> None:
    # A command is never retained, whatever its type says. RETAINABLE is a
    # whitelist so this can only ever be belt and braces — which is the point.
    if isinstance(msg, dict) and msg.get("type") in RETAINABLE and command_of(msg) is None:
        with _retained_lock:
            _retained[msg["type"]] = msg
    payload = "data: " + json.dumps(msg, separators=(",", ":")) + "\n\n"
    with _subscribers_lock:
        dead = []
        for q in _subscribers:
            try:
                q.put_nowait(payload)
            except queue.Full:
                dead.append(q)          # a wedged client must not block the booth
        for q in dead:
            _subscribers.remove(q)
    _counts["publishes"] += 1


def record(event: dict) -> None:
    """Append one telemetry event to today's JSONL, durably."""
    os.makedirs(TELEMETRY_DIR, exist_ok=True)
    day = datetime.now().strftime("%Y-%m-%d")
    path = os.path.join(TELEMETRY_DIR, f"events-{day}.jsonl")
    line = json.dumps(event, separators=(",", ":")) + "\n"
    with _log_lock:
        with open(path, "a", encoding="utf-8") as fh:
            fh.write(line)
            fh.flush()
            os.fsync(fh.fileno())       # a yanked power cable must not eat the day
    _counts["events"] += 1


def record_lead(lead: dict) -> None:
    """Append one typed lead to today's leads JSONL, durably.

    Same discipline as record(): flushed and fsync'd on arrival, because a
    typed email is the single most valuable byte the booth produces and a
    yanked power cable must not eat it. Kept in its OWN file, not mixed into
    the events stream — flush-leads.py reads leads-*.jsonl and nothing else,
    so it can never accidentally mail a tap event to the lead route.
    """
    os.makedirs(TELEMETRY_DIR, exist_ok=True)
    day = datetime.now().strftime("%Y-%m-%d")
    path = os.path.join(TELEMETRY_DIR, f"leads-{day}.jsonl")
    line = json.dumps(lead, separators=(",", ":")) + "\n"
    with _log_lock:
        with open(path, "a", encoding="utf-8") as fh:
            fh.write(line)
            fh.flush()
            os.fsync(fh.fileno())
    _counts["leads"] += 1


def read_events() -> "list[dict]":
    """Every telemetry event this server has written, oldest first.

    This is what makes the operator tally correct when the TV is a Fire Stick.
    The two screens are then different DEVICES with different localStorage, so
    neither browser can see the other's events — but both POST here, so the
    server is the only place the whole picture exists.
    """
    out: "list[dict]" = []
    if not os.path.isdir(TELEMETRY_DIR):
        return out
    for name in sorted(os.listdir(TELEMETRY_DIR)):
        if not (name.startswith("events-") and name.endswith(".jsonl")):
            continue
        try:
            with open(os.path.join(TELEMETRY_DIR, name), encoding="utf-8") as fh:
                for line in fh:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        out.append(json.loads(line))
                    except json.JSONDecodeError:
                        pass        # a torn last line after a crash: skip it, keep the rest
        except OSError:
            pass
    out.sort(key=lambda e: e.get("ms", 0))
    return out


def films_on_disk() -> "dict[str, int]":
    """Which films are actually in media/ right now, id -> bytes.

    Both screens and the phone ask this instead of probing each file, so a film
    that has not been rendered yet costs one honest answer rather than six 404s
    in the console.
    """
    media = os.path.join(HERE, "media")
    out: "dict[str, int]" = {}
    try:
        for name in os.listdir(media):
            if name.endswith(".mp4"):
                out[name[:-4]] = os.path.getsize(os.path.join(media, name))
    except OSError:
        pass
    return out


def lan_ip() -> str:
    """Best guess at the address the Fire Stick should be pointed at."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))      # no packet is sent; this just picks a route
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return "127.0.0.1"


def port_free(port: int) -> bool:
    """True if this process can actually take `port` right now.

    Deliberately does NOT set SO_REUSEADDR. http.server turns SO_REUSEADDR on
    by default, and on WINDOWS — which is the booth laptop — that flag lets a
    second process bind a port another process is already listening on. The
    bind then succeeds and the two servers split incoming connections at
    random, which is far worse than a clean refusal. A plain exclusive probe
    means the same thing on Windows and on Linux, so the check below is the
    one that is trusted rather than the bind itself.
    """
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    if hasattr(socket, "SO_EXCLUSIVEADDRUSE"):      # Windows only
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


def pick_ports(want: int, tries: int = 20) -> "int | None":
    """First page port at or above `want` where BOTH it and it+1 are free.

    Steps by two, so the page/telemetry pair always stays aligned and a fallen
    -forward kiosk can never land its telemetry port on somebody else's page.
    Returns None if nothing in range is free — the caller says so in English
    rather than dying in a bind.
    """
    for i in range(tries):
        p = want + i * 2
        if port_free(p) and port_free(p + 1):
            return p
    return None


class Handler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=HERE, **kw)

    # ---- quiet: the console is a status display at the booth, not a log ----
    def log_message(self, fmt, *args):
        pass

    def _send(self, code: int, body: bytes, ctype: str = "application/json") -> None:
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        # Telemetry is served on its own port (see below), which makes it a
        # different origin from the page. Same machine, no internet involved.
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    # ---------------------------------------------------------- byte ranges
    def _serve_range(self) -> bool:
        """Answer a Range request with 206 Partial Content.

        SimpleHTTPRequestHandler does not do this, and without it a browser
        cannot seek inside a film at all — a seek silently clamps back to 0.
        Safari-based clients refuse to play <video> over a server that has no
        range support, and Fire OS Silk gets unhappy on long files too. Found
        by seeking a 48s film to 47.5s and getting currentTime 0 back.
        """
        rng = self.headers.get("Range")
        if not rng or not rng.startswith("bytes="):
            return False

        fs_path = self.translate_path(self.path)
        if not os.path.isfile(fs_path):
            return False

        size = os.path.getsize(fs_path)
        spec = rng[6:].split(",")[0].strip()
        try:
            start_s, _, end_s = spec.partition("-")
            if start_s:
                start = int(start_s)
                end = int(end_s) if end_s else size - 1
            else:
                # suffix form: "bytes=-500" == the last 500 bytes
                start = max(0, size - int(end_s))
                end = size - 1
        except ValueError:
            return False

        if start >= size or start > end:
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{size}")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return True

        end = min(end, size - 1)
        length = end - start + 1
        ctype = self.guess_type(fs_path)

        self.send_response(206)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")   # Accept-Ranges added in end_headers
        self.send_header("Content-Length", str(length))
        self.end_headers()

        try:
            with open(fs_path, "rb") as fh:
                fh.seek(start)
                remaining = length
                while remaining > 0:
                    chunk = fh.read(min(256 * 1024, remaining))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass        # the player moved on mid-chunk; normal, not an error
        return True

    def end_headers(self):
        # Advertise range support on every static response, so players know
        # they are allowed to seek before they try.
        if not self.path.startswith(("/bus", "/log", "/lead", "/health", "/state")):
            self.send_header("Accept-Ranges", "bytes")
        SimpleHTTPRequestHandler.end_headers(self)

    # ------------------------------------------------------------------ GET
    def do_GET(self):
        path = self.path.split("?", 1)[0].rstrip("/") or "/"

        # Short aliases — you have to type these on a Fire Stick remote, so
        # http://<ip>:8080/tv is deliberately as short as it can be.
        aliases = {"/tv": "/tv.html", "/tablet": "/tablet.html", "/t": "/tablet.html", "/": "/index.html"}
        if path in aliases:
            self.path = aliases[path]
            return SimpleHTTPRequestHandler.do_GET(self)

        # Films are seekable; everything else falls through to the plain path.
        if self._serve_range():
            return

        if path == "/bus":
            return self._sse()
        if path == "/state":
            # The retained state, unchanged: {"tv": {...}} — the phone and
            # anything else reading this keeps reading state["tv"].
            #
            # `_server` is what only this process knows, added alongside rather
            # than inside, and underscored so it can never collide with a
            # retained message type. It saves the phone a second request when
            # it draws the playlist: what is on disk, and what it is not
            # allowed to start on a visitor's behalf.
            with _retained_lock:
                out = dict(_retained)
            out["_server"] = {
                "films": films_on_disk(),
                "operatorOnlyFilms": sorted(OPERATOR_ONLY_FILMS),
                "refused": _counts["refused"],
                "subscribers": len(_subscribers),
            }
            return self._send(200, json.dumps(out).encode())
        if path == "/events":
            return self._send(200, json.dumps(read_events()).encode())
        if path == "/films":
            # What is on disk, so the TV never points a <video> at a missing
            # file and the tablet never promises a film that is still rendering.
            return self._send(200, json.dumps(films_on_disk()).encode())
        if path == "/health":
            # `ip` is what the launcher page shows you to type into a Fire Stick.
            return self._send(200, json.dumps({
                "ok": True,
                "ip": lan_ip(),
                "port": self.server.server_address[1],
                "subscribers": len(_subscribers),
                "events": _counts["events"],
                "leads": _counts["leads"],
                "refused": _counts["refused"],
                "telemetryDir": TELEMETRY_DIR,
            }).encode())

        return SimpleHTTPRequestHandler.do_GET(self)

    def _sse(self):
        """One long-lived Server-Sent Events connection per screen."""
        q: queue.Queue = queue.Queue(maxsize=200)
        with _subscribers_lock:
            _subscribers.append(q)
        try:
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache, no-store")
            self.send_header("Connection", "keep-alive")
            self.send_header("X-Accel-Buffering", "no")
            self.end_headers()

            # Replay retained state so a screen that just connected is correct
            # immediately rather than after the next tap.
            with _retained_lock:
                for msg in _retained.values():
                    self.wfile.write(("data: " + json.dumps(msg, separators=(",", ":")) + "\n\n").encode())
            self.wfile.write(b": connected\n\n")
            self.wfile.flush()

            while True:
                try:
                    payload = q.get(timeout=15)
                except queue.Empty:
                    payload = ": ping\n\n"       # keeps middleboxes from closing it
                self.wfile.write(payload.encode())
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, OSError):
            pass
        finally:
            with _subscribers_lock:
                if q in _subscribers:
                    _subscribers.remove(q)

    # ----------------------------------------------------------------- POST
    def do_POST(self):
        path = self.path.split("?", 1)[0].rstrip("/") or "/"
        try:
            length = int(self.headers.get("Content-Length") or 0)
            raw = self.rfile.read(length) if length else b"{}"
            data = json.loads(raw.decode("utf-8") or "{}")
        except Exception:
            return self._send(400, b'{"ok":false,"error":"bad json"}')

        if path == "/bus":
            why = refuse_reason(data)
            if why:
                # Refused BEFORE the relay, so no screen ever sees it. Written
                # to the day's telemetry too: if a visitor surface ever tries
                # this, Daniel should be able to read that off the record
                # rather than take my word for it.
                _counts["refused"] += 1
                try:
                    record({
                        "t": datetime.now().isoformat(),
                        "ms": int(time.time() * 1000),
                        "surface": "server",
                        "type": "cmd_refused",
                        "cmd": command_of(data),
                        "film": film_of(data),
                        "src": data.get("src") or data.get("origin") or "visitor",
                        "reason": why,
                    })
                except Exception:
                    pass
                return self._send(403, json.dumps({
                    "ok": False, "error": "refused", "reason": why
                }).encode())
            publish(data)
            return self._send(200, b'{"ok":true}')

        if path == "/log":
            # One event, or a batch of them. The screens batch to stay under
            # the browser's per-host connection limit.
            try:
                for item in (data if isinstance(data, list) else [data]):
                    record(item)
            except Exception as exc:      # disk full / permissions — never 500 the booth
                sys.stderr.write(f"[telemetry] write failed: {exc}\n")
                return self._send(200, b'{"ok":false,"stored":"browser-only"}')
            return self._send(200, b'{"ok":true}')

        if path == "/lead":
            # One typed lead, or a batch — the tablet queues offline and
            # flushes the backlog in one POST, exactly like telemetry.
            try:
                for item in (data if isinstance(data, list) else [data]):
                    if isinstance(item, dict) and item.get("email"):
                        record_lead(item)
            except Exception as exc:  # disk full / permissions — never 500 the booth
                sys.stderr.write(f"[leads] write failed: {exc}\n")
                # NOT ok: the tablet must keep the lead queued in localStorage
                # rather than treat a browser-only copy as safely on disk.
                return self._send(507, b'{"ok":false,"stored":"browser-only"}')
            return self._send(200, b'{"ok":true}')

        return self._send(404, b'{"ok":false}')


def main() -> None:
    ap = argparse.ArgumentParser(description="StreamStage booth kiosk server")
    ap.add_argument("--port", type=int, default=DEFAULT_PORT,
                    help="page port. Telemetry ALWAYS listens on this + 1. "
                         "Default %d." % DEFAULT_PORT)
    args = ap.parse_args()

    os.makedirs(TELEMETRY_DIR, exist_ok=True)
    ip = lan_ip()

    # ------------------------------------------------------------------
    # Ports, decided BEFORE anything is printed, so every address on the
    # banner below is an address that actually answers.
    # ------------------------------------------------------------------
    # Which half of the pair was busy, checked before anything is bound, so
    # the message below can name the real culprit rather than assuming the
    # page port. Telemetry-only collisions happen and are confusing to read.
    busy = [p for p in (args.port, args.port + 1) if not port_free(p)]

    port = pick_ports(args.port)
    if port is None:
        print(f"""
{'=' * 66}
  THE KIOSK COULD NOT START — no free ports.

  It needs TWO ports next to each other (a page port and the telemetry
  port one above it) and could not find a free pair anywhere between
  {args.port} and {args.port + 40}. Something on this laptop is using a lot of ports.

  What to do:
    1. Close any other kiosk or presenter windows and try again.
    2. Or pick a port yourself:  python3 serve.py --port 9000
{'=' * 66}
""")
        raise SystemExit(1)

    try:
        httpd = ThreadingHTTPServer(("0.0.0.0", port), Handler)
        log_srv = ThreadingHTTPServer(("0.0.0.0", port + 1), Handler)
    except OSError as exc:
        # port_free() said yes a moment ago, so this is a genuine surprise
        # (a race, or a permission/firewall refusal). Still no traceback.
        print(f"""
{'=' * 66}
  THE KIOSK COULD NOT START.

  It could not open port {port}: {exc}

  Most likely something grabbed the port in the last second, or Windows
  Firewall blocked it (say YES to 'Allow Python on private networks').
  Try again, or pick a port yourself:  python3 serve.py --port 9000
{'=' * 66}
""")
        raise SystemExit(1)

    moved = port != args.port

    missing = [
        p["file"] for p in [
            {"file": "media/studiosage.mp4"},
            {"file": "media/compsync.mp4"},
            {"file": "media/callboard.mp4"},
            {"file": "media/costumecraft.mp4"},
            {"file": "media/studiobeat.mp4"},
            {"file": "media/reflect.mp4"},
            # Not a product — StreamStage's own recital filming / livestream
            # film, which plays as a card in the TV attract loop. Missing is not
            # an error: the card falls back to text plus its QR.
            {"file": "media/streamstage-services.mp4"},
        ] if not os.path.exists(os.path.join(HERE, p["file"]))
    ]

    line = "=" * 66
    print(f"\n{line}\n  STREAMSTAGE BOOTH KIOSK — Calgary\n{line}")
    if moved:
        # Loud, plain, and above the addresses — because the addresses below
        # are now different from the ones on the booth sheet.
        which = " and ".join(str(p) for p in busy) or str(args.port)
        verb = "ARE" if len(busy) > 1 else "IS"
        tail = " (the telemetry port, always one above the page)" if busy == [args.port + 1] else ""
        print(f"""  PORT {which} {verb} ALREADY IN USE{tail}.
  This kiosk moved to {port} (telemetry {port + 1}) — it needs BOTH halves
  of a pair, because the pages look for telemetry on page port + 1.

  What is probably already on {which}:
    - another copy of this kiosk server, in a window you left open
    - the deck presenter (expo-assets/decks/presenter-server.py). It now
      defaults to {PRESENTER_DEFAULT_PORT}, so an old copy of it, or an old
      PRESENTER_PORT={args.port}, is the usual reason.

  THE ADDRESSES BELOW ARE THE REAL ONES. Anything written down for
  port {args.port} — the booth sheet, the Fire Stick bookmark — is wrong
  until you close whatever holds {which} and start this again.
{line}""")
    print(f"  TABLET (touch this)   http://localhost:{port}/tablet")
    print(f"  TV     (this laptop)  http://localhost:{port}/tv")
    print(f"\n  TV on a Fire Stick / any device on the same wifi — bookmark:")
    print(f"      http://{ip}:{port}/tv")
    print(f"  and point the tablet at  http://{ip}:{port}/tablet")
    print(f"\n  Telemetry -> {TELEMETRY_DIR}/events-YYYY-MM-DD.jsonl  (port {port + 1})")
    print(f"  Leads     -> {TELEMETRY_DIR}/leads-YYYY-MM-DD.jsonl   (typed on the tablet;")
    print(f"               run flush-leads.py after the day, with internet, to send them)")
    if missing:
        # Not an error: the kiosk probes each film at run time and offers that
        # product's QR instead until the render lands.
        print("\n  films not rendered yet (their tiles will show a QR instead):")
        for m in missing:
            print(f"       {m}")
    print(f"{line}\n  Ctrl-C to stop.\n")

    # ------------------------------------------------------------------
    # Both listeners were bound above, before the banner. The SECOND one is
    # one port up and carries telemetry only.
    #
    # A browser allows ~6 connections per HOST. The TV holds one permanent
    # event stream plus a live connection per film, which is the entire budget
    # — so telemetry POSTs sat unsent behind the videos. Measured: 15 films
    # played, 15 events in the page, 0 on disk. Moving telemetry one port up
    # makes it a different origin with its own connection pool, so the day's
    # record can never be starved by the films.
    #
    # This is why pick_ports() steps by TWO: the pages compute the telemetry
    # origin as location.port + 1 (kiosk.js), so page+1 must always be ours.
    # ------------------------------------------------------------------
    httpd.daemon_threads = True
    log_srv.daemon_threads = True
    threading.Thread(target=log_srv.serve_forever, daemon=True).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print(f"\n  stopped. {_counts['events']} telemetry events written.\n")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
