"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Central-only: mark a solution as featured (promoted placement in the marketplace). */
export function FeaturedToggle({ id, featured, label }: { id: string; featured: boolean; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    await fetch(`/api/central/solutions/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ featured: !featured }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      title={label}
      className={`text-xs border rounded-lg px-2.5 py-1 disabled:opacity-50 transition ${
        featured ? "border-[color:var(--accent-text)]/50 text-[color:var(--accent-text)] bg-[color:var(--accent-text)]/10" : "border-[color:var(--hairline)] text-[color:var(--ink)]/60 hover:bg-[color:var(--overlay)]"
      }`}
    >
      {featured ? "★" : "☆"} {label}
    </button>
  );
}
