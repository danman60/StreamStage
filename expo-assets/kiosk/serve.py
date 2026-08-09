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
     telemetry/leads-YYYY-MM-DD.jsonl. That queue is then RETRIED on its own
     every couple of minutes, and only actually sends once the internet is
     back — so a lead typed while the venue wifi was down no longer waits for
     somebody to remember flush-leads.py. Running that script by hand still
     works and cannot double-send: both paths share its leads-flushed.json
     marker, which is re-read immediately before every single send.

It also SHOUTS where it is: one small UDP broadcast every two seconds, so the
tablet and the phone can find this laptop instantly instead of probing 254
addresses on a congested trade-show band. That is purely additive — the
existing address sweep is untouched and still works, and a beacon that fails
to start cannot affect serving. The packet is documented in BEACON.md.

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
import importlib.util
import json
import os
import queue
import re
import socket
import sys
import threading
import time
import urllib.parse
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

# The LAN beacon (see beacon_loop). A UDP port well clear of the page/telemetry
# pair, which pick_ports() can walk as far as DEFAULT_PORT+40, so a kiosk that
# has fallen forward can never land on top of its own beacon.
BEACON_PORT = 45454
BEACON_INTERVAL_S = 2.0

# How often the on-disk lead queue is retried once there is internet again.
LEAD_FLUSH_INTERVAL_S = 120.0
LEAD_FLUSH_FIRST_DELAY_S = 20.0     # so a restart with a backlog does not wait 2 min

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
COMMANDS = {"play", "playfilm", "pause", "resume", "stop", "playlist", "ping",
            # Added 2026-08-08. README-BOOTH.md tells Daniel to press M, F and
            # Esc on the TV to recover a stuck film — and the TV is a Fire Stick
            # running Silk, which has no keyboard. Every documented recovery
            # action was physically unreachable during the show. These are the
            # same three actions as bus verbs, so the phone in his hand can do
            # what the booth sheet has always said to do.
            "mute", "fullscreen", "hud",
            # Added 2026-08-09 with the menu reel. This MUST be listed here as
            # well as in OPERATOR_ONLY_CMDS: command_of() returns None for a
            # type it does not know, and a message that is not a command is
            # never operator-checked — it is simply relayed. Listing it only as
            # operator-only left a visitor surface able to change the attract
            # loop and get a 200 back. Caught by tests/scenarios.mjs #15.
            "attract"}

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

# Commands only an OPERATOR may send.
#
# Nothing on a visitor surface sends any of these and the tablet has no UI for
# them, so refusing them costs the booth nothing and closes the obvious hole:
# a screen a visitor can reach must not be able to mute the TV, drop it out of
# fullscreen or turn the diagnostic HUD on in front of a studio owner.
#
# `playlist` is operator-only too but keeps its own branch below, because its
# refusal has a second, sharper reason (an order can name an operator-only
# film). `stop` is deliberately NOT here — the tablet's own "back to all six"
# button has always sent it, and it is a visitor ending their own film.
#
# `pause` and `resume` were added 2026-08-07 after a visitor-origin pause was
# accepted 200 and FROZE the booth TV on a single frame, with nothing on any
# visitor surface able to undo it. They are the operator's transport controls —
# the phone's console is the only thing with buttons for them — and the same
# sentence above applies with more force to a stopped picture than to a muted
# one. `stop` remains open because it ENDS a film rather than freezing one.
#
# `attract` (added 2026-08-09) chooses WHICH attract loop runs — the six cards,
# or the menu reel of live film thumbnails. Same reasoning as `hud`: a visitor
# surface must not be able to change what the booth shows between films.
OPERATOR_ONLY_CMDS = {"mute", "fullscreen", "hud", "pause", "resume", "attract"}

# ---------------------------------------------------------------------------
# WHAT SHOULD BE ON DISK — read from kiosk.js, not re-typed here.
#
# The film list used to be written out five times across this repo, and this
# file held one of the copies. That duplication is not a tidiness complaint:
# it is the direct cause of the StreamStage film being accepted by the relay
# and then silently dropped, because one copy knew about a film another did
# not. So the six PRODUCT ids are parsed out of CONFIG.products in kiosk.js —
# the file that is already "the one place you edit" for the tablet tiles — and
# the seventh, StreamStage's own film, is OPERATOR_ONLY_FILMS, which this file
# genuinely owns.
#
# Parsing is deliberately narrow and cannot half-succeed: it either finds the
# products array and returns every id in it, or it returns nothing and the
# built-in list below is used exactly as before. A kiosk.js that has been
# reformatted degrades to today's behaviour, never to a wrong list. /health
# says which of the two is in force so preflight can tell you.
# ---------------------------------------------------------------------------
PRODUCT_FILMS_FALLBACK = [
    "studiosage", "compsync", "callboard", "costumecraft", "studiobeat", "reflect",
]


