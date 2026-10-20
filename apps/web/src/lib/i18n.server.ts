import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./i18n";

/**
 * Current UI locale. Prefers the cookie; on a first visit (no cookie yet) falls
 * back to the x-app-locale header set by the middleware (Accept-Language match).
 */
export async function getLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const fromHeader = (await headers()).get("x-app-locale") ?? undefined;
  return isLocale(fromHeader) ? fromHeader : DEFAULT_LOCALE;
}
