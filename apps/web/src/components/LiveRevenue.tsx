"use client";

import { useEffect, useState } from "react";
import type { CentralWidgets } from "@/lib/central-widgets-i18n";

type Snap = { mrr: number; total: number; today: number; activeSubscriptions: number; users: number };

const money = (cents: number) =>
  new Intl.NumberFormat("en", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(cents / 100);

export function LiveRevenue({ initial, t }: { initial: Snap; t: CentralWidgets }) {
  const [snap, setSnap] = useState<Snap>(initial);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    let active = true;
    let es: EventSource | undefined;
    let poll: ReturnType<typeof setInterval> | undefined;
    const apply = (data: Snap) => {
      if (!active) return;
      setSnap(data);
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    };

    if (typeof EventSource !== "undefined") {
      // Real-time: a single server-pushed stream (auto-reconnects on drop).
      es = new EventSource("/api/central/revenue/stream");
      es.addEventListener("revenue", (e) => {
        try {
          apply(JSON.parse((e as MessageEvent).data));
        } catch {
          /* ignore malformed frame */
        }
      });
    } else {
      // Fallback: poll the snapshot endpoint.
      const tick = async () => {
        try {
          const res = await fetch("/api/central/revenue/live", { cache: "no-store" });
          const json = await res.json();
          if (json.success) apply(json.data);
        } catch {
          /* ignore */
        }
      };
      poll = setInterval(tick, 8000);
    }

    return () => {
      active = false;
      es?.close();
      if (poll) clearInterval(poll);
    };
  }, []);

  const cell = (v: string, l: string) => (
    <div>
      <div className={`text-2xl font-extrabold transition-colors ${pulse ? "text-[color:var(--accent-text)]" : "app-gradient-text"}`}>{v}</div>
      <div className="text-[color:var(--ink)]/50 text-xs mt-1">{l}</div>
    </div>
  );

  return (
    <div className="panel rounded-2xl p-5 mt-6">
      <div className="flex items-center gap-2 text-xs text-emerald-400 mb-3">
        <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block animate-pulse" /> {t.live}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {cell(money(snap.mrr), t.mrr)}
        {cell(money(snap.total), t.total)}
        {cell(money(snap.today), t.today)}
        {cell(String(snap.activeSubscriptions), t.subs)}
        {cell(String(snap.users), t.users)}
      </div>
    </div>
  );
}
