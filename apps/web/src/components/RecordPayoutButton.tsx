"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CentralWidgets } from "@/lib/central-widgets-i18n";

export function RecordPayoutButton({ resellerId, amount, t }: { resellerId: string; amount: number; t: CentralWidgets }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function record() {
    if (amount <= 0) return;
    const amt = `€${(amount / 100).toFixed(2)}`;
    if (!confirm(t.recordConfirm.replace("{amt}", amt))) return;
    setBusy(true);
    await fetch("/api/central/payouts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ resellerId, amount }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      onClick={record}
      disabled={busy || amount <= 0}
      className="text-xs app-gradient text-[color:var(--on-accent)] font-bold rounded-lg px-3 py-1.5 disabled:opacity-40"
    >
      {busy ? t.working : t.recordPayout}
    </button>
  );
}
