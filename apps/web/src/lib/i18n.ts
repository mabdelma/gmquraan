// The association's site at gmquran.com is Arabic, and only Arabic. This one
// renders Arabic to every visitor and shows no language switcher — see
// `getLocale` in i18n.server.ts, which pins the served locale to Arabic.
//
// LOCALES stays five wide on purpose. English is the structural *source* of the
// content model — the service catalogue is keyed by its English strings, the
// site-card editor requires English copy as the fallback every other locale
// builds on — and ar/es/pt/fr are translations layered over it. Narrowing this
// set would break that model and the admin console, not just hide a language.
// So the translations are kept in the data; the *public* locale is pinned to
// Arabic at the one place it is resolved, and the switcher is removed. A second
// public language can be re-enabled later by unpinning `getLocale` alone.
export const LOCALES = ["en", "ar", "es", "pt", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ar";
export const LOCALE_COOKIE = "app_locale";

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
  es: "Español",
  pt: "Português",
  fr: "Français",
};

// Right-to-left locales (Arabic only, as in the upstream platform).
export function dir(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function isLocale(v: string | undefined): v is Locale {
  return !!v && (LOCALES as readonly string[]).includes(v);
}
