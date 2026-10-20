import { cookies, headers } from "next/headers";
import { LOCALES, type Locale } from "./i18n";

/** Resolve the locale from the shared apex cookie, falling back to Accept-Language.
 *  Server-only (uses next/headers) — kept separate so client components can import
 *  the rest of ./i18n without pulling next/headers into the client bundle. */
export async function getAgentLocale(): Promise<Locale> {
  const c = (await cookies()).get("app_locale")?.value;
  if (c && (LOCALES as readonly string[]).includes(c)) return c as Locale;
  const al = (await headers()).get("accept-language") || "";
  const first = al.split(",")[0]?.split("-")[0]?.toLowerCase();
  if (first && (LOCALES as readonly string[]).includes(first)) return first as Locale;
  return "en";
}
