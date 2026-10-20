"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Off-canvas navigation for small screens.
 *
 * The panel is a sibling of the page rather than a transformed copy of the
 * desktop bar, which is what keeps it from overflowing horizontally: it is
 * pinned to both inset edges, so it cannot be wider than the viewport in
 * either direction. Direction itself is left to the document — the links use
 * logical alignment, so RTL falls out of dir="rtl" rather than a mirrored
 * stylesheet.
 */
export function MobileMenu({
  links,
  label,
  closeLabel,
}: {
  links: { href: string; label: string }[];
  label: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);

  // A menu that survives navigation would cover the page you just asked for.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        aria-expanded={open}
        className="inline-flex size-10 items-center justify-center rounded-lg border border-[color:var(--hairline)] md:hidden"
      >
        <span className="sr-only">{label}</span>
        <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden="true" fill="none">
          <path d="M0 1h18M0 7h18M0 13h18" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            aria-label={closeLabel}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60"
          />
          <div className="absolute inset-x-0 top-0 max-h-[85vh] overflow-y-auto border-b border-[color:var(--accent)]/30 bg-[#0c3433] p-5 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--accent)]">
                {label}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={closeLabel}
                className="inline-flex size-9 items-center justify-center rounded-lg border border-white/20"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </button>
            </div>
            <ul className="mt-5 space-y-1">
              {links.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-3 text-base hover:bg-white/5"
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