def product_ids_from_kiosk_js() -> "list[str]":
    """The product ids declared in kiosk.js CONFIG.products, or [] if unsure."""
    try:
        with open(os.path.join(HERE, "kiosk.js"), encoding="utf-8") as fh:
            src = fh.read()
    except OSError:
        return []
    start = src.find("products: [")
    if start == -1:
        return []
    end = src.find("\n  ],", start)
    if end == -1:
        return []
    ids = re.findall(r"^\s*id:\s*'([A-Za-z0-9_-]+)'", src[start:end], re.M)
    # A products array that parsed to one or two entries means the shape moved
    # under us; treat that as a failed parse rather than a shorter booth.
    return ids if len(ids) >= 3 else []


_parsed_ids = product_ids_from_kiosk_js()
PRODUCT_FILMS = _parsed_ids or list(PRODUCT_FILMS_FALLBACK)
FILM_LIST_SOURCE = "kiosk.js" if _parsed_ids else "built-in fallback"
# Every film the booth expects to be able to play. Preflight reads this off
# /health rather than counting to seven on its own, so the check and the server
# cannot disagree about what "all the films" means.
EXPECTED_FILMS = PRODUCT_FILMS + sorted(OPERATOR_ONLY_FILMS)

# ---------------------------------------------------------------------------
# KEEPING /events READABLE. This is not a tidiness rule; it is the fix for a
# booth-killer that was already live.
#
# MEASURED ON DART, 2026-08-08, BEFORE THE SHOW:
#   /events returned 14,018,754 bytes — from ONE day and only 2,073 events.
#   That is ~6.7KB an event, because both Android apps ship their entire
#   diagnostic log LINES into the same stream every 10 seconds. The two apps
#   read the reply behind a hard 512KB cap, so the read stopped mid-string and
#   threw: "JSONException: Unterminated string at character 531872", caught on
#   Daniel's phone. The emergency command channel — sethost, rediscover,
#   reload, clearhost, diag, the only tools for a tablet nobody can reach over
#   adb — was ALREADY DEAD on the live booth.
#
#   Worse for the floor: each device re-downloaded those 14MB every 8 seconds.
#   Two devices on a phone hotspot is ~3.5MB/s of pure re-download, competing
#   with the films for the same air.
#
# THREE RULES, and all three are needed. Filtering to one day is not enough —
# one day was already 26x over the cap.
#
#   1. A log line is not a telemetry event. App diagnostics go to their own
#      file and are NEVER in the /events reply. Daniel still needs them (he
#      cannot reach the tablet over adb), so they are kept and readable at
#      /applog — they are just not in the path the command channel polls.
#   2. A hard byte ceiling on the reply. A truncated JSON array is the worst
#      possible failure because it looks like data and then throws; capping
#      HERE means the reply is always a shorter, VALID array.
#   3. ?since=<ms> so a poller fetches what is new instead of the whole day,
#      every eight seconds, for two days.
# ---------------------------------------------------------------------------

# Anything bigger than this is a log line wearing an event's clothes. A real
# kiosk event — a tap, a film start, a QR impression — is around 200 bytes.
EVENT_MAX_BYTES = 2048

# Known app-diagnostic types. The size rule above is the real defence (a new
# type name cannot outrun it); this is here so a SMALL status line still goes
# to the right file rather than into the tally.
APP_LOG_TYPES = {
    "tablet_log", "tablet_status", "phone_log", "phone_status",
    "app_log", "app_status", "diag",
}

# The reply ceiling. Comfortably under the clients' 512KB read so a full
# response plus headers can never reach it.
MAX_EVENTS_BYTES = 320 * 1024

_log_lock = threading.Lock()
_counts = {"events": 0, "publishes": 0, "leads": 0, "refused": 0, "applog": 0}


def is_app_log(event: dict, raw_len: int = 0) -> bool:
    """Is this a diagnostic log line rather than a booth telemetry event?"""
    if isinstance(event, dict) and event.get("type") in APP_LOG_TYPES:
        return True
    if raw_len and raw_len > EVENT_MAX_BYTES:
        return True
    if isinstance(event, dict):
        try:
            if len(json.dumps(event, separators=(",", ":"))) > EVENT_MAX_BYTES:
                return True
        except (TypeError, ValueError):
            return True
    return False

