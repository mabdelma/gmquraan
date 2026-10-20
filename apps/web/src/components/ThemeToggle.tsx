/**
 * Theme toggle — intentionally empty.
 *
 * The site is light-only: there is no dark theme to switch to, so no control is
 * shown. The component is kept, rather than deleted and unwired from its three
 * callers (the public nav, the dashboard shell and the central nav), so that
 * re-introducing a dark theme is a change here plus the CSS, not a hunt to
 * restore a deleted button.
 */
export function ThemeToggle() {
  return null;
}
