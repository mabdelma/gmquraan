#!/usr/bin/env python3
"""
Generate the six service-area tiles.

Why these are drawn rather than photographed: the association's media library
contains no documentary photography of its own work. What is there is stock —
generic green social cards carrying single words, and a flat illustration of a
hand holding a family. Labelling a stock card "our nursery" or "our Quran
circle" would caption an image as evidence of something it does not show, so
the tiles here are openly abstract instead. They are geometry in the emblem's
own palette, carrying no claim about what a room or a class looks like.

These are placeholders in the honest sense: when the association supplies real
photographs of its circles, nursery, workshop and projects, drop them into
apps/web/public/img/services/ under the same names and the cards pick them up
with no code change.

Run:  python scripts/build-service-tiles.py
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "apps/web/public/img/services"

W, H = 1200, 800

# Straight from globals.css — the emblem's own colours.
INK = (12, 52, 51)
DEEP = (23, 95, 94)
TEAL = (77, 172, 172)
MINT = (185, 222, 207)
GOLD = (215, 183, 90)
PAPER = (248, 247, 243)


def base(c1, c2):
    """A soft diagonal wash between two brand colours."""
    im = Image.new("RGB", (W, H), c1)
    d = ImageDraw.Draw(im)
    for i in range(H):
        f = i / H
        d.line(
            [(0, i), (W, i)],
            fill=tuple(round(c1[k] + (c2[k] - c1[k]) * f) for k in range(3)),
        )
    return im


def arcs(im, colour, n=7, alpha=70):
    """Concentric arcs echoing the wreath."""
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = W * 0.78, H * 0.5
    for i in range(n):
        r = 90 + i * 62
        d.arc([cx - r, cy - r, cx + r, cy + r], 120, 240, fill=colour + (alpha,), width=7)
    im.paste(Image.alpha_composite(im.convert("RGBA"), layer).convert("RGB"), (0, 0))


def book(im, colour, alpha=90):
    """An open-book silhouette: two facing pages."""
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy, w, h = W * 0.5, H * 0.56, 300, 180
    d.polygon([(cx, cy - h * 0.5), (cx - w, cy - h * 0.2), (cx - w, cy + h), (cx, cy + h * 0.6)],
              fill=colour + (alpha,))
    d.polygon([(cx, cy - h * 0.5), (cx + w, cy - h * 0.2), (cx + w, cy + h), (cx, cy + h * 0.6)],
              fill=colour + (alpha - 20,))
    im.paste(Image.alpha_composite(im.convert("RGBA"), layer).convert("RGB"), (0, 0))


def dots(im, colour, step=58, r=5, alpha=60):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for y in range(step, H, step):
        for x in range(step, W, step):
            d.ellipse([x - r, y - r, x + r, y + r], fill=colour + (alpha,))
    im.paste(Image.alpha_composite(im.convert("RGBA"), layer).convert("RGB"), (0, 0))


def rays(im, colour, n=14, alpha=45):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = W * 0.22, H * 1.05
    for i in range(n):
        a = math.radians(-90 + (i - n / 2) * 7.5)
        d.line([(cx, cy), (cx + math.cos(a) * 1500, cy + math.sin(a) * 1500)],
               fill=colour + (alpha,), width=16)
    im.paste(Image.alpha_composite(im.convert("RGBA"), layer).convert("RGB"), (0, 0))


def hands(im, colour, alpha=85):
    """Two cupped forms, as in the emblem."""
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = W * 0.5, H * 0.62
    d.pieslice([cx - 420, cy - 150, cx - 20, cy + 250], 300, 60, fill=colour + (alpha,))
    d.pieslice([cx + 20, cy - 150, cx + 420, cy + 250], 120, 240, fill=colour + (alpha,))
    im.paste(Image.alpha_composite(im.convert("RGBA"), layer).convert("RGB"), (0, 0))


def weave(im, colour, alpha=55, step=70):
    """Crossing threads — the workshop."""
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for x in range(-H, W + H, step):
        d.line([(x, 0), (x + H, H)], fill=colour + (alpha,), width=9)
        d.line([(x, H), (x + H, 0)], fill=colour + (alpha // 2,), width=9)
    im.paste(Image.alpha_composite(im.convert("RGBA"), layer).convert("RGB"), (0, 0))


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    tiles = {
        # Quran memorisation — the open book under the wreath arcs.
        "quran-memorisation": lambda: (lambda im: (book(im, MINT), arcs(im, TEAL), im)[-1])(base(DEEP, INK)),
        # Orphan sponsorship — the cupped hands of the emblem.
        "orphan-sponsorship": lambda: (lambda im: (hands(im, GOLD), dots(im, MINT, alpha=40), im)[-1])(base(INK, DEEP)),
        # Nursery — soft repeating forms, the lightest tile of the six.
        "nursery": lambda: (lambda im: (dots(im, DEEP, step=70, r=9, alpha=70), arcs(im, GOLD, alpha=55), im)[-1])(base(MINT, PAPER)),
        # Workshop — crossing threads.
        "workshop": lambda: (lambda im: (weave(im, GOLD), im)[-1])(base(DEEP, INK)),
        # Service projects — rays spreading outward.
        "service-projects": lambda: (lambda im: (rays(im, MINT), dots(im, TEAL, alpha=35), im)[-1])(base(INK, DEEP)),
        # Microlending — measured, repeating increments.
        "microlending": lambda: (lambda im: (weave(im, TEAL, alpha=40, step=110), arcs(im, GOLD, n=5, alpha=60), im)[-1])(base(DEEP, INK)),
    }

    for name, make in tiles.items():
        im = make()
        p = OUT / f"{name}.png"
        im.save(p, optimize=True)
        print("  %-22s %s  %d KB" % (name, im.size, p.stat().st_size // 1024))
    print("done -> %s" % OUT.relative_to(ROOT))


if __name__ == "__main__":
    main()
