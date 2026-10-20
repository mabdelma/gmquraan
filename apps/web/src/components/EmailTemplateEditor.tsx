"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUpload } from "@/components/ImageUpload";
import type { EmailTemplatesMessages } from "@/lib/email-templates-i18n";
import type { EmailTemplateOverride } from "@/lib/settings";

const input = "w-full rounded-xl bg-[color:var(--surface)] border border-[color:var(--hairline)] px-3 py-2 text-sm outline-none focus:border-[color:var(--accent-text)]/60";

type Default = { subject: string; title: string; body: string; btn: string };
export type EditorItem = { key: string; name: string; def: Default; override: EmailTemplateOverride };

export function EmailTemplateEditor({ items, t }: { items: EditorItem[]; t: EmailTemplatesMessages }) {
  return (
    <div className="space-y-4">
      {items.map((it) => (
        <TemplateCard key={it.key} item={it} t={t} />
      ))}
    </div>
  );
}

function TemplateCard({ item, t }: { item: EditorItem; t: EmailTemplatesMessages }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const o = item.override;
  const customised = !!(o.subject || o.title || o.body || o.btn || o.image);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setDone(false);
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/central/settings/templates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        template: item.key,
        subject: f.get("subject"),
        title: f.get("title"),
        body: f.get("body"),
        btn: f.get("btn"),
        image: f.get("image"),
      }),
    });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      router.refresh();
    }
  }

  return (
    <details className="panel rounded-2xl p-5" open={customised}>
      <summary className="cursor-pointer flex items-center gap-3 font-semibold">
        {item.name}
        {customised && (
          <span className="text-[11px] px-2 py-0.5 rounded-full border border-[color:var(--accent-text)]/30 text-[color:var(--accent-text)]">●</span>
        )}
        <span className="text-xs text-[color:var(--ink)]/55 font-mono ml-auto">{item.key}</span>
      </summary>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div>
          <label className="text-xs text-[color:var(--ink)]/50">{t.subject}</label>
          <input name="subject" defaultValue={o.subject ?? ""} placeholder={item.def.subject} className={input} />
        </div>
        <div>
          <label className="text-xs text-[color:var(--ink)]/50">{t.heading}</label>
          <input name="title" defaultValue={o.title ?? ""} placeholder={item.def.title} className={input} />
        </div>
        <div>
          <label className="text-xs text-[color:var(--ink)]/50">{t.body}</label>
          <textarea name="body" rows={3} defaultValue={o.body ?? ""} placeholder={item.def.body} className={input} />
        </div>
        <div>
          <label className="text-xs text-[color:var(--ink)]/50">{t.button}</label>
          <input name="btn" defaultValue={o.btn ?? ""} placeholder={item.def.btn} className={input} />
        </div>
        <ImageUpload name="image" initial={o.image ?? ""} label={t.image} />

        <div className="flex items-center gap-3">
          <button disabled={busy} className="app-gradient text-[color:var(--on-accent)] font-bold rounded-lg px-4 py-2 text-sm disabled:opacity-40">
            {busy ? t.saving : t.save}
          </button>
          <span className="text-xs text-[color:var(--ink)]/35">{t.blankHint}</span>
          {done && <span className="text-emerald-300 text-sm">{t.saved}</span>}
        </div>
      </form>
    </details>
  );
}
