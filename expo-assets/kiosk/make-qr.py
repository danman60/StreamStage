#!/usr/bin/env python3
"""Generate the booth QR codes as self-contained SVG files.

Run once (and again if a URL in kiosk.js changes):

    python3 expo-assets/kiosk/make-qr.py

Everything is written to expo-assets/kiosk/qr/ and committed. No network at
run time, no CDN, no <script> QR library — the booth machine will not have
internet and a QR that fails to render is a dead booth.

Two kinds of QR, and the difference is deliberate:

  PRODUCT QRs (qr/tv/<product>.svg, qr/tablet/<product>.svg) go STRAIGHT to the
  product. We want a studio owner in the app, not behind a form. They keep their
  ?src=booth-calgary&p=<product>&s=<screen> tags, so a REAL scan is countable on
  the destination side.

  MATERIAL QRs (the "all six films" offer, the recital-services card) go to the
  gated landing page https://streamstage.live/g — nothing we give away is given
  away without capturing the email and studio name. They carry
  ?a=<asset>&src=booth_tablet|booth_tv&p=<product>&s=<surface>, which is the
  taxonomy `src` values the leads route already validates.

  /g is extensionless on purpose and it resolves: checked 2026-08-07, the live
  site answers 200 for /checklist as well as /checklist.html, so public/g.html
  is reachable at /g.

The Facebook QR is deliberately clean: Daniel cannot read a query string off a
group join, so tagging it would only manufacture a number nobody can check.
"""

import os
import qrcode

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "qr")

FACEBOOK = "https://www.facebook.com/groups/2834366403591742"

# Keep in lockstep with CONFIG.products in kiosk.js.
PRODUCTS = {
    "studiosage":   "https://studiosage.ai",
    "compsync":     "https://compsync.net",          # confirmed by Daniel 2026-08-07
    "callboard":    "https://callboard-scheduler.vercel.app",
    "costumecraft": "https://costume-craft.vercel.app",
    "studiobeat":   "https://www.studiobeat.io/",  # confirmed live 2026-08-06 (200, Vercel)
    "reflect":      "https://reflect-vert.vercel.app/demo/login",
}

SRC = "booth-calgary"

# The gated landing page. Every material QR lands here — it asks for name,
# studio and email, then emails the asset. Opens on the attendee's own phone on
# their own cell data, which is why it still works when the venue wifi is dead.
GATE = "https://streamstage.live/g"

# The `src` taxonomy the leads route validates. Underscored, not the hyphenated
# booth-calgary tag the product QRs carry — those two are different fields with
# different readers and must not be conflated.
SRC_TABLET = "booth_tablet"
SRC_TV = "booth_tv"


def tagged(url: str, product: str, surface: str) -> str:
    """A PRODUCT QR: straight to the product, attribution appended."""
    sep = "?" if "?" not in url else "&"
    return f"{url}{sep}src={SRC}&p={product}&s={surface}"


def gated(asset: str, src: str, product: str, surface: str) -> str:
    """A MATERIAL QR: the gate, carrying what was promised and where it was scanned."""
    return f"{GATE}?a={asset}&src={src}&p={product}&s={surface}"


def svg(data: str, quiet: int = 3) -> str:
    """Render to SVG by hand: one white rect + one black path.

    ERROR_CORRECT_M survives a booth light glare and a phone held crooked
    without inflating the module count the way H would.
    """
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=1,
        border=quiet,
    )
    qr.add_data(data)
    qr.make(fit=True)
    matrix = qr.get_matrix()
    size = len(matrix)

    # One path, one subpath per dark module. Rendered crisp at any size.
    parts = []
    for y, row in enumerate(matrix):
        x = 0
        while x < size:
            if row[x]:
                run = 1
                while x + run < size and row[x + run]:
                    run += 1
                parts.append(f"M{x} {y}h{run}v1h-{run}z")
                x += run
            else:
                x += 1
    path = "".join(parts)

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" '
        f'shape-rendering="crispEdges" role="img" aria-label="QR code">'
        f'<rect width="{size}" height="{size}" fill="#fff"/>'
        f'<path d="{path}" fill="#000"/>'
        f"</svg>"
    )


def write(name: str, data: str) -> None:
    path = os.path.join(OUT, name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(svg(data))
    print(f"{name:34s} -> {data}")


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    count = 0
    write("facebook.svg", FACEBOOK)
    count += 1
    for surface in ("tv", "tablet"):
        for product, url in PRODUCTS.items():
            write(f"{surface}/{product}.svg", tagged(url, product, surface))
            count += 1
    # The offer on the tablet after a film ends. Gated.
    # It used to promise "all six films". We do not send the films — they are
    # what plays on the booth screen, not a giveaway — so it offers the recital
    # video checklist, which is a real freebie and the right thing to hand
    # somebody who just watched a film about recital video.
    for product in PRODUCTS:
        write(f"tablet/leads-{product}.svg", gated("checklist", SRC_TABLET, product, "tablet"))
        count += 1
    # The StreamStage services card on the TV attract loop (recital filming and
    # livestream). TV ONLY — this is deliberately NOT a seventh tablet tile.
    write("tv/recital.svg", gated("recital", SRC_TV, "recital", "tv"))
    count += 1
    print(f"\n{count} QR codes written to {OUT}")


if __name__ == "__main__":
    main()
