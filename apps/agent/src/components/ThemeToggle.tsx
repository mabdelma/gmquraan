"use client";

import { useEffect, useState } from "react";

/**
 * Light/dark toggle for the advisor.
 *
 * The advisor is on its own subdomain, so localStorage is a different store
 * from the site's — a choice made on example.com cannot be read
 * here. It therefore keeps its own, rather than pretending to inherit one.
 *
 * It sets two attributes. `data-theme` drives the Unskinned tokens; `data-bs-theme`
 * drives Bootstrap, which is bundled here and has its own idea of light and
 * dark. Setting only the first was the bug: the page went light while every
 * Bootstrap control stayed dark.
 */
export function ThemeToggle({ label }: { label?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

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
    document.documentElement.setAttribute("data-bs-theme", next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label || "Toggle light or dark theme"}
      title={label || "Toggle light or dark theme"}
      className="btn btn-sm d-inline-flex align-items-center justify-content-center"
      style={{
        width: "2.25rem",
        height: "2.25rem",
        borderColor: "var(--hairline)",
        color: "var(--ink)",
        lineHeight: 1,
      }}
    >
      <span aria-hidden>{theme === "dark" ? "☀️" : "🌙"}</span>
    </button>
  );
}
