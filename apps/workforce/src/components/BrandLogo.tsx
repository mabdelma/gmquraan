/* eslint-disable @next/next/no-img-element */

/**
 * Theme-aware brand mark.
 * Renders both the blue (light) and white (dark) logo; CSS in globals.css shows
 * exactly one based on the active theme (system preference or the manual
 * data-theme toggle). Doing it in CSS — rather than JS — means it swaps
 * instantly with the theme and never flashes the wrong colour on load.
 */
const RATIO = 176 / 122; // natural aspect of the GM mark

export function BrandLogo({
  h = 28,
  className = "",
  alt = "Unskinned",
}: {
  h?: number;
  className?: string;
  alt?: string;
}) {
  const w = Math.round(h * RATIO);
  return (
    <>
      <img
        src="/logo-light.png?v=3"
        alt={alt}
        width={w}
        height={h}
        className={`brand-logo-light ${className}`}
      />
      <img
        src="/logo-dark.png?v=3"
        alt=""
        aria-hidden="true"
        width={w}
        height={h}
        className={`brand-logo-dark ${className}`}
      />
    </>
  );
}
