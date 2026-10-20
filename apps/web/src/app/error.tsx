"use client";

import { useEffect } from "react";
import { getErrorLabels } from "@/lib/ui-i18n";
import type { Locale } from "@/lib/i18n";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[web] unhandled error", error);
    // Self-hosted error monitoring — report to ops (throttled server-side).
    try {
      navigator.sendBeacon?.(
        "/api/internal/client-error",
        JSON.stringify({ message: error.message, stack: error.stack, url: typeof location !== "undefined" ? location.href : undefined })
      );
    } catch { /* ignore */ }
  }, [error]);

  const locale = ((typeof document !== "undefined" && document.cookie.match(/(?:^|; )app_locale=([^;]+)/)?.[1]) || "en") as Locale;
  const t = getErrorLabels(locale);

  return (
    <section className="mx-auto max-w-xl px-5 py-32 text-center">
      <h1 className="text-2xl font-bold">{t.title}</h1>
      <p className="text-[color:var(--ink)]/60 mt-2">{t.body}</p>
      <div className="flex items-center justify-center gap-3 mt-8">
        <button onClick={reset} className="app-gradient text-[color:var(--on-accent)] font-bold px-6 py-3 rounded-xl">
          {t.retry}
        </button>
        <a href="/" className="border border-[color:var(--hairline)] px-6 py-3 rounded-xl hover:bg-[color:var(--overlay)]">
          {t.home}
        </a>
      </div>
    </section>
  );
}