# Decided in main() and only read after that. beaconPort is None when the
# beacon was turned off or could not start, which is what /health reports and
# what preflight checks against.
_runtime = {"beaconPort": None}

# ---------------------------------------------------------------------------
# WHICH SERVER AM I TALKING TO?
#
# A second copy of this file — one left open in a window from yesterday, one
# started twice at 8am — walks to the next free port pair and serves happily.
# Both then answer /health with ok:true and the same telemetryDir, and nothing
# in the reply distinguished them. A `play` posted to one never reaches a TV
# subscribed to the other; the SSE stream on the dead one just sits there
# saying ": connected", which looks exactly like a working booth. Discovery
# takes the first responder, not the right one.
#
# So every instance now says who it is and whether anything is actually
# listening to it. A client (and preflight.sh) can then tell a live booth from
# a leftover: the live one is the one with a TV on it.
# ---------------------------------------------------------------------------
INSTANCE = {
    "pid": os.getpid(),
    "startedAt": datetime.now().isoformat(timespec="seconds"),
    "startedMs": int(time.time() * 1000),
}


def tv_seen_ms() -> "int | None":
    """When the retained tv state was last refreshed, or None if never.

    The TV heartbeats once a second, so a value more than a few seconds old
    means no screen is attached to THIS instance — which is the whole point.
    """
    with _retained_lock:
        tv = _retained.get("tv")
    if isinstance(tv, dict) and isinstance(tv.get("at"), (int, float)):
        return int(tv["at"])
    return None

# What the lead flusher last managed. Read by /health; written only by the
# flusher thread. Plain strings, because this is read under pressure.
_flush_state = {
    "enabled": False,
    "queued": None,        # leads on disk not yet confirmed sent (None = not looked yet)
    "sent": 0,             # confirmed sends made by THIS process
    "failed": 0,
    "lastTry": None,
    "lastOk": None,
    "note": "not started",
}


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
    elif cmd in OPERATOR_ONLY_CMDS:
        # Mute, fullscreen and the HUD are the operator's recovery controls.
        # They do not touch the gate and cannot be used to reach a film — but a
        # visitor surface has no business reaching into the big screen either,
        # so the refusal is on the wire like the rest of them.
        return cmd + " is an operator control"
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
    """Append one event to today's JSONL, durably. Log lines go to their own file.

    An app's diagnostic line is kept exactly as carefully as a tap — same
    append, same flush, same fsync — but in applog-YYYY-MM-DD.jsonl, because
    /events is what the emergency command channel polls and a 6.7KB log line
    in there is what killed it. Daniel can still read every one of them
    (GET /applog); they are simply not in the poll path any more.
    """
    os.makedirs(TELEMETRY_DIR, exist_ok=True)
    day = datetime.now().strftime("%Y-%m-%d")
    line = json.dumps(event, separators=(",", ":")) + "\n"
    app_log = is_app_log(event, len(line))
    kind = "applog" if app_log else "events"
    path = os.path.join(TELEMETRY_DIR, f"{kind}-{day}.jsonl")
    with _log_lock:
        with open(path, "a", encoding="utf-8") as fh:
            fh.write(line)
            fh.flush()
            os.fsync(fh.fileno())       # a yanked power cable must not eat the day
    _counts[kind] += 1


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


