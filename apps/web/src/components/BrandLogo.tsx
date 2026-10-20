/* eslint-disable @next/next/no-img-element */

/**
 * Brand mark.
 *
 * The site is light-only, so only the light emblem is rendered — there is no
 * dark variant to swap to any more. The artwork is the association's emblem:
 * the wreath, the open book and the cupped hands over the registration ribbon.
 * It is an upright badge rather than a horizontal lockup, so `RATIO` is narrower
 * than 1 — it is the real width:height of the knocked-out artwork produced by
 * `scripts/build-brand-assets.py`.
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
    <img
      src="/logo-light.png?v=4"
      alt={alt}
      width={w}
      height={h}
      className={`brand-logo-light ${className}`}
    />
  );
}
