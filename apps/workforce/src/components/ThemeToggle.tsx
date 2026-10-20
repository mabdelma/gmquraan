"use client";

import { useEffect, useState } from "react";

/**
 * Light/dark theme toggle.
 * - First visit follows the OS setting (prefers-color-scheme), handled in CSS.
 * - A manual choice is stored in localStorage and reflected via <html data-theme>.
 * - The no-flash init script lives in app/layout.tsx (runs before paint).
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme");
      if (stored === "dark" || stored === "light") setTheme(stored);
      else setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* ignore */
    }
    document.documentElement.setAttribute("data-theme", next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle light or dark theme"
      title="Toggle light/dark theme"
      className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[color:var(--hairline)] text-[color:var(--ink)] hover:bg-[color:var(--overlay)] transition text-base leading-none"
    >
      <span aria-hidden>{theme === "dark" ? "☀️" : "🌙"}</span>
    </button>
  );
}