def read_events(day: "str | None" = None, since: int = 0,
                prefix: str = "events", keep_logs: bool = False,
                only_logs: bool = False) -> "list[dict]":
    """Telemetry events, oldest first. TODAY'S by default — see below.

    This is what makes the operator tally correct when the TV is a Fire Stick.
    The two screens are then different DEVICES with different localStorage, so
    neither browser can see the other's events — but both POST here, so the
    server is the only place the whole picture exists.

    WHY THIS IS NO LONGER "EVERYTHING EVER".
    ---------------------------------------
    It used to glob every events-*.jsonl and return the lot, and the two
    Android clients read the reply behind a hard 512KB cap. At ~198 bytes an
    event that cap is 2,648 events; the TV's attract loop alone writes ~10 per
    four-minute cycle and both apps ship a diagnostic line every 10s into the
    same file. So partway through a two-day show the read stops mid-byte, the
    JSON parse throws, the error is swallowed, and the poll retries the same
    broken thing forever with nothing on screen — taking sethost, rediscover,
    reload, clearhost and diag with it. Those are precisely the tools for
    fixing a tablet that cannot be reached over adb, and they would have died
    at the busiest moment of the second day.

    So the default is ONE day, which is what every reader actually wants:

        /events                  today
        /events?since=<ms>       today, only what is newer than <ms>
        /events?day=2026-08-11   that day
        /events?day=all          every file — the end-of-show export, and the
                                 only caller that wants two days at once

    `since` is what stops both apps re-downloading the whole array every 8
    seconds over the same hotspot the films are streaming on.
    """
    out: "list[dict]" = []
    if not os.path.isdir(TELEMETRY_DIR):
        return out

    if day is None:
        day = datetime.now().strftime("%Y-%m-%d")
    if day == "all":
        names = sorted(n for n in os.listdir(TELEMETRY_DIR)
                       if n.startswith(prefix + "-") and n.endswith(".jsonl"))
    else:
        names = [f"{prefix}-{day}.jsonl"]

    for name in names:
        if not (name.startswith(prefix + "-") and name.endswith(".jsonl")):
            continue
        if not os.path.isfile(os.path.join(TELEMETRY_DIR, name)):
            continue
        try:
            with open(os.path.join(TELEMETRY_DIR, name), encoding="utf-8") as fh:
                for line in fh:
                    line = line.strip()
                    if not line:
                        continue
                    # Cheapest possible defence, done BEFORE parsing: a line
                    # this long is a diagnostic log, and today's file on a live
                    # booth is already full of them from before they were split
                    # out. Skipping on length costs no JSON parse at all, which
                    # matters when the file is 14MB.
                    long_line = len(line) > EVENT_MAX_BYTES
                    if not keep_logs and long_line:
                        continue
                    try:
                        ev = json.loads(line)
                    except json.JSONDecodeError:
                        continue    # a torn last line after a crash: skip it, keep the rest
                    if only_logs and not is_app_log(ev, len(line)):
                        continue
                    if not keep_logs and is_app_log(ev):
                        continue
                    if since and not (isinstance(ev, dict) and ev.get("ms", 0) > since):
                        continue
                    out.append(ev)
        except OSError:
            pass
    out.sort(key=lambda e: e.get("ms", 0))
    return out


def capped_json(events: "list[dict]", limit_bytes: int) -> "tuple[bytes, int, int]":
    """Serialise `events`, dropping the OLDEST until it fits. Always valid JSON.

    Returns (body, kept, dropped).

    The ceiling is the point. A reply that overruns a client's read buffer is
    not "a big reply" — it is a truncated JSON array, which looks like data and
    then throws on parse, and the client has no way to tell that from a server
    that is down. Measured on the live booth: 14,018,754 bytes against a
    524,288-byte read, and the emergency command channel simply stopped, with
    the exception swallowed and the same broken request retried for ever.

    So the SERVER decides how much it will say. Newest events are kept, because
    a poller wants what just happened; and the answer is always a complete
    array that parses, even when it is not the whole day.
    """
    body = json.dumps(events, separators=(",", ":")).encode()
    if len(body) <= limit_bytes:
        return body, len(events), 0
    lo, hi, best = 0, len(events), []
    while lo <= hi:                       # how many of the NEWEST fit
        mid = (lo + hi) // 2
        trial = events[len(events) - mid:] if mid else []
        if len(json.dumps(trial, separators=(",", ":")).encode()) <= limit_bytes:
            best, lo = trial, mid + 1
        else:
            hi = mid - 1
    return (json.dumps(best, separators=(",", ":")).encode(),
            len(best), len(events) - len(best))


def _day_file_bytes(prefix: str) -> int:
    """Size of today's events- / applog- file, or 0. Cheap enough for /health."""
    day = datetime.now().strftime("%Y-%m-%d")
    try:
        return os.path.getsize(os.path.join(TELEMETRY_DIR, f"{prefix}-{day}.jsonl"))
    except OSError:
        return 0


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


