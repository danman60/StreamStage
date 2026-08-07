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
  3. Appends every telemetry event to telemetry/events-YYYY-MM-DD.jsonl,
     flushed and fsync'd on arrival, so two days of floor traffic survive a
     crash, a browser wipe or a flat battery. Emails typed on the tablet land
     the same way: POST /lead (on the telemetry port) appends to
     telemetry/leads-YYYY-MM-DD.jsonl. flush-leads.py sends them upstream
     after the day, when there is internet again.

There is no internet dependency anywhere. The laptop and the TV only need to
be on the same local network — a travel router or the laptop's own hotspot is
enough, and is what you should use, because venue wifi will fail.
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

_log_lock = threading.Lock()
_counts = {"events": 0, "publishes": 0, "leads": 0}


def publish(msg: dict) -> None:
    if isinstance(msg, dict) and msg.get("type") in RETAINABLE:
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
            with _retained_lock:
                return self._send(200, json.dumps(_retained).encode())
        if path == "/events":
            return self._send(200, json.dumps(read_events()).encode())
        if path == "/films":
            # Which films actually exist on disk right now. Both screens ask
            # this instead of probing each file, so a film that has not been
            # rendered yet costs one honest answer rather than six 404s in the
            # console — and so the TV never points a <video> at a missing file.
            media = os.path.join(HERE, "media")
            out = {}
            try:
                for name in os.listdir(media):
                    if name.endswith(".mp4"):
                        out[name[:-4]] = os.path.getsize(os.path.join(media, name))
            except OSError:
                pass
            return self._send(200, json.dumps(out).encode())
        if path == "/health":
            # `ip` is what the launcher page shows you to type into a Fire Stick.
            return self._send(200, json.dumps({
                "ok": True,
                "ip": lan_ip(),
                "port": self.server.server_address[1],
                "subscribers": len(_subscribers),
                "events": _counts["events"],
                "leads": _counts["leads"],
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
    ap.add_argument("--port", type=int, default=8080)
    args = ap.parse_args()

    os.makedirs(TELEMETRY_DIR, exist_ok=True)
    ip = lan_ip()

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
    print(f"  TABLET (touch this)   http://localhost:{args.port}/tablet")
    print(f"  TV     (this laptop)  http://localhost:{args.port}/tv")
    print(f"\n  TV on a Fire Stick / any device on the same wifi — bookmark:")
    print(f"      http://{ip}:{args.port}/tv")
    print(f"  and point the tablet at  http://{ip}:{args.port}/tablet")
    print(f"\n  Telemetry -> {TELEMETRY_DIR}/events-YYYY-MM-DD.jsonl  (port {args.port + 1})")
    print(f"  Leads     -> {TELEMETRY_DIR}/leads-YYYY-MM-DD.jsonl   (typed on the tablet;")
    print(f"               run flush-leads.py after the day, with internet, to send them)")
    if missing:
        # Not an error: the kiosk probes each film at run time and offers that
        # product's QR instead until the render lands.
        print("\n  films not rendered yet (their tiles will show a QR instead):")
        for m in missing:
            print(f"       {m}")
    print(f"{line}\n  Ctrl-C to stop.\n")

    httpd = ThreadingHTTPServer(("0.0.0.0", args.port), Handler)
    httpd.daemon_threads = True

    # ------------------------------------------------------------------
    # A SECOND listener, one port up, for telemetry only.
    #
    # A browser allows ~6 connections per HOST. The TV holds one permanent
    # event stream plus a live connection per film, which is the entire budget
    # — so telemetry POSTs sat unsent behind the videos. Measured: 15 films
    # played, 15 events in the page, 0 on disk. Moving telemetry one port up
    # makes it a different origin with its own connection pool, so the day's
    # record can never be starved by the films.
    # ------------------------------------------------------------------
    log_srv = ThreadingHTTPServer(("0.0.0.0", args.port + 1), Handler)
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
