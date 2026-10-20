// Language set: en, zh, es, fr, ar, pt, ru, de, ja, hi, it.
export const LOCALES = ["en", "zh", "es", "fr", "ar", "pt", "ru", "de", "ja", "hi", "it"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "app_locale";

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  zh: "中文",
  es: "Español",
  fr: "Français",
  ar: "العربية",
  pt: "Português",
  ru: "Русский",
  de: "Deutsch",
  ja: "日本語",
  hi: "हिन्दी",
  it: "Italiano",
};

// Right-to-left locales (Arabic only, as in the upstream platform).
export function dir(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function isLocale(v: string | undefined): v is Locale {
  return !!v && (LOCALES as readonly string[]).includes(v);
}
