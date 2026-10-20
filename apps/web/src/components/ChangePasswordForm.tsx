"use client";

import { useState } from "react";
import type { ChangePwLabels } from "@/lib/ui-i18n";

const input =
  "w-full rounded-xl bg-[color:var(--surface)] border border-[color:var(--hairline)] px-3 py-2 text-sm outline-none focus:border-[color:var(--accent-text)]/60";

const DEFAULT_T: ChangePwLabels = { current: "Current password", newPw: "New password (8+ characters)", update: "Update password", updated: "✓ Password updated", failed: "Failed" };

/** `endpoint` = /api/central/password (admin). */
export function ChangePasswordForm({ endpoint, t = DEFAULT_T }: { endpoint: string; t?: ChangePwLabels }) {
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("");
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    setErr(!json.success);
    setMsg(json.success ? t.updated : json.error || t.failed);
    if (json.success) form.reset();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input name="currentPassword" type="password" placeholder={t.current} aria-label={t.current} className={input} />
      <input name="newPassword" type="password" required placeholder={t.newPw} aria-label={t.newPw} className={input} />
      <button className="app-gradient text-[color:var(--on-accent)] font-bold px-4 py-2 rounded-xl text-sm">{t.update}</button>
      {msg && <p className={`text-xs ${err ? "text-red-400" : "text-emerald-400"}`}>{msg}</p>}
    </form>
  );
}