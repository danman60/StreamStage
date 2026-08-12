#!/usr/bin/env python3
"""Receive the deck's live position — slide AND fragment AND which film is up — and mirror it
to Cloudflare R2 for the room's phones.

Why a receiver instead of polling the presenter: the presenter only stores a fixed set of fields
and would silently drop `frag` and `src`, and teaching it new ones means restarting the process
Daniel presents from. This takes nothing from the presenter and cannot disturb it. The deck
posts here as a fire-and-forget; if this machine is unreachable the deck's own `catch` swallows
it and the talk continues exactly as before.

The deck posts with `mode:'no-cors'` and a text/plain body on purpose — that is a "simple
request", so the browser never sends a preflight and this server needs no CORS configuration.

    python live-receive.py [--port 8791] [--deck talk1]
"""
import argparse, json, os, sys, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

try:
    import boto3
except ImportError:
    sys.exit("boto3 missing:  pip install boto3")

ENV_KEYS = os.path.expanduser("~/.env.keys")
STATE = {"lock": threading.Lock(), "last": None, "last_write": 0.0, "count": 0}


def load_env():
    out = {}
    if os.path.exists(ENV_KEYS):
        for line in open(ENV_KEYS, encoding="utf8", errors="replace"):
            line = line.strip()
            if line.startswith("export "):
                line = line[7:]
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                out[k.strip()] = v.strip().strip('"').strip("'")
    out.update({k: v for k, v in os.environ.items() if k.startswith("CLOUDFLARE_R2")})
    return out


def make_handler(s3, bucket, key):
    def put(payload):
        s3.put_object(Bucket=bucket, Key=key, Body=json.dumps(payload).encode(),
                      ContentType="application/json",
                      CacheControl="no-store, max-age=0, must-revalidate")

    class H(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def log_message(self, *a):
            pass                      # the useful log is the state line we print ourselves

        def _ok(self, body=b"ok", ctype="text/plain"):
            self.send_response(200)
            self.send_header("content-type", ctype)
            self.send_header("content-length", str(len(body)))
            self.send_header("access-control-allow-origin", "*")
            self.end_headers()
            self.wfile.write(body)

        def do_OPTIONS(self):
            self.send_response(204)
            self.send_header("access-control-allow-origin", "*")
            self.send_header("access-control-allow-methods", "POST, GET, OPTIONS")
            self.send_header("access-control-allow-headers", "*")
            self.send_header("content-length", "0")
            self.end_headers()

        def do_GET(self):
            with STATE["lock"]:
                return self._ok(json.dumps(STATE["last"] or {}).encode(), "application/json")

        def do_POST(self):
            n = int(self.headers.get("content-length") or 0)
            try:
                d = json.loads(self.rfile.read(n) or b"{}")
            except Exception:
                return self._ok(b"bad json")
            payload = {
                "deck": d.get("deck", "talk1"),
                "idx": int(d.get("idx", 0)),
                "total": int(d.get("total", 0)),
                "title": str(d.get("title", ""))[:120],
                "frag": int(d.get("frag", 0)),      # fragments revealed so far on this slide
                "frags": int(d.get("frags", 0)),    # how many it has in total
                "src": str(d.get("src", ""))[:60],  # the film the demo slide is actually on
                "ts": int(time.time()),
            }
            with STATE["lock"]:
                prev = STATE["last"]
                changed = (prev is None or any(prev.get(k) != payload[k]
                           for k in ("idx", "frag", "src", "title")))
                STATE["last"] = payload
                STATE["count"] += 1
            if changed:
                put(payload)
                print(f"  slide {payload['idx']+1}/{payload['total']} "
                      f"frag {payload['frag']}/{payload['frags']} "
                      f"{payload['src'] or '-'}  {payload['title'][:40]}", flush=True)
            return self._ok()
    return H


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8791)
    ap.add_argument("--deck", default="talk1")
    a = ap.parse_args()

    env = load_env()
    need = ["CLOUDFLARE_R2_ACCOUNT_ID", "CLOUDFLARE_R2_ACCESS_KEY",
            "CLOUDFLARE_R2_SECRET_KEY", "CLOUDFLARE_R2_BUCKET"]
    missing = [k for k in need if not env.get(k)]
    if missing:
        sys.exit(f"missing credentials: {', '.join(missing)}")

    s3 = boto3.client(
        "s3",
        endpoint_url=f"https://{env['CLOUDFLARE_R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=env["CLOUDFLARE_R2_ACCESS_KEY"],
        aws_secret_access_key=env["CLOUDFLARE_R2_SECRET_KEY"], region_name="auto")
    bucket, key = env["CLOUDFLARE_R2_BUCKET"], f"live/{a.deck}/state.json"
    print(f"receiver: 0.0.0.0:{a.port}  ->  r2://{bucket}/{key}", flush=True)

    srv = ThreadingHTTPServer(("0.0.0.0", a.port), make_handler(s3, bucket, key))
    srv.daemon_threads = True

    # Heartbeat: without it a slide left up for minutes is indistinguishable from a dead relay,
    # and every phone in the room quietly starts saying the talk has not begun.
    def beat():
        while True:
            time.sleep(25)
            with STATE["lock"]:
                p = dict(STATE["last"]) if STATE["last"] else None
            if p:
                p["ts"] = int(time.time())
                try:
                    s3.put_object(Bucket=bucket, Key=key, Body=json.dumps(p).encode(),
                                  ContentType="application/json",
                                  CacheControl="no-store, max-age=0, must-revalidate")
                except Exception as e:
                    print(f"  heartbeat failed: {e}", flush=True)
    threading.Thread(target=beat, daemon=True).start()

    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
