#!/usr/bin/env python3
"""Send the booth's typed leads upstream. Run AFTER the day, WITH internet.

    python3 expo-assets/kiosk/flush-leads.py --dry-run    # print, send nothing
    python3 expo-assets/kiosk/flush-leads.py              # actually send

Reads every telemetry/leads-*.jsonl that serve.py wrote (one line per email
typed on the tablet) and POSTs each lead to the SAME live route the public
expo-leads.html form uses — https://streamstage.live/api/expo-leads — so each
one arrives exactly like a form submission: a lead email to Daniel plus the
unified-leads mirror. Nothing new exists on the receiving side.

Idempotent. Every confirmed send is recorded in telemetry/leads-flushed.json
(a sidecar marker, written after EACH success), and a lead whose id is in
that file is never sent again. Re-run it after a crash, a timeout or a flaky
hotel connection — only the unconfirmed remainder goes out. Duplicate lines
inside the jsonl (a client retry that raced an acknowledgement) collapse to
one send, keyed on the lead id the tablet stamped.

SES gotcha, learned on the live route and load-bearing here: the SES SMTP
account REJECTS an unverified replyTo, which bounces the whole delivery. The
lead's email therefore travels in BODY FIELDS ONLY (email / notes) — this
script must never grow a replyTo-shaped field. Python standard library only.
"""

import argparse
import glob
import json
import os
import sys
import time
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
TELEMETRY_DIR = os.path.join(HERE, "telemetry")
MARKER = os.path.join(TELEMETRY_DIR, "leads-flushed.json")
ENDPOINT = "https://streamstage.live/api/expo-leads"

# Product ids as the kiosk logs them -> the names Daniel reads in the email.
# (The one place besides kiosk.js these are written out; keep in sync.)
PRODUCT_NAMES = {
    "studiosage":   "StudioSage",
    "compsync":     "CompSync",
    "callboard":    "Callboard",
    "costumecraft": "CostumeCraft",
    "studiobeat":   "StudioBeat",
    "reflect":      "Reflect",
}


def load_leads() -> "list[dict]":
    """Every typed lead on disk, oldest file first, de-duplicated by lead id."""
    seen: "set[str]" = set()
    out: "list[dict]" = []
    for path in sorted(glob.glob(os.path.join(TELEMETRY_DIR, "leads-*.jsonl"))):
        try:
            with open(path, encoding="utf-8") as fh:
                for line in fh:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        lead = json.loads(line)
                    except json.JSONDecodeError:
                        continue        # torn last line after a crash: skip it
                    if not isinstance(lead, dict) or not lead.get("email"):
                        continue
                    lid = lead.get("lid") or f"{lead.get('email')}|{lead.get('ts', '')}"
                    if lid in seen:
                        continue        # client retry double-wrote it; send once
                    seen.add(lid)
                    lead["_lid"] = lid
                    lead["_file"] = os.path.basename(path)
                    out.append(lead)
        except OSError as exc:
            sys.stderr.write(f"  ! could not read {path}: {exc}\n")
    return out


def load_marker() -> "dict[str, str]":
    try:
        with open(MARKER, encoding="utf-8") as fh:
            data = json.load(fh)
            return data if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def save_marker(marker: "dict[str, str]") -> None:
    # Written whole after every success: a crash mid-run costs a rewrite,
    # never a double-send.
    tmp = MARKER + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(marker, fh, indent=1, sort_keys=True)
        fh.flush()
        os.fsync(fh.fileno())
    os.replace(tmp, MARKER)


