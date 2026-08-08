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

    NOTHING IN HERE IS INVENTED. Every value is either something the visitor
    typed, something the booth knows for a fact (which film was on screen), or
    a constant that describes this surface. The route accepts a booth capture
    on its email alone, so no field is ever filled in just to satisfy a schema.

    STUDIO. The film gate asks for the studio name along with the email, so
    most leads carry a real one and it is used VERBATIM. A capture that
    genuinely has no studio — the operator's email-only input, or a lead
    queued before the gate existed — sends it empty and says so in `notes`.
    A placeholder would overwrite an answer with a label.

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
        # NO NAME. The booth gate asks for a studio and an email — two boxes — and
        # never asks who is typing. This used to send `email.split("@")[0]` because
        # the live route demanded a name; that is a field nobody asked for, and it
        # reached Daniel's inbox looking like the visitor had typed it. The route
        # now accepts a booth capture without one (`src` starts with "booth"), so
        # the honest thing is to send only what was actually typed.
        #
        # The studio goes up VERBATIM, and stays absent when it was left blank —
        # a placeholder here would overwrite an answer with a label.
        "studio": studio,
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
    """POST one lead. True ONLY when the row is known to have landed.

    A 200 IS NOT ENOUGH, and this is the bug that cost leads silently.
    ------------------------------------------------------------------
    The live route answers 200 when EITHER the Supabase forward OR the
    notification email succeeded. The Supabase forward has a hard 4-second
    timeout, which a cold start over hotel wifi beats easily — so a lead could
    be answered 200, written into leads-flushed.json as permanently done, and
    have no database row and no email to the visitor. The studio owner who
    typed their address at the gate was promised six films and got nothing,
    and nothing on this side would ever retry.

    So the BODY decides:

        forwarded true    -> landed. Mark it flushed.
        forwarded false   -> the row did not land. Keep it queued and retry.
        forwarded absent  -> the older route, which does not report this yet.

    ABSENT IS TREATED AS SENT, deliberately, and it is the uncomfortable
    choice of the three. Treating absence as "not sent" against a route that
    will never grow the field means every lead is re-POSTed on every pass,
    for ever: Daniel's inbox and the visitor's inbox both fill with duplicates
    of the same capture, which is a worse failure than the one being fixed and
    is not self-limiting. So absence keeps today's behaviour — and says so on
    the line it prints, every time, so "I could not confirm this one" is never
    invisible. When the route ships `forwarded`, this becomes strict on its
    own with no change here.
    """
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        endpoint, data=body, method="POST",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read(4096).decode("utf-8", "replace")
            if resp.status != 200:
                return False, f"HTTP {resp.status}: {raw.strip()}"
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError:
                parsed = None
            forwarded = parsed.get("forwarded") if isinstance(parsed, dict) else None
            if forwarded is True:
                return True, raw.strip()
            if forwarded is False:
                return False, ("the route answered 200 but did NOT store the lead "
                               f"(forwarded:false) — kept: {raw.strip()}")
            return True, f"{raw.strip()}  [no `forwarded` field — storage NOT confirmed]"
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
    # A queue that has been typed into on a bench holds lines nobody wants
    # upstream: a tester's "fdd@dhs.com", an address at a .test domain that can
    # never receive mail. Sending those creates studios in the live database
    # that never existed, which is exactly the mess this booth already had to
    # clean up once. So the operator can name what goes and what is retired.
    ap.add_argument("--only", metavar="LID", action="append", default=[],
                    help="send ONLY these lead ids (repeatable). Everything else is left queued.")
    ap.add_argument("--retire", metavar="LID", action="append", default=[],
                    help="mark these lead ids as done WITHOUT sending them (repeatable). "
                         "For bench lines that must never reach the live route.")
    args = ap.parse_args()

    # SAY WHERE THIS IS ABOUT TO POST, BEFORE IT POSTS. A previous harness
    # defaulted quietly at a production route and put fabricated leads in a
    # real inbox. The destination is never a thing you have to go and read.
    live = args.endpoint == ENDPOINT
    print(f"\n  TARGET: {args.endpoint}"
          f"{'   <-- THE LIVE ROUTE. Real email, real database row.' if live else '   (override)'}")
    if args.dry_run:
        print("  DRY RUN — nothing will be sent.")

    # "0 lead(s) on disk" from the wrong directory looked exactly like
    # "everything is already sent", which is the one thing it must not look
    # like. Say what is actually true.
    if not os.path.isdir(TELEMETRY_DIR):
        print(f"\n  THERE IS NO TELEMETRY DIRECTORY at {TELEMETRY_DIR}")
        print( "  So this has NOT checked whether there are leads to send — it found")
        print( "  nowhere to look. That is not the same as 'nothing to send'.")
        print( "  Run this from the booth laptop, next to serve.py:")
        print( "      python3 expo-assets/kiosk/flush-leads.py\n")
        return 2

    leads = load_leads()
    marker = load_marker()
    todo = [l for l in leads if l["_lid"] not in marker]

    # Retiring happens before anything is sent, and is recorded with a reason
    # so a later reader can tell "we chose not to send this" from "this was
    # delivered". Both keep the lead out of the next run; only one of them
    # means a studio got their films.
    if args.retire:
        retired = 0
        for lead in list(todo):
            if lead["_lid"] in args.retire:
                if not args.dry_run:
                    marker[lead["_lid"]] = "RETIRED-NOT-SENT " + time.strftime("%Y-%m-%dT%H:%M:%S%z")
                todo.remove(lead)
                retired += 1
                print(f"  {'would retire' if args.dry_run else 'RETIRED'} {lead.get('email')} "
                      f"(lid {lead['_lid']}) — NOT sent, will never be sent")
        if retired and not args.dry_run:
            save_marker(marker)

    if args.only:
        skipped = [l for l in todo if l["_lid"] not in args.only]
        todo = [l for l in todo if l["_lid"] in args.only]
        missing = [lid for lid in args.only if lid not in {l["_lid"] for l in todo}]
        if missing:
            print(f"  ! --only named {len(missing)} id(s) that are not queued: {', '.join(missing)}")
        if skipped:
            print(f"  --only: {len(skipped)} other queued lead(s) left untouched, still queued")

    print(f"  {len(leads)} lead(s) on disk, {len(leads) - len(todo)} not being sent, {len(todo)} to send")
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
