"use client";

import { usePathname } from "next/navigation";
import { EcosystemBackground } from "./EcosystemBackground";

// The central console gets a calmer background for readability.
const APP_PREFIXES = ["/central"];

/**
 * Site-wide fixed background: the blue→purple brand glow + the interactive
 * ecosystem canvas, pinned behind every page and dashboard. `body` is
 * transparent (globals.css) so this shows through; `html` keeps the base colour.
 * Intensity is context-aware: vivid on marketing pages, calmer on app routes.
 */
export function GlobalBackground() {
  const pathname = usePathname() || "";
  const calm = APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: calm ? 0.5 : 1,
          background:
            "radial-gradient(1100px 520px at 12% -6%, color-mix(in srgb, var(--accent) 20%, transparent), transparent 60%)," +
            "radial-gradient(1000px 560px at 96% 4%, color-mix(in srgb, var(--accent2) 22%, transparent), transparent 62%)," +
            "radial-gradient(1000px 760px at 50% 118%, color-mix(in srgb, var(--accent2) 13%, transparent), transparent 60%)",
        }}
      />
      <EcosystemBackground calm={calm} />
    </div>
  );
}
