"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Fires a lightweight page-view beacon on each route change. No cookies, no PII. */
export function Analytics() {
  const pathname = usePathname();
  useEffect(() => {
    const body = JSON.stringify({
      path: pathname,
      referrer: document.referrer || null,
      locale: document.documentElement.lang || null,
    });
    // sendBeacon survives navigation; fall back to fetch.
    if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    else fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true });
  }, [pathname]);
  return null;
}
