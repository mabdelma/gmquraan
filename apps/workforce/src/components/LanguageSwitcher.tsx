"use client";

import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_NAMES, LOCALE_COOKIE, type Locale } from "@/lib/i18n";
import { getUi } from "@/lib/ui-i18n";

export function LanguageSwitcher({ current }: { current: Locale }) {
  const router = useRouter();

  function set(locale: string) {
    // Scope to the apex domain in production so subdomains (central, ai) inherit
    // the chosen language; host-only on localhost.
    const host = typeof window !== "undefined" ? window.location.hostname : "";
    const domain = host.endsWith("example.com") ? "; domain=.example.com" : "";
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/${domain}; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    router.refresh();
  }

  return (
    <select
      value={current}
      onChange={(e) => set(e.target.value)}
      aria-label={getUi(current).language}
      className="bg-transparent border border-[color:var(--hairline)] rounded-lg text-xs text-[color:var(--ink)]/70 px-2 py-1 outline-none hover:border-[color:var(--hairline)] cursor-pointer"
    >
      {LOCALES.map((l: Locale) => (
        <option key={l} value={l} className="bg-[color:var(--surface)] text-[color:var(--ink)]">
          {LOCALE_NAMES[l]}
        </option>
      ))}
    </select>
  );
}
