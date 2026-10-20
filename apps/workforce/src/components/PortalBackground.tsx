"use client";

import { EcosystemBackground } from "./EcosystemBackground";

/**
 * The same background the public site uses, at its calm setting.
 *
 * The site dims this on /central, /dashboard and /partner because a moving
 * canvas behind a table of numbers is tiring to read. The whole portal is that
 * kind of surface, so it is calm everywhere rather than context-aware — there
 * is no marketing page here to be vivid on.
 */
export function PortalBackground() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.5,
          background:
            "radial-gradient(1100px 520px at 12% -6%, color-mix(in srgb, var(--accent) 20%, transparent), transparent 60%)," +
            "radial-gradient(1000px 560px at 96% 4%, color-mix(in srgb, var(--accent2) 22%, transparent), transparent 62%)," +
            "radial-gradient(1000px 760px at 50% 118%, color-mix(in srgb, var(--accent2) 13%, transparent), transparent 60%)",
        }}
      />
      <EcosystemBackground calm />
    </div>
  );
}
