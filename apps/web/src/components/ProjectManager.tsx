"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CentralContent } from "@/lib/central-content-i18n";

type Project = {
  id: string; slug: string; title: string; summary: string; body: string;
  sector: string | null; status: string; coverImage: string | null; published: boolean;
};

const input = "w-full rounded-xl bg-[color:var(--surface)] border border-[color:var(--hairline)] px-3 py-2 text-sm outline-none focus:border-[color:var(--accent-text)]/60";

const STATUS_KEYS = ["PLANNED", "ONGOING", "COMPLETED"] as const;
const statusLabel = (t: CentralContent["m"], key: string) =>
  key === "PLANNED" ? t.statusPlanned : key === "COMPLETED" ? t.statusCompleted : t.statusOngoing;

export function ProjectManager({ initial, t }: { initial: Project[]; t: CentralContent["m"] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [form, setForm] = useState({ title: "", summary: "", body: "", sector: "", status: "ONGOING", coverImage: "", published: false });
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Project | null>(null);

  async function refresh() {
    const r = await fetch("/api/central/projects");
    const j = await r.json().catch(() => ({}));
    if (j.projects) setItems(j.projects);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || busy) return;
    setBusy(true);
    const r = await fetch("/api/central/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
    setBusy(false);
    if (r.ok) { setForm({ title: "", summary: "", body: "", sector: "", status: "ONGOING", coverImage: "", published: false }); await refresh(); router.refresh(); }
  }

  async function patch(id: string, data: Record<string, unknown>) {
    await fetch(`/api/central/projects/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
    await refresh(); router.refresh();
  }

  async function del(id: string) {
    if (!confirm(t.delConfirm)) return;
    await fetch(`/api/central/projects/${id}`, { method: "DELETE" });
    await refresh(); router.refresh();
  }

  function startEdit(p: Project) {
    setEditId(p.id);
    setEdit({ ...p });
  }

  return (
    <div className="space-y-8">
      <form onSubmit={create} className="panel rounded-2xl p-6 space-y-3">
        <h2 className="text-lg font-bold">{t.new}</h2>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t.title} className={input} />
        <input value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder={t.summary} className={input} />
        <input value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} placeholder={t.sector} className={input} />
        <input value={form.coverImage} onChange={(e) => setForm({ ...form, coverImage: e.target.value })} placeholder={t.cover} className={input} />
        <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder={t.body} rows={6} className={input} />
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-[color:var(--ink)]/70">{t.status}</span>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={input + " w-auto"}>
              {STATUS_KEYS.map((k) => <option key={k} value={k}>{statusLabel(t, k)}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-[color:var(--ink)]/70 cursor-pointer">
            <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
            {t.publishNow}
          </label>
        </div>
        <button disabled={busy} className="app-gradient text-[color:var(--on-accent)] font-bold rounded-lg px-4 py-2 text-sm disabled:opacity-40">{t.create}</button>
      </form>

      <div className="space-y-3">
        {items.map((p) => (
          <div key={p.id} className="panel rounded-2xl p-4">
            {editId === p.id && edit ? (
              <div className="space-y-2">
                <input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} className={input} />
                <input value={edit.summary} onChange={(e) => setEdit({ ...edit, summary: e.target.value })} placeholder={t.summary} className={input} />
                <input value={edit.sector ?? ""} onChange={(e) => setEdit({ ...edit, sector: e.target.value })} placeholder={t.sector} className={input} />
                <input value={edit.coverImage ?? ""} onChange={(e) => setEdit({ ...edit, coverImage: e.target.value })} placeholder={t.cover} className={input} />
                <textarea value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} rows={6} className={input} />
                <div className="flex items-center gap-2">
                  <select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })} className={input + " w-auto"}>
                    {STATUS_KEYS.map((k) => <option key={k} value={k}>{statusLabel(t, k)}</option>)}
                  </select>
                  <button onClick={async () => { await patch(p.id, { ...edit, sector: edit.sector || null, coverImage: edit.coverImage || null }); setEditId(null); }} className="text-xs app-gradient text-[color:var(--on-accent)] font-bold rounded-lg px-3 py-1.5">{t.save}</button>
                  <button onClick={() => setEditId(null)} className="text-xs border border-[color:var(--hairline)] rounded-lg px-3 py-1.5">{t.cancel}</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs mt-0.5">
                    <span className={p.published ? "text-emerald-300" : "text-[color:var(--ink)]/50"}>{p.published ? t.live : t.draft}</span>
                    <span className="text-[color:var(--ink)]/30"> · {statusLabel(t, p.status)} · /projects/{p.slug}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <a href={`/projects/${p.slug}`} target="_blank" rel="noreferrer" className="text-xs border border-[color:var(--hairline)] rounded-lg px-3 py-1.5 hover:bg-[color:var(--overlay)]">{t.view}</a>
                  <button onClick={() => startEdit(p)} className="text-xs border border-[color:var(--hairline)] rounded-lg px-3 py-1.5 hover:bg-[color:var(--overlay)]">{t.edit}</button>
                  <button onClick={() => patch(p.id, { published: !p.published })} className="text-xs border border-[color:var(--hairline)] rounded-lg px-3 py-1.5 hover:bg-[color:var(--overlay)]">{p.published ? t.unpublish : t.publish}</button>
                  <button onClick={() => del(p.id)} className="text-xs border border-red-500/40 text-red-300 rounded-lg px-3 py-1.5 hover:bg-red-500/10">{t.del}</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
