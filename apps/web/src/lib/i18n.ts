// Language set: English, Arabic, Spanish, Portuguese, French.
//
// Narrowed from eleven on 2026-08-15. The six dropped (zh, ru, de, ja, hi, it)
// were carried over from the previous product and were never going to be
// maintained. Arabic and English are the two the office actually works in;
// the other three are kept because the markets it works in read them. Every
// string in the five is translated — none falls back to English.
export const LOCALES = ["en", "ar", "es", "pt", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
// Arabic is the association's own language and the language of its site,
// so it is the default rather than a translation a visitor must opt into.
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
