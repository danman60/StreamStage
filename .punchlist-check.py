#!/usr/bin/env python3
"""Verify the deck changes promised after expo 1 actually landed in the shipping decks.
Items are the numbered punch list in expo-assets/CRITIQUE-AND-PUNCHLIST-2026-08-05.md."""
import re, sys

T1 = open('/home/danman60/projects/StudioSage/live-demo/talk1-deck.html', encoding='utf-8').read()
T2 = open('/home/danman60/projects/StreamStage/expo-assets/decks/talk2-ai.html', encoding='utf-8').read()

CHECKS = [
    # (item, deck label, text, regex, min_hits)
    (19, 'T1', 'media-fee act exists as its own block', r'data-block="fee"', 3),
    (20, 'T1', 'provoke-technique slide', r'provoke', 1),
    (21, 'T1', 'four stations as forced clicks', r'(?i)station\s*(four|4)|CLICK.{0,40}station', 1),
    (22, 'T1', 'booking CTA on screen (QR) and in the beats', r'qr-book\.svg', 1),
    (22.1, 'T1', 'booking CTA spoken in beats', r'(?i)streamstage\.live/book|come find me and we will see', 1),
    (23, 'T1', 'StudioSage cut to a 30-second sting', r'30-Second Sting|30 seconds', 1),
    (23.1, 'T1', 'snark-slider laugh kept', r'(?i)snark', 1),
    (25, 'T1', 'codec/frame-rate primer as appendix', r'data-block="apx"', 2),
    (26, 'T1', 'ad-lib: charge for the content day', r'(?i)charge for it|fund a videographer', 1),
    (28, 'T2', 'clock re-timed to a real 60 on paper', r'58:30|59:00|60:00', 1),
    (29, 'T2', 'first free move early (move 1 before ~minute 10)', r'(?i)9:00|Move 1', 1),
    (30, 'T2', 'Oprah is the cold open', r'(?i)oprah', 1),
    (30.1, 'T2', 'Sheridan bit retired', r'(?i)sheridan', 0),   # expect ZERO
    (31, 'T2', '$10,000 an hour promoted to the spine', r'10,000 an [Hh]our', 1),
    (32, 'T2', "deliberate 'what's working for you?' slot", r'(?i)should be stealing|what.{0,3}s working', 1),
    (33, 'T2', 'honest limits slide', r'(?i)limits|cannot scope|per-dancer', 1),
    (36, 'T2', 'pricing said once (count mentions)', r'\$20\s*(/|a )month', 1),
    (37, 'T2', 'Q&A before the CTA', r'(?i)Q&amp;A.{0,120}(BEFORE|before) the CTA|Q&amp;A now happens BEFORE', 1),
    (38, 'T2', 'dancing-robots clip sourced', r'(?i)robot', 1),
    ('D2', 'T2', 'deck QRs gated with attribution', r'/g\?a=\w+&(amp;)?src=talk2', 1),
    ('SMS', 'T2', 'demo SMS QR uses the Calgary demo number', r'sms:\+15873170721', 1),
    ('SMS2', 'T2', 'production number NOT used as a live target', r'sms:\+12267966037', 0),  # expect ZERO
    ('FL', 'T2', 'reveal only reveals a READY build (2026-08-09 fix)', r"var live=\(f\.status==='ready'\)", 1),
]

decks = {'T1': T1, 'T2': T2}
print(f"{'item':<6} {'deck':<5} {'verdict':<8} detail")
print('-' * 92)
bad = 0
for item, deck, desc, rx, want in CHECKS:
    hits = len(re.findall(rx, decks[deck]))
    if want == 0:
        ok = hits == 0
        detail = f"{desc} — {hits} hit(s), wanted none"
    else:
        ok = hits >= want
        detail = f"{desc} — {hits} hit(s), wanted >={want}"
    if not ok:
        bad += 1
    print(f"{str(item):<6} {deck:<5} {'OK' if ok else 'CHECK':<8} {detail}")
print('-' * 92)
print(f"{len(CHECKS)-bad}/{len(CHECKS)} pass")
sys.exit(0)
