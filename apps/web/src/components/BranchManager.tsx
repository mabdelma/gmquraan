"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BranchRow } from "@/lib/branches";
import { COMPANY } from "@/lib/content";

const input =
  "bg-[color:var(--bg)] border [border-color:var(--hairline)] [color:var(--ink)] rounded-lg px-3 py-2 text-sm w-full";
const btn = "border border-black/20 rounded-lg px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-50";
const primary = "app-gradient text-[color:var(--on-accent)] font-bold px-5 py-2.5 rounded-xl text-sm disabled:opacity-50";
const danger = "border border-red-500/40 text-red-700 rounded-lg px-3 py-1.5 text-sm hover:bg-red-500/10 disabled:opacity-50";

type Draft = Omit<BranchRow, "id" | "position">;

const emptyDraft = (): Draft => ({
  slug: "",
  published: true,
  country: "",
  flag: "",
  legalName: "",
  legalForm: "",
  registrationLabel: "",
  registrationNo: "",
  taxLabel: "",
  taxNo: "",
  authority: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  region: "",
  postalCode: "",
  countryName: "",
  phone: "",
  email: ""
});

const toDraft = (r: BranchRow): Draft => ({
  slug: r.slug,
  published: r.published,
  country: r.country,
  flag: r.flag ?? "",
  legalName: r.legalName,
  legalForm: r.legalForm ?? "",
  registrationLabel: r.registrationLabel ?? "",
  registrationNo: r.registrationNo ?? "",
  taxLabel: r.taxLabel ?? "",
  taxNo: r.taxNo ?? "",
  authority: r.authority ?? "",
  addressLine1: r.addressLine1,
  addressLine2: r.addressLine2 ?? "",
  city: r.city,
  region: r.region ?? "",
  postalCode: r.postalCode ?? "",
  countryName: r.countryName,
  phone: r.phone ?? "",
  email: r.email ?? ""
});

const line = (b: { addressLine1: string; addressLine2: string | null; city: string; region: string | null; postalCode: string | null; countryName: string }) =>
  [b.addressLine1, b.addressLine2, b.postalCode ? `${b.postalCode} ${b.city}` : b.city, b.region, b.countryName]
    .filter(Boolean)
    .join(", ");

