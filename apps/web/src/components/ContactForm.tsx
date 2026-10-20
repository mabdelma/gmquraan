"use client";

import { useState } from "react";

type Status = "idle" | "sending" | "sent" | "error";

type T = {
  fName: string;
  fEmail: string;
  fCompany: string;
  fMsg: string;
  send: string;
  sending: string;
  thanks: string;
  thanksBody: string;
  error: string;
};

export function ContactForm({ t }: { t: T }) {
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("request failed");
      setStatus("sent");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="text-center py-10">
        <div className="text-3xl">✓</div>
        <h3 className="font-bold text-xl mt-3">{t.thanks}</h3>
        <p className="text-[color:var(--ink)]/60 mt-2">{t.thanksBody}</p>
      </div>
    );
  }

  const input =
    "w-full rounded-xl bg-[color:var(--surface)] border border-[color:var(--hairline)] px-4 py-3 text-sm outline-none focus:border-[color:var(--accent-text)]/60";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="text-xs text-[color:var(--ink)]/50">{t.fName} *</label>
        <input name="name" required className={input} />
      </div>
      <div>
        <label className="text-xs text-[color:var(--ink)]/50">{t.fEmail} *</label>
        <input name="email" type="email" required className={input} />
      </div>
      <div>
        <label className="text-xs text-[color:var(--ink)]/50">{t.fCompany}</label>
        <input name="company" className={input} />
      </div>
      <div>
        <label className="text-xs text-[color:var(--ink)]/50">{t.fMsg} *</label>
        <textarea name="message" required rows={4} className={input} />
      </div>
      <button
        type="submit"
        disabled={status === "sending"}
        className="app-gradient text-[color:var(--on-accent)] font-bold w-full py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
      >
        {status === "sending" ? t.sending : t.send}
      </button>
      {status === "error" && <p className="text-red-400 text-sm">{t.error}</p>}
    </form>
  );
}
