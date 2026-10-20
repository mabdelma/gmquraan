"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LOCALES } from "@/lib/i18n";
import {
  SITE_SECTIONS,
  SECTION_LABEL,
  SECTION_FIELDS,
  SECTION_META,
  type SiteSection,
  type SiteCardRow,
} from "@/lib/site-cards";

const input =
  "bg-[color:var(--bg)] border [border-color:var(--hairline)] [color:var(--ink)] rounded-lg px-3 py-2 text-sm w-full";
const btn = "border border-black/20 rounded-lg px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-50";
const primary = "app-gradient text-[color:var(--on-accent)] font-bold px-5 py-2.5 rounded-xl text-sm disabled:opacity-50";

type Draft = {
  slug: string;
  published: boolean;
  copy: Record<string, Record<string, string>>;
  meta: Record<string, string>;
};

const emptyDraft = (): Draft => ({ slug: "", published: true, copy: {}, meta: {} });

const toDraft = (r: SiteCardRow): Draft => ({
  slug: r.slug,
  published: r.published,
  copy: JSON.parse(JSON.stringify(r.copy ?? {})),
  meta: { ...(r.meta ?? {}) },
});

export function SiteContentManager({ cards }: { cards: Record<SiteSection, SiteCardRow[]> }) {
  const router = useRouter();
  const [section, setSection] = useState<SiteSection>("services");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [adding, setAdding] = useState(false);
  // Which locale tab each card form is showing. English is the source of truth.
  const [loc, setLoc] = useState<string>("en");

  const rows = cards[section] ?? [];

  async function call(method: string, url: string, body?: unknown) {
    setBusy(true);
    setMsg(null);
    const res = await fetch(url, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !json.success) {
      setErr(true);
      setMsg(json.error || "Action failed");
      return null;
    }
    setErr(false);
    router.refresh();
    return json as Record<string, unknown>;
  }

  async function seed() {
    const r = await call("POST", "/api/central/site-cards/seed", { section });
    if (r) setMsg(`Imported ${r.created} card(s); ${r.skipped} already present.`);
  }

  async function save() {
    if (!draft) return;
    const payload = { ...draft, section };
    const ok = editing
      ? await call("PATCH", `/api/central/site-cards/${editing}`, payload)
      : await call("POST", "/api/central/site-cards", payload);
    if (ok) {
      setEditing(null);
      setDraft(null);
      setAdding(false);
      setMsg("Saved.");
    }
  }

  async function remove(row: SiteCardRow) {
    if (!confirm(`Delete "${row.slug}" from ${SECTION_LABEL[section]}?`)) return;
    if (await call("DELETE", `/api/central/site-cards/${row.id}`)) setMsg("Deleted.");
  }

  async function move(index: number, dir: -1 | 1) {
    const next = [...rows];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    if (await call("POST", "/api/central/site-cards/reorder", { section, ids: next.map((r) => r.id) })) {
      setMsg("Order updated.");
    }
  }

  const setCopy = (field: string, value: string) => {
    if (!draft) return;
    const copy = { ...draft.copy, [loc]: { ...(draft.copy[loc] ?? {}), [field]: value } };
    if (!value) delete copy[loc][field];
    setDraft({ ...draft, copy });
  };

  const form = (d: Draft) => (
    <div className="mt-4 border-t border-black/10 pt-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-xs [color:var(--muted)]">Slug (stable key — changing it is safe)</span>
          <input className={input} value={d.slug} onChange={(e) => setDraft({ ...d, slug: e.target.value })} />
        </label>
        <label className="flex items-center gap-2 mt-5">
          <input
            type="checkbox"
            checked={d.published}
            onChange={(e) => setDraft({ ...d, published: e.target.checked })}
          />
          <span className="text-sm">Published (unticked hides it from the site)</span>
        </label>
        {SECTION_META[section].map((m) => (
          <label key={m.key} className="block md:col-span-2">
            <span className="text-xs [color:var(--muted)]">{m.label}</span>
            <input
              className={input}
              value={d.meta[m.key] ?? ""}
              onChange={(e) => setDraft({ ...d, meta: { ...d.meta, [m.key]: e.target.value } })}
            />
          </label>
        ))}
      </div>

      {/* Locale tabs */}
      <div className="flex gap-1 flex-wrap mt-5">
        {LOCALES.map((l) => {
          const filled = Object.keys(d.copy[l] ?? {}).length > 0;
          return (
            <button
              key={l}
              onClick={() => setLoc(l)}
              className={`px-2.5 py-1 rounded-lg text-xs border ${
                loc === l ? "border-sky-500 bg-sky-500/10 font-semibold" : "border-black/15"
              } ${filled ? "" : "[color:var(--muted)]"}`}
              title={filled ? "Has copy" : "Empty — falls back to a translation of the English text"}
            >
              {l.toUpperCase()}
              {filled ? " ●" : " ○"}
            </button>
          );
        })}
      </div>
      <p className="text-xs [color:var(--muted)] mt-2">
        {loc === "en"
          ? "English is required — every other locale falls back to it."
          : "Leave blank to machine-translate from English at render time."}
      </p>

      <div className="grid gap-3 mt-3">
        {SECTION_FIELDS[section].map((f) =>
          f.multiline ? (
            <label key={f.key} className="block">
              <span className="text-xs [color:var(--muted)]">{f.label}</span>
              <textarea
                className={`${input} min-h-24`}
                value={d.copy[loc]?.[f.key] ?? ""}
                onChange={(e) => setCopy(f.key, e.target.value)}
              />
            </label>
          ) : (
            <label key={f.key} className="block">
              <span className="text-xs [color:var(--muted)]">{f.label}</span>
              <input
                className={input}
                value={d.copy[loc]?.[f.key] ?? ""}
                onChange={(e) => setCopy(f.key, e.target.value)}
              />
            </label>
          )
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <button className={primary} onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          className={btn}
          onClick={() => {
            setEditing(null);
            setDraft(null);
            setAdding(false);
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div>
      {msg && (
        <div
          className={`rounded-xl px-4 py-3 text-sm mb-6 ${
            err
              ? "bg-red-500/10 text-red-700 border border-red-500/30"
              : "bg-sky-500/10 text-sky-800 border border-sky-500/30"
          }`}
        >
          {msg}
        </div>
      )}

      {/* Section tabs */}
      <div className="flex gap-2 flex-wrap">
        {SITE_SECTIONS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setSection(s);
              setEditing(null);
              setDraft(null);
              setAdding(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              section === s ? "border-sky-500 bg-sky-500/10 font-semibold" : "border-black/15"
            }`}
          >
            {SECTION_LABEL[s]}
            <span className="[color:var(--muted)] ml-1.5">{(cards[s] ?? []).length}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-2 mt-5 flex-wrap">
        <button
          className={primary}
          onClick={() => {
            setAdding(true);
            setEditing(null);
            setDraft(emptyDraft());
            setLoc("en");
          }}
        >
          Add card
        </button>
        <button className={btn} onClick={seed} disabled={busy}>
          Import current site content
        </button>
      </div>

      {rows.length === 0 && !adding && (
        <p className="[color:var(--muted)] text-sm mt-6">
          Nothing stored for {SECTION_LABEL[section]} yet — the site is showing its built-in defaults. Use{" "}
          <strong>Import current site content</strong> to pull those in and start editing.
        </p>
      )}

      {adding && draft && (
        <div className="panel rounded-2xl p-5 mt-6">
          <h3 className="font-bold">New {SECTION_LABEL[section]} card</h3>
          {form(draft)}
        </div>
      )}

      <div className="grid gap-3 mt-6">
        {rows.map((row, i) => (
          <div key={row.id} className="panel rounded-xl p-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="font-semibold text-sm">
                  {row.copy?.en?.title || row.copy?.en?.label || row.slug}
                  {!row.published && <span className="ml-2 text-xs text-amber-700">· hidden</span>}
                </div>
                <div className="text-xs [color:var(--muted)] mt-1 font-mono">{row.slug}</div>
                <div className="text-xs [color:var(--muted)] mt-1">
                  {LOCALES.filter((l) => Object.keys(row.copy?.[l] ?? {}).length).length}/{LOCALES.length} locales
                  written
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button className={btn} onClick={() => move(i, -1)} disabled={busy || i === 0}>
                  ↑
                </button>
                <button className={btn} onClick={() => move(i, 1)} disabled={busy || i === rows.length - 1}>
                  ↓
                </button>
                <button
                  className={btn}
                  onClick={() => {
                    const open = editing === row.id;
                    setEditing(open ? null : row.id);
                    setDraft(open ? null : toDraft(row));
                    setAdding(false);
                    setLoc("en");
                  }}
                >
                  {editing === row.id ? "Cancel" : "Edit"}
                </button>
                <button className={`${btn} text-red-700`} onClick={() => remove(row)} disabled={busy}>
                  Delete
                </button>
              </div>
            </div>
            {editing === row.id && draft && form(draft)}
          </div>
        ))}
      </div>
    </div>
  );
}
