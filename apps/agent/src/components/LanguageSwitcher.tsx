"use client";

import { LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n";

/** Language dropdown — writes the apex-shared app_locale cookie so the choice
 *  carries across the whole web app (site, central, AI), then reloads. */
export function LanguageSwitcher({ current }: { current: Locale }) {
  function set(locale: string) {
    const host = typeof window !== "undefined" ? window.location.hostname : "";
    const domain = host.endsWith("example.com") ? "; domain=.example.com" : "";
    document.cookie = `app_locale=${locale}; path=/${domain}; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    window.location.reload();
  }
  return (
    <select
      value={current}
      onChange={(e) => set(e.target.value)}
      aria-label="Language"
      className="form-select form-select-sm lang-select"
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>
          {LOCALE_NAMES[l]}
        </option>
      ))}
    </select>
  );
}
