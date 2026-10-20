"use client";

import { useState } from "react";

export type PartnerApplyMessages = {
  name: string; email: string; company: string; website: string; message: string;
  submit: string; submitting: string; successTitle: string; successBody: string; error: string;
};

const input =
  "w-full rounded-xl bg-[color:var(--surface)] border border-[color:var(--hairline)] px-4 py-3 text-sm outline-none focus:border-[color:var(--accent-text)]/60";

export function PartnerApplyForm({ t }: { t: PartnerApplyMessages }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "sending") return;
    const f = new FormData(e.currentTarget);
    setState("sending");
    try {
      const res = await fetch("/api/v1/partners/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"), email: f.get("email"), company: f.get("company"),
          website: f.get("website"), message: f.get("message"), hp: f.get("hp"),
        }),
      });
      setState(res.ok && (await res.json()).success ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="panel rounded-2xl p-8 text-center mt-8">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-xl font-bold">{t.successTitle}</h2>
        <p className="text-[color:var(--ink)]/60 mt-2">{t.successBody}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="panel rounded-2xl p-6 mt-8 space-y-4">
      <input type="text" name="hp" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="grid gap-4 sm:grid-cols-2">
        <input name="name" required placeholder={t.name} className={input} />
        <input name="email" type="email" required placeholder={t.email} className={input} />
        <input name="company" placeholder={t.company} className={input} />
        <input name="website" placeholder={t.website} className={input} />
      </div>
      <textarea name="message" rows={4} placeholder={t.message} className={input} />
      {state === "error" && <p className="text-red-300 text-sm">{t.error}</p>}
      <button
        type="submit"
        disabled={state === "sending"}
        className="app-gradient text-[color:var(--on-accent)] font-bold px-6 py-3 rounded-xl disabled:opacity-50"
      >
        {state === "sending" ? t.submitting : t.submit}
      </button>
    </form>
  );
}
