"use client";

import { useEffect } from "react";

/**
 * Makes the app installable AND auto-updating:
 *  - registers the service worker and reloads when a new SW takes control;
 *  - polls /api/version (on load, on refocus, and periodically) and reloads when
 *    the deployed build id changes — so installed PWA / mobile-app sessions pick
 *    up every web deploy without a store resubmission.
 */
export function PWARegister() {
  useEffect(() => {
    let reloaded = false;
    const reload = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };

    if ("serviceWorker" in navigator) {
      // Only reload when a *new* SW replaces an existing one — not on the first
      // install (when there was no controller yet), which would reload needlessly.
      const hadController = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.register("/sw.js").catch(() => {});
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (hadController) reload();
      });
    }

    let current: string | null = null;
    const check = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { version } = await res.json();
        if (!version) return;
        if (current && version !== current) reload();
        else current = version;
      } catch {
        /* offline / transient — ignore */
      }
    };

    check(); // establish the baseline build id
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    const id = window.setInterval(check, 15 * 60 * 1000);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(id);
      if ("serviceWorker" in navigator) navigator.serviceWorker.removeEventListener("controllerchange", reload);
    };
  }, []);

  return null;
}
