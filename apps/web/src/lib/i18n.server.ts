import { DEFAULT_LOCALE, type Locale } from "./i18n";

/**
 * Current UI locale — pinned to Arabic.
 *
 * gmquran.com is an Arabic site, so this one serves Arabic to everyone. This is
 * the single place the rendered locale is decided, so pinning it here makes the
 * whole site Arabic regardless of the visitor's browser language or any
 * `app_locale` cookie left over from before the switcher was removed — nobody
 * is stranded on English. DEFAULT_LOCALE is "ar"; the cookie/header detection
 * that used to live here is intentionally gone along with the switcher.
 *
 * To offer a second public language again, return the detected locale here
 * instead of the constant and restore the switcher — the five-locale content
 * model behind it is still intact.
 */
export async function getLocale(): Promise<Locale> {
  return DEFAULT_LOCALE;
}