def payload_for(lead: dict) -> dict:
    """Shape one typed lead like an expo-leads.html submission.

    The live route REQUIRES name, studio and email.

    STUDIO. The film gate asks for the studio name along with the email, so
    most leads now carry a real one and it is used verbatim. Only a capture
    that genuinely has no studio — the operator's email-only input, or a lead
    queued before the gate existed — falls back to the honest placeholder.
    A synthesised studio on a lead that HAS one would be worse than useless:
    it would overwrite the answer with a label.

    ASSET. A gated lead was promised something ("all six films"). `asset` is
    what the live route's autoresponder reads to decide what to send, so a
    lead that goes upstream without it is a promise the booth quietly broke.

    The lead's address goes in `email` and `notes` ONLY. Never replyTo.
    """
    email = str(lead["email"]).strip()
    product = str(lead.get("product") or "").strip()
    via = str(lead.get("via") or "tablet").strip()
    ts = str(lead.get("ts") or "unknown time")
    studio = str(lead.get("studio") or "").strip()
    product_name = PRODUCT_NAMES.get(product, product or "none on screen")
    who = "by booth staff" if via == "operator" else "by the visitor"

    interests = ["software"]
    if product in PRODUCT_NAMES:
        interests.append(PRODUCT_NAMES[product])

    payload = {
        # A real name was never asked for at the booth; the local part of the
        # address is the honest stand-in, and the studio name is the field that
        # actually identifies them.
        "name": email.split("@", 1)[0],
        "studio": studio or "(email-only booth capture)",
        "email": email,
        "phone": "",
        "interests": interests,
        # The taxonomy value the leads route validates, not prose. The prose is
        # in `notes`, which is where Daniel reads it.
        "source": "booth_tablet",
        "asset": "sixfilms",
        "src": "booth_tablet",
        "p": product or None,
        "s": "tablet",
        "notes": (
            f"Typed on the booth tablet ({via}) at {ts}. "
            f"Film on screen: {product_name}. "
            f"Studio: {studio or 'not given (email-only capture)'}. "
            f"Queued offline; sent later by flush-leads.py."
        ),
    }
    return payload


def send(endpoint: str, payload: dict, timeout: float = 20.0) -> "tuple[bool, str]":
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        endpoint, data=body, method="POST",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read(4096).decode("utf-8", "replace")
            if resp.status == 200:
                return True, raw.strip()
            return False, f"HTTP {resp.status}: {raw.strip()}"
    except urllib.error.HTTPError as exc:
        detail = exc.read(4096).decode("utf-8", "replace").strip()
        return False, f"HTTP {exc.code}: {detail}"
    except (urllib.error.URLError, OSError) as exc:
        return False, str(exc)


def main() -> int:
    ap = argparse.ArgumentParser(description="POST the booth's typed leads to the live expo-leads route")
    ap.add_argument("--dry-run", action="store_true",
                    help="print what would be sent; touch nothing, send nothing")
    ap.add_argument("--endpoint", default=ENDPOINT,
                    help=f"override the target route (default {ENDPOINT})")
    args = ap.parse_args()

    leads = load_leads()
    marker = load_marker()
    todo = [l for l in leads if l["_lid"] not in marker]

    print(f"  {len(leads)} lead(s) on disk, {len(leads) - len(todo)} already flushed, {len(todo)} to send")
    if not todo:
        return 0

    sent = failed = 0
    for lead in todo:
        payload = payload_for(lead)
        if args.dry_run:
            print(f"\n  DRY RUN — would POST to {args.endpoint}  ({lead['_file']}, lid {lead['_lid']}):")
            print("  " + json.dumps(payload, indent=2).replace("\n", "\n  "))
            continue

        ok, detail = send(args.endpoint, payload)
        if ok:
            marker[lead["_lid"]] = time.strftime("%Y-%m-%dT%H:%M:%S%z")
            save_marker(marker)          # after EACH success — crash-safe
            sent += 1
            print(f"  sent   {payload['email']}  ({detail})")
        else:
            failed += 1
            print(f"  FAILED {payload['email']}  — {detail}  (kept; re-run to retry)")
        time.sleep(0.5)                  # be gentle with the live route

    if args.dry_run:
        print(f"\n  dry run: {len(todo)} lead(s) would be sent, nothing was")
        return 0
    print(f"\n  done: {sent} sent, {failed} failed{' — re-run to retry the failures' if failed else ''}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
