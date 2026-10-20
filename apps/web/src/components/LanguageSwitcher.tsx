import type { Locale } from "@/lib/i18n";

/**
 * Language switcher — intentionally empty.
 *
 * The site serves Arabic and only Arabic (the rendered locale is pinned in
 * i18n.server.ts), so there is nothing to switch between and no control is
 * shown. The component is kept, rather than deleted and unwired from its four
 * callers (the public nav, the dashboard shell, and the central nav and login),
 * so that re-enabling a second public language is a change in one file here plus
 * unpinning `getLocale` — not a hunt to restore a deleted control.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function LanguageSwitcher(_: { current: Locale }) {
  return null;
}
