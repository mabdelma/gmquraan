"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Quote = {
  id: string; title: string; note: string | null; amountCents: number | null; currency: string; status: string;
  createdAt: string; client: { email: string; name: string | null }; solution: { title: string; slug: string } | null;
};

const input = "rounded-lg bg-[color:var(--surface)] border border-[color:var(--hairline)] px-3 py-2 text-sm";
const STATUS: Record<string, string> = { REQUESTED: "text-[color:var(--accent-text)]", SENT: "text-[color:var(--accent-text)]", ACCEPTED: "text-emerald-300", DECLINED: "text-[color:var(--ink)]/50" };

export function QuoteManager({ initial }: { initial: Quote[] }) {
  const router = useRouter();
  const [quotes] = useState(initial);
  const [draft, setDraft] = useState<Record<string, { amount: string; note: string }>>({});
  const [busy, setBusy] = useState("");

  function d(q: Quote) {
    return draft[q.id] ?? { amount: q.amountCents != null ? String(q.amountCents / 100) : "", note: q.note ?? "" };
  }
  function set(id: string, patch: Partial<{ amount: string; note: string }>) {
    setDraft((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { amount: "", note: "" }), ...patch } }));
  }

  async function send(q: Quote, status: string) {
    setBusy(q.id);
    const cur = d(q);
    await fetch(`/api/central/quotes/${q.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amountCents: cur.amount ? Math.round(Number(cur.amount) * 100) : null, note: cur.note, status }),
    });
    setBusy("");
    router.refresh();
  }

  if (quotes.length === 0) return <p className="text-[color:var(--ink)]/55 text-sm panel rounded-2xl p-8 text-center">No quote requests yet.</p>;

  return (
    <div className="space-y-3">
      {quotes.map((q) => (
        <div key={q.id} className="panel rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="font-medium">{q.title}</div>
              <div className="text-xs text-[color:var(--ink)]/55">{q.client.email}{q.solution ? ` · ${q.solution.title}` : ""}</div>
            </div>
            <span className={`text-xs font-semibold ${STATUS[q.status] || "text-[color:var(--ink)]/60"}`}>{q.status}</span>
          </div>
          {q.note && <p className="text-[color:var(--ink)]/60 text-sm mt-2">{q.note}</p>}
          {(q.status === "REQUESTED" || q.status === "SENT") && (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <div>
                <label className="text-xs text-[color:var(--ink)]/50 block">Amount (€)</label>
                <input value={d(q).amount} onChange={(e) => set(q.id, { amount: e.target.value })} inputMode="decimal" placeholder="1500" className={`${input} w-28`} />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-[color:var(--ink)]/50 block">Note to client</label>
                <input value={d(q).note} onChange={(e) => set(q.id, { note: e.target.value })} className={`${input} w-full`} />
              </div>
              <button onClick={() => send(q, "SENT")} disabled={busy === q.id} className="app-gradient text-[color:var(--on-accent)] font-bold rounded-lg px-4 py-2 text-sm disabled:opacity-40">
                {busy === q.id ? "…" : "Send quote"}
              </button>
              <button onClick={() => send(q, "DECLINED")} disabled={busy === q.id} className="border border-red-500/40 text-red-300 rounded-lg px-3 py-2 text-sm hover:bg-red-500/10">
                Decline
              </button>
            </div>
          )}
          {q.amountCents != null && q.status !== "REQUESTED" && (
            <div className="text-sm mt-2 text-[color:var(--ink)]/70">Quoted: <span className="font-semibold">{q.currency} {(q.amountCents / 100).toFixed(0)}</span></div>
          )}
        </div>
      ))}
    </div>
  );
}
