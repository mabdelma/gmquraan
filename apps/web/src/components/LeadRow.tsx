"use client";

import { useState } from "react";
import type { LeadMessages } from "@/lib/lead-i18n";

const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"];

export function LeadRow({
  id,
  name,
  email,
  phone,
  company,
  message,
  notes,
  solutionTitle,
  status: initial,
  createdAt,
  t,
}: {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  message: string | null;
  notes?: string | null;
  solutionTitle?: string;
  status: string;
  createdAt?: string;
  t: LeadMessages;
}) {
  const [status, setStatus] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<null | "ok" | "err">(null);

  async function update(next: string) {
    setSaving(true);
    const prev = status;
    setStatus(next);
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) setStatus(prev);
    setSaving(false);
  }

  async function send() {
    const text = reply.trim();
    if (!text || sending) return;
    setSending(true);
    setResult(null);
    const res = await fetch(`/api/leads/${id}/reply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    setSending(false);
    if (res.ok) {
      setResult("ok");
      setReply("");
      if (status === "NEW") setStatus("CONTACTED");
    } else {
      setResult("err");
    }
  }

  return (
    <>
      <tr className="border-b border-[color:var(--hairline)]">
        <td className="py-3 pr-4">
          <div className="font-semibold">{name}</div>
          <div className="text-xs text-[color:var(--ink)]/55">{email}</div>
        </td>
        <td className="py-3 pr-4 text-[color:var(--ink)]/60 text-sm">{solutionTitle || "—"}</td>
        <td className="py-3 pr-4 text-[color:var(--ink)]/50 text-sm max-w-xs truncate">{message || "—"}</td>
        <td className="py-3">
          <div className="flex items-center gap-2">
            <select
              value={status}
              disabled={saving}
              onChange={(e) => update(e.target.value)}
              className="rounded-lg bg-[color:var(--surface)] border border-[color:var(--hairline)] px-2 py-1 text-xs"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s} className="bg-[color:var(--surface)]">{s}</option>
              ))}
            </select>
            <button
              onClick={() => setOpen((o) => !o)}
              className="text-xs border border-[color:var(--hairline)] rounded-lg px-2.5 py-1 hover:bg-[color:var(--overlay)]"
            >
              {open ? t.close : t.open}
            </button>
          </div>
        </td>
      </tr>

      {open && (
        <tr className="border-b border-[color:var(--hairline)] bg-black/[0.02]">
          <td colSpan={4} className="px-4 py-4">
            <div className="grid sm:grid-cols-3 gap-3 text-sm mb-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-[color:var(--ink)]/55">{t.phone}</div>
                <div className="text-[color:var(--ink)]/70">{phone || "—"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-[color:var(--ink)]/55">{t.company}</div>
                <div className="text-[color:var(--ink)]/70">{company || "—"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-[color:var(--ink)]/55">{t.received}</div>
                <div className="text-[color:var(--ink)]/70">{createdAt ? new Date(createdAt).toLocaleString() : "—"}</div>
              </div>
            </div>

            <div className="panel rounded-xl p-3 text-sm text-[color:var(--ink)]/80 whitespace-pre-line mb-4">
              {message || <span className="text-[color:var(--ink)]/55">{t.noMessage}</span>}
            </div>

            {notes && (
              <div className="rounded-xl border border-[color:var(--hairline)] bg-[color:var(--surface)] p-3 text-xs text-[color:var(--ink)]/55 whitespace-pre-line mb-4 max-h-48 overflow-y-auto">
                {notes}
              </div>
            )}

            <label className="text-xs uppercase tracking-widest text-[color:var(--ink)]/55">{t.reply}</label>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={4}
              placeholder={t.replyPlaceholder}
              className="w-full mt-1 rounded-xl bg-[color:var(--surface)] border border-[color:var(--hairline)] px-3 py-2 text-sm outline-none focus:border-[color:var(--accent-text)]/60"
            />
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={send}
                disabled={sending || !reply.trim()}
                className="app-gradient text-[color:var(--on-accent)] font-bold rounded-lg px-4 py-2 text-sm disabled:opacity-40"
              >
                {sending ? t.sending : t.send}
              </button>
              {result === "ok" && <span className="text-emerald-300 text-sm">{t.sent}</span>}
              {result === "err" && <span className="text-red-300 text-sm">{t.sendFailed}</span>}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
