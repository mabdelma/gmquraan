"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CentralContent } from "@/lib/central-content-i18n";

type Vacancy = {
  id: string; slug: string; title: string; summary: string; body: string;
  department: string | null; location: string; workMode: string; type: string; published: boolean;
};

const input = "w-full rounded-xl bg-[color:var(--surface)] border border-[color:var(--hairline)] px-3 py-2 text-sm outline-none focus:border-[color:var(--accent-text)]/60";

const WORK_KEYS = ["ON_SITE", "REMOTE", "HYBRID"] as const;
const TYPE_KEYS = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"] as const;

const workLabel = (t: CentralContent["m"], key: string) =>
  key === "REMOTE" ? t.workRemote : key === "HYBRID" ? t.workHybrid : t.workOnSite;
const typeLabel = (t: CentralContent["m"], key: string) =>
  key === "PART_TIME" ? t.typePart : key === "CONTRACT" ? t.typeContract : key === "INTERNSHIP" ? t.typeInternship : t.typeFull;

export function VacancyManager({ initial, t }: { initial: Vacancy[]; t: CentralContent["m"] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [form, setForm] = useState({ title: "", summary: "", body: "", department: "", location: "", workMode: "ON_SITE", type: "FULL_TIME", published: false });
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Vacancy | null>(null);

  async function refresh() {
    const r = await fetch("/api/central/vacancies");
    const j = await r.json().catch(() => ({}));
    if (j.vacancies) setItems(j.vacancies);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || busy) return;
    setBusy(true);
    const r = await fetch("/api/central/vacancies", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
    setBusy(false);
    if (r.ok) { setForm({ title: "", summary: "", body: "", department: "", location: "", workMode: "ON_SITE", type: "FULL_TIME", published: false }); await refresh(); router.refresh(); }
  }

  async function patch(id: string, data: Record<string, unknown>) {
    await fetch(`/api/central/vacancies/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
    await refresh(); router.refresh();
  }

  async function del(id: string) {
    if (!confirm(t.delConfirm)) return;
    await fetch(`/api/central/vacancies/${id}`, { method: "DELETE" });
    await refresh(); router.refresh();
  }

  function startEdit(v: Vacancy) {
    setEditId(v.id);
    setEdit({ ...v });
  }

  return (
    <div className="space-y-8">
      <form onSubmit={create} className="panel rounded-2xl p-6 space-y-3">
        <h2 className="text-lg font-bold">{t.new}</h2>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t.title} className={input} />
        <input value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder={t.summary} className={input} />
        <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder={t.department} className={input} />
        <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder={t.location} className={input} />
        <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder={t.body} rows={6} className={input} />
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-[color:var(--ink)]/70">{t.workMode}</span>
            <select value={form.workMode} onChange={(e) => setForm({ ...form, workMode: e.target.value })} className={input + " w-auto"}>
              {WORK_KEYS.map((k) => <option key={k} value={k}>{workLabel(t, k)}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-[color:var(--ink)]/70">{t.jobType}</span>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={input + " w-auto"}>
              {TYPE_KEYS.map((k) => <option key={k} value={k}>{typeLabel(t, k)}</option>)}
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
        {items.map((v) => (
          <div key={v.id} className="panel rounded-2xl p-4">
            {editId === v.id && edit ? (
              <div className="space-y-2">
                <input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} className={input} />
                <input value={edit.summary} onChange={(e) => setEdit({ ...edit, summary: e.target.value })} placeholder={t.summary} className={input} />
                <input value={edit.department ?? ""} onChange={(e) => setEdit({ ...edit, department: e.target.value })} placeholder={t.department} className={input} />
                <input value={edit.location} onChange={(e) => setEdit({ ...edit, location: e.target.value })} placeholder={t.location} className={input} />
                <textarea value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} rows={6} className={input} />
                <div className="flex items-center gap-2">
                  <select value={edit.workMode} onChange={(e) => setEdit({ ...edit, workMode: e.target.value })} className={input + " w-auto"}>
                    {WORK_KEYS.map((k) => <option key={k} value={k}>{workLabel(t, k)}</option>)}
                  </select>
                  <select value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })} className={input + " w-auto"}>
                    {TYPE_KEYS.map((k) => <option key={k} value={k}>{typeLabel(t, k)}</option>)}
                  </select>
                  <button onClick={async () => { await patch(v.id, { ...edit, department: edit.department || null }); setEditId(null); }} className="text-xs app-gradient text-[color:var(--on-accent)] font-bold rounded-lg px-3 py-1.5">{t.save}</button>
                  <button onClick={() => setEditId(null)} className="text-xs border border-[color:var(--hairline)] rounded-lg px-3 py-1.5">{t.cancel}</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-medium">{v.title}</div>
                  <div className="text-xs mt-0.5">
                    <span className={v.published ? "text-emerald-300" : "text-[color:var(--ink)]/50"}>{v.published ? t.live : t.draft}</span>
                    <span className="text-[color:var(--ink)]/30"> · {v.location} · /careers/{v.slug}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <a href={`/careers/${v.slug}`} target="_blank" rel="noreferrer" className="text-xs border border-[color:var(--hairline)] rounded-lg px-3 py-1.5 hover:bg-[color:var(--overlay)]">{t.view}</a>
                  <button onClick={() => startEdit(v)} className="text-xs border border-[color:var(--hairline)] rounded-lg px-3 py-1.5 hover:bg-[color:var(--overlay)]">{t.edit}</button>
                  <button onClick={() => patch(v.id, { published: !v.published })} className="text-xs border border-[color:var(--hairline)] rounded-lg px-3 py-1.5 hover:bg-[color:var(--overlay)]">{v.published ? t.unpublish : t.publish}</button>
                  <button onClick={() => del(v.id)} className="text-xs border border-red-500/40 text-red-300 rounded-lg px-3 py-1.5 hover:bg-red-500/10">{t.del}</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