# ---------------------------------------------------------------------------
# THE LAN BEACON.
#
# On the venue's phone hotspot every address changes, and the tablet and the
# phone find this laptop by probing 254 addresses on several ports each — on a
# weak Fire tablet, over a congested trade-show 2.4GHz band. It works, and it
# is slow and hopeful.
#
# So this shouts. Once every two seconds, one small UDP datagram saying where
# the kiosk is. A client that is listening finds it in under two seconds
# instead of sweeping a /24.
#
# THREE RULES, in the order that matters:
#
#   1. It is PURELY ADDITIVE. Nothing was removed from serve.py to make room
#      for it, no existing endpoint changed shape, and the sweep-based
#      discovery in tablet-app/ and phone-app/ keeps working untouched. The
#      beacon is a shortcut, never the only path.
#   2. It can NEVER affect serving. It runs on its own daemon thread, every
#      send is wrapped, and a socket that cannot be created at all simply ends
#      the thread — the HTTP servers never learn that it happened.
#   3. The packet shape is documented in BEACON.md and is the contract the
#      Android clients build against. Change the shape there first.
# ---------------------------------------------------------------------------
def beacon_targets(ip: str) -> "list[str]":
    """Where to shout. Limited broadcast, plus this subnet's directed one.

    255.255.255.255 is the one every stack understands, but some Android Wi-Fi
    drivers drop it while happily accepting a directed 192.168.x.255. A /24 is
    assumed for the directed address, which is what a travel router and a phone
    hotspot both hand out. Sending to both costs one extra datagram.
    """
    out = ["255.255.255.255"]
    parts = ip.split(".")
    if len(parts) == 4 and all(p.isdigit() for p in parts) and ip != "127.0.0.1":
        directed = ".".join(parts[:3] + ["255"])
        if directed not in out:
            out.append(directed)
    return out


def beacon_loop(page_port: int, beacon_port: int) -> None:
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    except OSError as exc:
        sys.stderr.write(f"[beacon] not started: {exc}\n")
        return

    while True:
        try:
            ip = lan_ip()
            packet = json.dumps({
                "ss": "kiosk",              # magic: ignore anything else on this port
                "v": 1,
                "host": ip,
                "port": page_port,
                "telemetryPort": page_port + 1,
                "tv": f"http://{ip}:{page_port}/tv",
                "tablet": f"http://{ip}:{page_port}/tablet",
                "films": sorted(films_on_disk().keys()),
                "subscribers": len(_subscribers),
                "t": int(time.time() * 1000),
            }, separators=(",", ":")).encode("utf-8")
            for target in beacon_targets(ip):
                try:
                    sock.sendto(packet, (target, beacon_port))
                except OSError:
                    pass        # one unreachable broadcast address is not a problem
        except Exception:
            pass                # the booth serves films; the beacon is a courtesy
        time.sleep(BEACON_INTERVAL_S)


# ---------------------------------------------------------------------------
# THE ON-DISK LEAD QUEUE, DRAINED.
#
# The tablet's browser queue retries by itself: it re-flushes every five
# seconds and survives a reload. THIS queue — the JSONL that serve.py fsyncs
# on arrival — did not. A lead typed while the venue wifi was down landed
# safely on disk and then sat there until somebody remembered to run
# flush-leads.py by hand. The most valuable byte the booth produces, waiting
# on a human.
#
# So the server retries it. Every two minutes it asks whether there is
# anything unsent, and if there is, whether the internet is back; only if both
# are true does it send. flush-leads.py is IMPORTED, not reimplemented — the
# payload shape, the SES reply-to rule and the marker file all stay in the one
# file that owns them, and a manual run and an automatic one are then the same
# code doing the same thing.
#
# IDEMPOTENCY, which matters more than speed:
#   - leads-flushed.json is the record of what has been confirmed sent, and it
#     is re-read immediately BEFORE every single send. So if Daniel runs
#     flush-leads.py by hand while this is running, whichever gets there first
#     wins and the other skips that lead rather than double-mailing a studio.
#   - It is written immediately AFTER every success, one lead at a time, so a
#     crash mid-drain costs a rewrite and never a duplicate.
#   - A failure stops the pass rather than grinding through the rest. A failure
#     almost always means the connection went again; the queue is still on
#     disk, and the next pass carries it.
# ---------------------------------------------------------------------------
def load_flusher():
    """flush-leads.py as a module, or None. The hyphen is why this is not import."""
    path = os.path.join(HERE, "flush-leads.py")
    if not os.path.isfile(path):
        return None
    try:
        spec = importlib.util.spec_from_file_location("ss_flush_leads", path)
        if spec is None or spec.loader is None:
            return None
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        # Only accept a module that has everything this needs, so a future edit
        # to flush-leads.py degrades to "no auto-flush" and never to a crash.
        for name in ("load_leads", "load_marker", "save_marker", "payload_for", "send", "ENDPOINT"):
            if not hasattr(mod, name):
                return None
        return mod
    except Exception as exc:
        sys.stderr.write(f"[leads] auto-flush unavailable: {exc}\n")
        return None


