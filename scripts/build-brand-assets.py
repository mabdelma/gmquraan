#!/usr/bin/env python3
"""
Derive the web app's logo and icon set from the association's emblem.

Source material (both recovered from the live site's media library):
  img/assoc/emblem.jpg       the emblem on its cream paper ground  (#F8F7F3)
  img/assoc/emblem-dark.jpg  the same emblem on black

The association published both variants, so each theme gets artwork that was
actually drawn for it rather than one file recoloured. Each is knocked out to
transparency by flood-filling the uniform ground inwards from the border: a
plain colour-distance threshold would also punch holes in the pale highlights
inside the book and the wreath, whereas a fill that can only travel from the
edge leaves enclosed light areas intact.

Run:  python scripts/build-brand-assets.py
"""
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUB = ROOT / "apps/web/public"
SRC = PUB / "img/assoc"

# How far a pixel may sit from the corner colour and still count as background.
TOLERANCE = 38
# Feather width, in px, applied to the cut edge so it does not read as jagged.
FEATHER = 1.2


def knockout(path: Path) -> Image.Image:
    """Return the artwork with its uniform outer ground made transparent."""
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    px = im.load()

    # The ground colour is whatever occupies the corners.
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    bg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))

    def is_bg(p):
        return abs(p[0] - bg[0]) + abs(p[1] - bg[1]) + abs(p[2] - bg[2]) <= TOLERANCE * 3

    # Flood fill inward from every border pixel. Travelling only from the edge
    # is what protects the pale areas enclosed by the artwork.
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_bg(px[x, y]) and not seen[y * w + x]:
                seen[y * w + x] = 1
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_bg(px[x, y]) and not seen[y * w + x]:
                seen[y * w + x] = 1
                q.append((x, y))

    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and is_bg(px[nx, ny]):
                seen[ny * w + nx] = 1
                q.append((nx, ny))

    mask = Image.new("L", (w, h), 255)
    mp = mask.load()
    for y in range(h):
        row = y * w
        for x in range(w):
            if seen[row + x]:
                mp[x, y] = 0

    from PIL import ImageFilter
    mask = mask.filter(ImageFilter.GaussianBlur(FEATHER))
    im.putalpha(mask)
    return im.crop(im.getbbox() or (0, 0, w, h))


def save(im: Image.Image, name: str, size: int | None = None, bg=None):
    out = im
    if size:
        out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        fit = im.copy()
        fit.thumbnail((size, size), Image.LANCZOS)
        out.paste(fit, ((size - fit.width) // 2, (size - fit.height) // 2), fit)
    if bg:
        flat = Image.new("RGBA", out.size, bg)
        flat.alpha_composite(out)
        out = flat
    out.save(PUB / name)
    print("  %-26s %s" % (name, out.size))


def main():
    print("knocking out backgrounds")
    light = knockout(SRC / "emblem.jpg")        # for light theme
    dark = knockout(SRC / "emblem-dark.jpg")    # for dark theme
    print("  light artwork %s, dark artwork %s" % (light.size, dark.size))

    print("writing logo files")
    save(light, "logo-light.png")
    save(dark, "logo-dark.png")
    save(light, "logo.png")
    save(light, "logo-mark.png", 512)

    print("writing icons")
    # Maskable and apple-touch icons must be opaque: a transparent PNG renders
    # black on iOS and gets an arbitrary ground in an Android mask.
    save(light, "icon-192.png", 192)
    save(light, "icon-512.png", 512)
    save(light, "icon-maskable-512.png", 512, bg=(248, 247, 243, 255))
    save(light, "apple-touch-icon.png", 180, bg=(248, 247, 243, 255))
    save(light, "favicon-light-32.png", 32)
    save(light, "favicon-light-192.png", 192)
    save(dark, "favicon-dark-32.png", 32)
    save(dark, "favicon-dark-192.png", 192)
    print("done")


if __name__ == "__main__":
    main()
