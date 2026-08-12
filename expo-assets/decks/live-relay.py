#!/usr/bin/env python3
"""Mirror the deck's position to Cloudflare R2 so the room's phones can follow along.

READ-ONLY against the presenter. It polls `GET /state` — the same endpoint the phone remote
reads — and never posts, never commands, never touches a file the talk depends on. If this
process dies mid-talk the deck does not notice and nothing on stage changes.

Why R2 and not our own server: a public bucket is a CDN. A room of phones hitting it costs us
nothing and cannot fall over, and it works on cellular — which matters, because the venue wifi
could not even route the tablet to this laptop yesterday.

    python live-relay.py --deck talk1 [--presenter http://127.0.0.1:8090] [--interval 0.7]
"""
import argparse, hashlib, json, os, sys, time, urllib.request

try:
    import boto3
except ImportError:
    sys.exit("boto3 missing:  pip install boto3")

ENV_KEYS = os.path.expanduser("~/.env.keys")


def load_env():
    """Read R2 credentials out of ~/.env.keys — never hardcode them here."""
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--deck", default="talk1")
    ap.add_argument("--presenter", default="http://127.0.0.1:8090")
    ap.add_argument("--interval", type=float, default=0.7)
    ap.add_argument("--once", action="store_true", help="push once and exit (for testing)")
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
        aws_secret_access_key=env["CLOUDFLARE_R2_SECRET_KEY"],
        region_name="auto",
    )
    bucket = env["CLOUDFLARE_R2_BUCKET"]
    key = f"live/{a.deck}/state.json"

    # SAY WHERE THIS IS GOING BEFORE IT GOES THERE.
    print(f"relay  : {a.presenter}/state  ->  r2://{bucket}/{key}", flush=True)
    print(f"poll   : every {a.interval}s (read-only on the presenter)", flush=True)

    last = None
    misses = 0
    while True:
        try:
            with urllib.request.urlopen(f"{a.presenter}/state", timeout=3) as r:
                st = json.loads(r.read())
            misses = 0
        except Exception as e:
            misses += 1
            if misses in (1, 10, 100):
                print(f"  presenter unreachable ({e}) — retrying", flush=True)
            time.sleep(min(a.interval * 4, 5))
            continue

        payload = {
            "deck": a.deck,
            "idx": int(st.get("idx", 0)),
            "total": int(st.get("total", 0)),
            "title": str(st.get("title", "")),
            "seq": int(st.get("seq", 0)),
            "ts": int(time.time()),
        }
        # ignore `ts` when deciding whether anything actually moved, or every tick is a write
        sig = hashlib.md5(json.dumps({k: v for k, v in payload.items()
                                      if k != "ts"}, sort_keys=True).encode()).hexdigest()
        if sig != last:
            body = json.dumps(payload).encode()
            s3.put_object(Bucket=bucket, Key=key, Body=body,
                          ContentType="application/json",
                          # the whole point is freshness; never let the CDN hold this
                          CacheControl="no-store, max-age=0, must-revalidate")
            last = sig
            print(f"  -> slide {payload['idx'] + 1}/{payload['total']}  {payload['title'][:48]}",
                  flush=True)
        if a.once:
            return
        time.sleep(a.interval)


if __name__ == "__main__":
    main()
