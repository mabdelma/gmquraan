/* eslint-disable @next/next/no-img-element */

/**
 * Theme-aware brand mark.
 * Renders both the light and dark logo; CSS in globals.css shows exactly one
 * based on the active theme (system preference or the manual data-theme
 * toggle). Doing it in CSS — rather than JS — means it swaps instantly with the
 * theme and never flashes the wrong colour on load.
 *
 * The artwork is the association's emblem: the wreath, the open book and the
 * cupped hands over the registration ribbon. It is an upright badge rather
 * than a horizontal lockup, so `RATIO` is narrower than 1 — it is the real
 * width:height of the knocked-out artwork produced by
 * `scripts/build-brand-assets.py`, which is where both files come from.
 *
 * The pair is not one file reused. The association published the emblem twice,
 * once on its cream ground and once on black, and the dark version carries
 * slightly brighter edge colour drawn for a dark backing. Each theme therefore
 * gets artwork actually made for it rather than one image recoloured.
 */
const RATIO = 287 / 327;

export function BrandLogo({
  h = 28,
  className = "",
  alt = "جمعية المحافظة على القرآن الكريم",
}: {
  h?: number;
  className?: string;
  alt?: string;
}) {
  const w = Math.round(h * RATIO);
  return (
    <>
      <img
        src="/logo-light.png?v=4"
        alt={alt}
        width={w}
        height={h}
        className={`brand-logo-light ${className}`}
      />
      <img
        src="/logo-dark.png?v=4"
        alt=""
        aria-hidden="true"
        width={w}
        height={h}
        className={`brand-logo-dark ${className}`}
      />
    </>
  );
}
