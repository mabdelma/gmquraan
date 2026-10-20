"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUpload } from "@/components/ImageUpload";
import type { EmailSettings } from "@/lib/settings";

const input = "w-full rounded-xl bg-[color:var(--surface)] border border-[color:var(--hairline)] px-3 py-2 text-sm outline-none focus:border-[color:var(--accent-text)]/60";

type T = {
  title: string; subtitle: string; logo: string; brandName: string; fromName: string;
  footer: string; replyTo: string; save: string; saving: string; saved: string;
};

export function EmailBrandingForm({ initial, t }: { initial: EmailSettings; t: T }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setDone(false);
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/central/settings/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        logoUrl: f.get("logoUrl"),
        brandName: f.get("brandName"),
        fromName: f.get("fromName"),
        footer: f.get("footer"),
        replyTo: f.get("replyTo"),
      }),
    });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel rounded-2xl p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold">{t.title}</h2>
        <p className="text-[color:var(--ink)]/50 text-sm mt-1">{t.subtitle}</p>
      </div>

      <ImageUpload name="logoUrl" initial={initial.logoUrl} label={t.logo} />

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-[color:var(--ink)]/50">{t.brandName}</label>
          <input name="brandName" defaultValue={initial.brandName} className={input} />
        </div>
        <div>
          <label className="text-xs text-[color:var(--ink)]/50">{t.fromName}</label>
          <input name="fromName" defaultValue={initial.fromName} className={input} />
        </div>
      </div>

      <div>
        <label className="text-xs text-[color:var(--ink)]/50">{t.replyTo}</label>
        <input name="replyTo" type="email" defaultValue={initial.replyTo} placeholder="info@example.com" className={input} />
      </div>

      <div>
        <label className="text-xs text-[color:var(--ink)]/50">{t.footer}</label>
        <input name="footer" defaultValue={initial.footer} className={input} />
      </div>

      <div className="flex items-center gap-3">
        <button disabled={busy} className="app-gradient text-[color:var(--on-accent)] font-bold rounded-lg px-4 py-2 text-sm disabled:opacity-40">
          {busy ? t.saving : t.save}
        </button>
        {done && <span className="text-emerald-300 text-sm">{t.saved}</span>}
      </div>
    </form>
  );
}