def internet_up(host: str, timeout: float = 4.0) -> bool:
    """Can we reach the lead route's host at all? One TCP connect, no request."""
    if not host:
        return False
    try:
        s = socket.create_connection((host, 443), timeout=timeout)
        s.close()
        return True
    except OSError:
        return False


def flush_leads_once(mod) -> None:
    """One drain pass. Never raises; records what happened in _flush_state."""
    try:
        leads = mod.load_leads()
        marker = mod.load_marker()
        todo = [l for l in leads if l["_lid"] not in marker]
    except Exception as exc:
        _flush_state["note"] = f"could not read the queue: {exc}"
        return

    _flush_state["queued"] = len(todo)
    if not todo:
        _flush_state["note"] = "nothing queued"
        return

    host = urllib.parse.urlparse(mod.ENDPOINT).hostname
    _flush_state["lastTry"] = datetime.now().isoformat(timespec="seconds")
    if not internet_up(host):
        _flush_state["note"] = f"{len(todo)} queued, no internet yet — will retry"
        return

    sent = 0
    for lead in todo:
        try:
            # Re-read immediately before sending: a manual flush-leads.py run
            # may have confirmed this one since the list above was built.
            if lead["_lid"] in mod.load_marker():
                continue
            ok, detail = mod.send(mod.ENDPOINT, mod.payload_for(lead))
        except Exception as exc:
            ok, detail = False, str(exc)
        if not ok:
            _flush_state["failed"] += 1
            _flush_state["note"] = (f"sent {sent}, then failed on "
                                    f"{lead.get('email', '?')}: {detail} — kept, will retry")
            _flush_state["queued"] = len(todo) - sent
            return
        try:
            marker = mod.load_marker()
            marker[lead["_lid"]] = time.strftime("%Y-%m-%dT%H:%M:%S%z")
            mod.save_marker(marker)
        except Exception as exc:
            # Sent but not recorded. Stop immediately: carrying on would risk
            # re-sending this same lead on the next pass.
            _flush_state["note"] = (f"sent {lead.get('email', '?')} but could not "
                                    f"record it ({exc}) — stopping to avoid a double send")
            return
        sent += 1
        _flush_state["sent"] += 1
        _flush_state["lastOk"] = datetime.now().isoformat(timespec="seconds")
        time.sleep(0.5)             # be gentle with the live route

    _flush_state["queued"] = 0
    _flush_state["note"] = f"sent {sent} — queue empty"


