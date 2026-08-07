#!/usr/bin/env python3
"""Regenerate talk2-ai-slides.md from the deck. Run after any deck change."""
import re, pathlib, html
D = pathlib.Path(__file__).parent
deck = (D / "decks/talk2-ai.html").read_text(encoding="utf-8")
rows = []
for i, m in enumerate(re.finditer(r'<section class="[^"]*slide[^"]*"[^>]*data-title="([^"]*)"(.*?)</section>', deck, re.S), 1):
    title = html.unescape(m.group(1))
    body = m.group(2)
    note = re.search(r'<aside class="note"><b>(.*?)</b>', body, re.S)
    cue = html.unescape(re.sub(r'<[^>]+>', '', note.group(1))) if note else ""
    beats = len([b for b in re.search(r'data-beats="([^"]*)"', m.group(0)).group(1).split("|") if b]) \
            if 'data-beats="' in m.group(0) else 0
    frags = len(re.findall(r'class="[^"]*\bfrag\b', body))
    rows.append((i, title, cue, beats, frags))
out = ["# Talk 2 — Slide Outline (GENERATED from decks/talk2-ai.html — do not hand-edit)", "",
       "**Why AI? Save Your Studio Time, Money, and Stress** · Tue Aug 11 2026, 09:20–10:20 MDT · Adapt Stage, Calgary",
       "", f"Regenerate with `python3 expo-assets/regen-slides.py`. **{len(rows)} slides.**", "",
       "| # | Slide | Cue | Beats | Clicks |", "|---|---|---|---|---|"]
for i, t, c, b, f in rows:
    out.append(f"| {i} | {t} | {c} | {b} | {f} |")
(D / "talk2-ai-slides.md").write_text("\n".join(out) + "\n", encoding="utf-8")
print(f"wrote talk2-ai-slides.md — {len(rows)} slides, "
      f"{sum(1 for r in rows if r[3]==0)} without hand-written beats")