export function BranchManager({ branches, usage }: { branches: BranchRow[]; usage: Record<string, string[]> }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  async function call(method: string, url: string, body?: unknown) {
    setBusy(true);
    setMsg(null);
    const res = await fetch(url, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
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
    const r = await call("POST", "/api/central/branches/seed");
    if (r) setMsg(`Imported ${r.created} branch(es); ${r.skipped} already present.`);
  }

  async function save() {
    if (!draft) return;
    const ok = editing
      ? await call("PATCH", `/api/central/branches/${editing}`, draft)
      : await call("POST", "/api/central/branches", draft);
    if (ok) {
      setEditing(null);
      setAdding(false);
      setDraft(null);
      setMsg("Saved. Cards using this branch now show the updated address.");
    }
  }

  async function remove(row: BranchRow) {
    if (!confirm(`Delete the ${row.country} branch (${row.legalName})?`)) return;
    if (await call("DELETE", `/api/central/branches/${row.id}`)) setMsg("Branch deleted.");
  }

  async function move(i: number, dir: -1 | 1) {
    const next = [...branches];
    const t = i + dir;
    if (t < 0 || t >= next.length) return;
    [next[i], next[t]] = [next[t], next[i]];
    if (await call("POST", "/api/central/branches/reorder", { ids: next.map((r) => r.id) })) {
      setMsg("Order updated.");
    }
  }

  const field = (d: Draft, key: keyof Draft, label: string, placeholder = "") => (
    <label className="block">
      <span className="text-xs [color:var(--muted)]">{label}</span>
      <input
        className={input}
        placeholder={placeholder}
        value={(d[key] as string) ?? ""}
        onChange={(e) => setDraft({ ...d, [key]: e.target.value })}
      />
    </label>
  );

  const form = (d: Draft) => (
    <div className="mt-4 border-t border-black/10 pt-4">
      <div className="grid gap-3 md:grid-cols-3">
        {field(d, "country", "Branch name", "Spain")}
        {field(d, "flag", "Flag emoji (optional)", "🇪🇸")}
        {field(d, "slug", "Slug (blank derives it)", "spain")}
      </div>

      <h4 className="text-xs font-semibold [color:var(--muted)] mt-5">Legal entity</h4>
      <div className="grid gap-3 md:grid-cols-2 mt-2">
        {field(d, "legalName", "Legal name", COMPANY.name)}
        {field(d, "legalForm", "Legal form (optional)", "Sociedad Limitada")}
        {field(d, "registrationLabel", "Registration label", "CIF / Licence / Corporation No.")}
        {field(d, "registrationNo", "Registration number", "B88990122")}
        {field(d, "taxLabel", "Tax label (optional)", "Business No.")}
        {field(d, "taxNo", "Tax number (optional)", "000000000")}
        <div className="md:col-span-2">{field(d, "authority", "Registering authority (optional)", "Corporations Canada")}</div>
      </div>

      <h4 className="text-xs font-semibold [color:var(--muted)] mt-5">
        Contact address <span className="font-normal [color:var(--muted)]">— appears on every card assigned to this branch</span>
      </h4>
      <div className="grid gap-3 md:grid-cols-2 mt-2">
        {field(d, "addressLine1", "Address line 1", "Calle Atlántico 28")}
        {field(d, "addressLine2", "Address line 2 (optional)")}
        {field(d, "city", "City", "Tudela de Duero")}
        {field(d, "region", "Region / province (optional)", "Example Town")}
        {field(d, "postalCode", "Postal code (optional)", "47320")}
        {field(d, "countryName", "Country", "Spain")}
        {field(d, "phone", "Phone (optional)", "+1 555 555 0107")}
        {field(d, "email", "Email (optional)", "info@gmquran.com")}
      </div>

      <label className="flex items-center gap-2 mt-4">
        <input type="checkbox" checked={d.published} onChange={(e) => setDraft({ ...d, published: e.target.checked })} />
        <span className="text-sm">Published (unticked hides it from cards)</span>
      </label>

      <div className="flex gap-2 mt-4">
        <button className={primary} onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          className={btn}
          onClick={() => {
            setEditing(null);
            setAdding(false);
            setDraft(null);
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
          className={`rounded-xl px-4 py-3 text-sm mb-6 border ${
            err ? "border-red-500/40 bg-red-500/10 text-red-800" : "border-sky-500/40 bg-sky-500/10 text-sky-900"
          }`}
        >
          {msg}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          className={primary}
          onClick={() => {
            setAdding(true);
            setEditing(null);
            setDraft(emptyDraft());
          }}
        >
          Add branch
        </button>
        <button className={btn} onClick={seed} disabled={busy}>
          Import the entities from the site
        </button>
      </div>

      {branches.length === 0 && !adding && (
        <p className="[color:var(--muted)] text-sm mt-6">
          No branches stored yet — cards are using the built-in Spain / UAE / Canada entities. Use{" "}
          <strong>Import the entities from the site</strong> to pull them in and start editing.
        </p>
      )}

      {adding && draft && (
        <div className="panel rounded-2xl p-5 mt-6">
          <h3 className="font-bold">New branch</h3>
          {form(draft)}
        </div>
      )}

      <div className="grid gap-3 mt-6">
        {branches.map((row, i) => {
          const people = usage[row.slug] ?? [];
          return (
            <div key={row.id} className="panel rounded-xl p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="font-semibold text-sm">
                    {row.flag} {row.country} — {row.legalName}
                    {!row.published && <span className="ml-2 text-xs text-amber-700">· hidden</span>}
                  </div>
                  <div className="text-xs [color:var(--muted)] mt-1">{line(row)}</div>
                  <div className="text-xs [color:var(--muted)] mt-1">
                    {row.registrationLabel && row.registrationNo
                      ? `${row.registrationLabel} ${row.registrationNo}`
                      : "no registration number"}
                    {people.length ? ` · on ${people.length} card(s): ${people.join(", ")}` : " · not used by anyone yet"}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button className={btn} onClick={() => move(i, -1)} disabled={busy || i === 0}>
                    ↑
                  </button>
                  <button className={btn} onClick={() => move(i, 1)} disabled={busy || i === branches.length - 1}>
                    ↓
                  </button>
                  <button
                    className={btn}
                    onClick={() => {
                      const open = editing === row.id;
                      setEditing(open ? null : row.id);
                      setDraft(open ? null : toDraft(row));
                      setAdding(false);
                    }}
                  >
                    {editing === row.id ? "Cancel" : "Edit"}
                  </button>
                  <button className={danger} onClick={() => remove(row)} disabled={busy}>
                    Delete
                  </button>
                </div>
              </div>
              {editing === row.id && draft && form(draft)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