def lead_flush_loop(interval_s: float, endpoint: "str | None" = None) -> None:
    mod = load_flusher()
    if mod is None:
        _flush_state["note"] = "flush-leads.py not usable — leads stay on disk"
        return
    if endpoint:
        mod.ENDPOINT = endpoint
    _flush_state["endpoint"] = mod.ENDPOINT
    _flush_state["enabled"] = True
    _flush_state["note"] = "waiting for the first pass"
    time.sleep(LEAD_FLUSH_FIRST_DELAY_S)
    while True:
        try:
            flush_leads_once(mod)
        except Exception as exc:            # a booth must never die of bookkeeping
            _flush_state["note"] = f"pass failed: {exc}"
        time.sleep(interval_s)


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
        if not self.path.startswith(("/bus", "/log", "/lead", "/health", "/state",
                                     "/events", "/applog")):
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

            # A DEAD TV MUST NOT KEEP DESCRIBING ITSELF.
            # `tv` is retained, so when the stick is unplugged or its app is
            # stopped this went on serving the last object it ever sent —
            # measured at ~84 s of a confident, wrong picture, including a film
            # list that no longer existed — while /health already read
            # hasTv:false. Every consumer that trusts state["tv"] alone (the
            # phone console, the tablet's TV badge) drew a live screen that was
            # gone. Rather than ask each of them to cross-check /health, the
            # server stops asserting what it no longer knows: past the same 5 s
            # window /health uses, the retained object is marked stale and its
            # live fields are dropped. `tv` stays present so nothing KeyErrors,
            # and `_stale` says why. Same threshold as hasTv, deliberately —
            # two different answers from one process is the bug, not the fix.
            _tv = out.get("tv")
            if isinstance(_tv, dict):
                _at = _tv.get("at")
                _age = (int(time.time() * 1000) - int(_at)) if isinstance(_at, (int, float)) else None
                if _age is None or _age >= 5000:
                    out["tv"] = {
                        "type": "tv",
                        "_stale": True,
                        "_ageMs": _age,
                        "at": _at,
                        # Deliberately NOT state/product/pos/order: those are
                        # claims about a screen this process can no longer see.
                    }

            have = films_on_disk()
            out["_server"] = {
                "films": have,
                "operatorOnlyFilms": sorted(OPERATOR_ONLY_FILMS),
                # What SHOULD be there, and what is not. The phone can now show
                # a missing film as missing instead of drawing a row that will
                # do nothing when it is tapped.
                "expectedFilms": EXPECTED_FILMS,
                "missingFilms": [f for f in EXPECTED_FILMS if f not in have],
                "refused": _counts["refused"],
                "subscribers": len(_subscribers),
            }
            return self._send(200, json.dumps(out).encode())
        if path in ("/events", "/applog"):
            # /events  the booth's telemetry — what the tally and the command
            #          channel read. TODAY only, app log lines excluded, and
            #          hard-capped so the reply always parses.
            # /applog  the apps' diagnostic lines, which Daniel needs because
            #          he cannot reach the tablet over adb. Same shape, same
            #          cap, kept well away from the poll path.
            #
            #   ?since=<ms>   only what is newer — what a poller should send
            #   ?day=all      every file (the end-of-show export)
            #   ?cap=off      no byte ceiling. For a BROWSER export only; an
            #                 Android client must never send this.
            q = urllib.parse.parse_qs(self.path.split("?", 1)[1]) if "?" in self.path else {}
            day = (q.get("day") or [None])[0]
            try:
                since = int((q.get("since") or ["0"])[0])
            except ValueError:
                since = 0
            if path == "/applog":
                # Both places log lines can be. New ones go to applog-*.jsonl;
                # the ones already mixed into a live booth's events-*.jsonl
                # from before the split must not become unreachable just
                # because the server was restarted — nothing on disk is
                # deleted and nothing stops being readable.
                rows = read_events(day, since, prefix="applog", keep_logs=True)
                rows += read_events(day, since, prefix="events", keep_logs=True, only_logs=True)
                rows.sort(key=lambda e: e.get("ms", 0))
            else:
                rows = read_events(day, since, prefix="events")
            if (q.get("cap") or [""])[0] == "off":
                body, kept, dropped = json.dumps(rows).encode(), len(rows), 0
            else:
                body, kept, dropped = capped_json(rows, MAX_EVENTS_BYTES)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            # So a client (and preflight) can SEE that it did not get the lot,
            # instead of inferring it from a parse failure.
            self.send_header("X-Events-Returned", str(kept))
            self.send_header("X-Events-Dropped", str(dropped))
            self.end_headers()
            try:
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError):
                pass
            return
        if path == "/films":
            # What is on disk, so the TV never points a <video> at a missing
            # file and the tablet never promises a film that is still rendering.
            return self._send(200, json.dumps(films_on_disk()).encode())
        if path == "/health":
            # `ip` is what the launcher page shows you to type into a Fire Stick.
            #
            # preflight.sh reads this and nothing else for the film check, so
            # expectedFilms / missingFilms live here rather than being counted
            # to seven in a shell script that can fall out of step with the
            # server. filmsSource says whether the list came from kiosk.js or
            # from the built-in fallback.
            have = films_on_disk()
            tv_at = tv_seen_ms()
            now_ms = int(time.time() * 1000)
            return self._send(200, json.dumps({
                "ok": True,
                "ip": lan_ip(),
                "port": self.server.server_address[1],
                "subscribers": len(_subscribers),
                # --- which instance is this, and is anything using it? ---
                "pid": INSTANCE["pid"],
                "startedAt": INSTANCE["startedAt"],
                "uptimeS": round((now_ms - INSTANCE["startedMs"]) / 1000, 1),
                # hasTv is the one that settles an argument between two
                # instances: the live booth is the one a TV is heartbeating at.
                "hasTv": bool(tv_at is not None and (now_ms - tv_at) < 5000),
                "tvLastSeenMs": tv_at,
                "events": _counts["events"],
                "leads": _counts["leads"],
                "refused": _counts["refused"],
                "telemetryDir": TELEMETRY_DIR,
                "telemetryWritable": os.access(TELEMETRY_DIR, os.W_OK),
                # Raw file sizes, so preflight can say "the file is enormous"
                # even though the REPLY is now capped and always parses.
                "eventsFileBytes": _day_file_bytes("events"),
                "applogFileBytes": _day_file_bytes("applog"),
                "eventsCapBytes": MAX_EVENTS_BYTES,
                "expectedFilms": EXPECTED_FILMS,
                "missingFilms": [f for f in EXPECTED_FILMS if f not in have],
                "filmsSource": FILM_LIST_SOURCE,
                "beaconPort": _runtime["beaconPort"],
                "leadFlush": dict(_flush_state),
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
                # 507, NOT 200. This was the exact inverse of the leads path
                # below and it silently ate the day's record: kiosk.js marks a
                # batch as sent on `r.ok`, and a 200 is ok — so a disk-full or
                # a permissions error made the browser stamp every event in
                # that batch as safely on disk and never retry it. The events
                # were then in neither place. The leads path already answered
                # 507 for the same failure, for the same reason, and the two
                # must agree: an unwritten event stays queued in the browser.
                sys.stderr.write(f"[telemetry] write failed: {exc}\n")
                return self._send(507, b'{"ok":false,"stored":"browser-only"}')
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
    ap.add_argument("--beacon-port", type=int, default=BEACON_PORT,
                    help="UDP port the LAN beacon shouts on. Default %d. "
                         "See BEACON.md for the packet." % BEACON_PORT)
    ap.add_argument("--no-beacon", action="store_true",
                    help="do not broadcast at all. Discovery falls back to the "
                         "address sweep, exactly as before.")
    ap.add_argument("--no-flush", action="store_true",
                    help="do not retry the on-disk lead queue automatically. "
                         "Leads stay on disk for flush-leads.py to send by hand.")
    ap.add_argument("--flush-interval", type=float, default=LEAD_FLUSH_INTERVAL_S,
                    help="seconds between lead-queue retries. Default %d." % LEAD_FLUSH_INTERVAL_S)
    ap.add_argument("--lead-endpoint", default=None,
                    help="where queued leads are POSTed. Defaults to the live route in "
                         "flush-leads.py. POINT A TEST INSTANCE SOMEWHERE ELSE — anything "
                         "in the queue WILL be sent to whatever this names, and a lead sent "
                         "upstream cannot be recalled.")
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

    # EXPECTED_FILMS is the six product ids read out of kiosk.js plus
    # streamstage-services — StreamStage's own recital filming / livestream
    # film, which is not a product and plays as a card in the TV attract loop.
    # A missing film is not an error: the card falls back to text plus its QR.
    missing = [f"media/{f}.mp4" for f in EXPECTED_FILMS
               if not os.path.exists(os.path.join(HERE, "media", f + ".mp4"))]

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
    print(f"  Leads     -> {TELEMETRY_DIR}/leads-YYYY-MM-DD.jsonl   (typed on the tablet)")
    if args.no_flush:
        print(f"               auto-send is OFF — run flush-leads.py by hand, with internet.")
    else:
        # Named out loud, above the fold, because this is the one thread that
        # reaches OFF this laptop and what it sends cannot be recalled. A test
        # instance started next to a queue of test leads will mail them to
        # whatever is printed here. (Learned the hard way, 2026-08-07: a test
        # server left with the default endpoint sent two fabricated leads to
        # the live route before anyone noticed.)
        lead_ep = args.lead_endpoint or "https://streamstage.live/api/expo-leads (the live route)"
        print(f"               ANY QUEUED LEAD IS SENT TO:")
        print(f"                 {lead_ep}")
        print(f"               retried every {int(args.flush_interval)}s once there is internet.")
        print(f"               flush-leads.py still works by hand and cannot double-send.")
        print(f"               Testing? use  --no-flush  or  --lead-endpoint http://localhost:9999/sink")
    if not args.no_beacon:
        print(f"\n  LAN beacon -> UDP {args.beacon_port}, every {BEACON_INTERVAL_S:g}s (see BEACON.md).")
        print(f"                The tablet and phone can still find this by sweeping; this is faster.")
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

    # Both of these are daemon threads started AFTER the listeners are bound and
    # the banner is printed. Neither can stop the booth serving films: if either
    # one dies, the only thing that changes is that a client falls back to the
    # address sweep, or a lead waits for flush-leads.py to be run by hand — which
    # is exactly where both of them were yesterday.
    if not args.no_beacon:
        _runtime["beaconPort"] = args.beacon_port
        threading.Thread(target=beacon_loop, args=(port, args.beacon_port), daemon=True).start()
    if not args.no_flush:
        threading.Thread(target=lead_flush_loop,
                         args=(args.flush_interval, args.lead_endpoint), daemon=True).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print(f"\n  stopped. {_counts['events']} telemetry events written.\n")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
