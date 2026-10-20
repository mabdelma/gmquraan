"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ImageUpload } from "@/components/ImageUpload";
import { LOCALES } from "@/lib/i18n";
import { PHONE_SLOTS, phoneProblem } from "@/lib/central-people";
import {
  COUNTRIES_BY_NAME,
  countryLabel,
  splitPhone,
  joinPhone,
  splitLocation,
  joinLocation,
  flagOf,
} from "@/lib/countries";
import type { WorkforceRow } from "@/lib/cards-store";

/** Just enough of a branch to render the picker. */
export type BranchOption = { slug: string; flag: string | null; country: string; legalName: string; address: string };
import type { PhoneKey } from "@/lib/cards";

const input =
  "bg-[color:var(--bg)] border [border-color:var(--hairline)] [color:var(--ink)] rounded-lg px-3 py-2 text-sm w-full";
const btn = "border border-black/20 rounded-lg px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-50";
const primary = "app-gradient text-[color:var(--on-accent)] font-bold px-5 py-2.5 rounded-xl text-sm disabled:opacity-50";
const danger = "border border-red-500/40 text-red-700 rounded-lg px-3 py-1.5 text-sm hover:bg-red-500/10 disabled:opacity-50";

/**
 * Label choices for a phone slot. The first three are the translated presets
 * that already exist in messages.ts; "custom" reveals a free-text label so a
 * number from any country can be described properly.
 */
const LABEL_PRESETS: { value: string; text: string; key: PhoneKey }[] = [
  { value: "primaryMobile", text: "Primary mobile (translated)", key: "primaryMobile" },
  { value: "secondaryMobile", text: "Secondary mobile (translated)", key: "secondaryMobile" },
  { value: "company", text: "Company line (translated)", key: "company" },
  { value: "custom", text: "Custom label…", key: "company" },
];

const SLOT_LABEL = ["First phone (required)", "Second phone (optional)", "Third phone (optional)"];

/** Multi-select uses ⌘ on a Mac and Ctrl elsewhere; name the right one. */
const navigatorIsMac = () =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

type Draft = Omit<WorkforceRow, "id" | "position">;

const emptyDraft = (): Draft => ({
  slug: "",
  published: true,
  name: "",
  roleKey: null,
  roleCopy: {},
  email: "",
  location: "",
  linkedin: "",
  photo: "",
  phones: [],
  whatsappDisplay: "",
  whatsappHref: "",
  qrPath: "",
  vcfPath: "",
  branchSlugs: [],
});

const toDraft = (r: WorkforceRow): Draft => ({
  slug: r.slug,
  published: r.published,
  name: r.name,
  roleKey: r.roleKey,
  roleCopy: r.roleCopy ? { ...r.roleCopy } : {},
  email: r.email,
  location: r.location,
  linkedin: r.linkedin ?? "",
  photo: r.photo ?? "",
  phones: [...r.phones],
  whatsappDisplay: r.whatsappDisplay ?? "",
  whatsappHref: r.whatsappHref ?? "",
  qrPath: r.qrPath ?? "",
  vcfPath: r.vcfPath ?? "",
  branchSlugs: [...(r.branchSlugs ?? [])],
});

export function PeopleManager({ people, branches }: { people: WorkforceRow[]; branches: BranchOption[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loc, setLoc] = useState<string>("en");

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
    const r = await call("POST", "/api/central/workforce/seed");
    if (r) setMsg(`Imported ${r.created} person(s); ${r.skipped} already present.`);
  }

  async function save() {
    if (!draft) return;
    // Drop blank slots so the first non-empty number becomes the primary.
    const draft2 = { ...draft, phones: draft.phones.filter((p) => p.value.trim()) };
    const ok = editing
      ? await call("PATCH", `/api/central/workforce/${editing}`, draft2)
      : await call("POST", "/api/central/workforce", draft2);
    if (ok) {
      setEditing(null);
      setAdding(false);
      setDraft(null);
      setMsg("Saved.");
    }
  }

  async function remove(row: WorkforceRow) {
    if (!confirm(`Remove ${row.name} from /cards?`)) return;
    if (await call("DELETE", `/api/central/workforce/${row.id}`)) setMsg("Removed.");
  }

  async function move(i: number, dir: -1 | 1) {
    const next = [...people];
    const t = i + dir;
    if (t < 0 || t >= next.length) return;
    [next[i], next[t]] = [next[t], next[i]];
    if (await call("POST", "/api/central/workforce/reorder", { ids: next.map((r) => r.id) })) {
      setMsg("Order updated.");
    }
  }

  /**
   * Phones are three ordered slots. The draft keeps all three (blanks included)
   * so the inputs stay stable while typing; blanks are dropped server-side, and
   * the array is compacted on save so slot 1 is always the primary.
   */
  const slots = (d: Draft): { key: PhoneKey; label?: string; value: string; href: string }[] =>
    Array.from({ length: PHONE_SLOTS }, (_, i) => d.phones[i] ?? { key: "company", value: "", href: "" });

  const setSlot = (
    d: Draft,
    i: number,
    patch: Partial<{ key: PhoneKey; label: string; value: string }>
  ) => {
    const next = slots(d);
    next[i] = { ...next[i], ...patch };
    setDraft({ ...d, phones: next });
  };

  const form = (d: Draft) => (
    <div className="mt-4 border-t border-black/10 pt-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-xs [color:var(--muted)]">Full name</span>
          <input className={input} value={d.name} onChange={(e) => setDraft({ ...d, name: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-xs [color:var(--muted)]">Slug — the /cards/… URL (blank derives it)</span>
          <input className={input} value={d.slug} onChange={(e) => setDraft({ ...d, slug: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-xs [color:var(--muted)]">Email</span>
          <input className={input} value={d.email} onChange={(e) => setDraft({ ...d, email: e.target.value })} />
        </label>
        <div className="block">
          <span className="text-xs [color:var(--muted)]">Location — city and country</span>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,12rem)]">
            <input
              className={input}
              placeholder="City"
              value={splitLocation(d.location).city}
              onChange={(e) => setDraft({ ...d, location: joinLocation(e.target.value, splitLocation(d.location).country) })}
            />
            <select
              className={input}
              value={splitLocation(d.location).country}
              onChange={(e) => setDraft({ ...d, location: joinLocation(splitLocation(d.location).city, e.target.value) })}
              aria-label="Country"
            >
              <option value="">Country…</option>
              {COUNTRIES_BY_NAME.map((c) => (
                <option key={c.iso2} value={c.name}>
                  {flagOf(c.iso2)} {c.name}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs [color:var(--muted)] mt-1">
            Only used when no branch is selected — branches supply the address otherwise.
          </p>
        </div>
        <div className="block">
          <span className="text-xs [color:var(--muted)]">WhatsApp number (optional)</span>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
            <select
              className={input}
              value={splitPhone(d.whatsappDisplay ?? "").dial}
              onChange={(e) =>
                setDraft({
                  ...d,
                  whatsappDisplay: joinPhone(e.target.value, splitPhone(d.whatsappDisplay ?? "").national),
                })
              }
              aria-label="WhatsApp country code"
            >
              <option value="">Country code…</option>
              {COUNTRIES_BY_NAME.map((c) => (
                <option key={c.iso2} value={c.dial}>
                  {countryLabel(c)}
                </option>
              ))}
            </select>
            <input
              className={input}
              placeholder="national number"
              value={splitPhone(d.whatsappDisplay ?? "").national}
              onChange={(e) =>
                setDraft({
                  ...d,
                  whatsappDisplay: joinPhone(splitPhone(d.whatsappDisplay ?? "").dial, e.target.value),
                })
              }
            />
          </div>
        </div>
        <label className="block">
          <span className="text-xs [color:var(--muted)]">LinkedIn URL (optional)</span>
          <input
            className={input}
            value={d.linkedin ?? ""}
            onChange={(e) => setDraft({ ...d, linkedin: e.target.value })}
          />
        </label>
      </div>

      {/* Branches — the source of this person's contact address */}
      <div className="mt-5">
        <span className="text-xs [color:var(--muted)]">Branch(es)</span>
        <p className="text-xs [color:var(--muted)] mt-0.5 mb-2">
          The card and the saved contact use these addresses. Pick more than one for someone who splits their time.
        </p>
        {branches.length === 0 ? (
          <p className="text-xs text-amber-700">
            No branches configured yet — set them up in <strong>Branches</strong> first.
          </p>
        ) : (
          <>
            <select
              multiple
              className={`${input} h-auto`}
              size={Math.min(6, Math.max(3, branches.length))}
              value={d.branchSlugs ?? []}
              onChange={(e) =>
                setDraft({
                  ...d,
                  branchSlugs: Array.from(e.target.selectedOptions, (o) => o.value),
                })
              }
            >
              {branches.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.flag ? `${b.flag} ` : ""}
                  {b.country} — {b.legalName}
                </option>
              ))}
            </select>
            <p className="text-xs [color:var(--muted)] mt-1">
              Hold {navigatorIsMac() ? "⌘" : "Ctrl"} (or Shift) to select more than one.
            </p>
            {/* Echo the addresses so the effect on the card is visible here. */}
            {(d.branchSlugs ?? []).length > 0 && (
              <ul className="mt-2 grid gap-1">
                {branches
                  .filter((b) => (d.branchSlugs ?? []).includes(b.slug))
                  .map((b) => (
                    <li key={b.slug} className="text-xs [color:var(--muted)]">
                      <span className="font-medium">
                        {b.flag} {b.country}
                      </span>{" "}
                      — {b.address}
                    </li>
                  ))}
              </ul>
            )}
          </>
        )}
        {(d.branchSlugs ?? []).length === 0 && (
          <p className="text-xs [color:var(--muted)] mt-2">
            None selected — the card falls back to the free-text location below.
          </p>
        )}
      </div>

      {/* Phones — three ordered slots, any country */}
      <div className="mt-5">
        <span className="text-xs [color:var(--muted)]">Phone numbers</span>
        <p className="text-xs [color:var(--muted)] mt-0.5 mb-2">
          Any country — include the country code, e.g. <code>+1 555 555 0102</code>. Only the first is required.
        </p>
        <div className="grid gap-3">
          {slots(d).map((ph, i) => {
            const isCustom = Boolean(ph.label);
            const problem = ph.value ? phoneProblem(ph.value) : null;
            return (
              <div key={i} className="grid gap-2 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] items-start">
                <div>
                  <select
                    className={input}
                    value={isCustom ? "custom" : ph.key}
                    onChange={(e) => {
                      const choice = LABEL_PRESETS.find((o) => o.value === e.target.value)!;
                      setSlot(d, i,
                        e.target.value === "custom"
                          ? { key: choice.key, label: ph.label || "Mobile" }
                          : { key: choice.key, label: "" }
                      );
                    }}
                    aria-label={`${SLOT_LABEL[i]} label`}
                  >
                    {LABEL_PRESETS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.text}
                      </option>
                    ))}
                  </select>
                  {isCustom && (
                    <input
                      className={`${input} mt-2`}
                      placeholder="Label, e.g. Canada mobile"
                      value={ph.label ?? ""}
                      onChange={(e) => setSlot(d, i, { label: e.target.value })}
                    />
                  )}
                </div>
                <div>
                  {/* Country code is picked, not typed, so every stored number
                      carries a valid dial prefix. */}
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
                    <select
                      className={input}
                      value={splitPhone(ph.value).dial}
                      onChange={(e) =>
                        setSlot(d, i, { value: joinPhone(e.target.value, splitPhone(ph.value).national) })
                      }
                      aria-label={`${SLOT_LABEL[i]} country code`}
                    >
                      <option value="">Country code…</option>
                      {COUNTRIES_BY_NAME.map((c) => (
                        <option key={c.iso2} value={c.dial}>
                          {countryLabel(c)}
                        </option>
                      ))}
                    </select>
                    <input
                      className={input}
                      placeholder={i === 0 ? "555 555 0102 (required)" : "national number (optional)"}
                      value={splitPhone(ph.value).national}
                      onChange={(e) =>
                        setSlot(d, i, { value: joinPhone(splitPhone(ph.value).dial, e.target.value) })
                      }
                      required={i === 0}
                    />
                  </div>
                  <div className="text-xs mt-1">
                    {problem ? (
                      <span className="text-red-700">{problem}</span>
                    ) : (
                      <span className="[color:var(--muted)]">
                        {SLOT_LABEL[i]}
                        {ph.value ? ` · saved as ${ph.value}` : ""}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Role: legacy preset (keeps hand-written translations) or free text */}
      <div className="mt-5">
        <span className="text-xs [color:var(--muted)]">Role</span>
        <select
          className={`${input} mt-1`}
          value={d.roleKey ?? "custom"}
          onChange={(e) =>
            setDraft({ ...d, roleKey: e.target.value === "custom" ? null : e.target.value })
          }
        >
          <option value="founder">Preset · Founder &amp; CEO (translated in all 11 locales)</option>
          <option value="ops">Preset · Operations Manager &amp; Co-founder (translated)</option>
          <option value="custom">Custom role — type it per locale below</option>
        </select>
        {!d.roleKey && (
          <>
            <div className="flex gap-1 flex-wrap mt-3">
              {LOCALES.map((l) => {
                const filled = Boolean(d.roleCopy?.[l]);
                return (
                  <button
                    key={l}
                    onClick={() => setLoc(l)}
                    className={`px-2.5 py-1 rounded-lg text-xs border ${
                      loc === l ? "border-sky-500 bg-sky-500/10 font-semibold" : "border-black/15"
                    } ${filled ? "" : "[color:var(--muted)]"}`}
                  >
                    {l.toUpperCase()}
                    {filled ? " ●" : " ○"}
                  </button>
                );
              })}
            </div>
            <input
              className={`${input} mt-2`}
              placeholder={loc === "en" ? "Role in English (required)" : `Role in ${loc.toUpperCase()} — blank uses English`}
              value={d.roleCopy?.[loc] ?? ""}
              onChange={(e) => {
                const roleCopy = { ...(d.roleCopy ?? {}), [loc]: e.target.value };
                if (!e.target.value) delete roleCopy[loc];
                setDraft({ ...d, roleCopy });
              }}
            />
          </>
        )}
      </div>

      <label className="flex items-center gap-2 mt-4">
        <input
          type="checkbox"
          checked={d.published}
          onChange={(e) => setDraft({ ...d, published: e.target.checked })}
        />
        <span className="text-sm">Published (unticked hides them from /cards)</span>
      </label>

      <div className="mt-4">
        <ImageUpload
          name={`photo-${d.slug || "new"}`}
          initial={d.photo ?? ""}
          label="Photo"
          onChange={(url) => setDraft({ ...d, photo: url })}
        />
      </div>

      <p className="text-xs [color:var(--muted)] mt-4">
        {d.qrPath || d.vcfPath
          ? "This person has hand-made QR / vCard files, which keep being served as-is."
          : "QR code and vCard are generated automatically from these details."}
      </p>

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
            setLoc("en");
          }}
        >
          Add person
        </button>
        <button className={btn} onClick={seed} disabled={busy}>
          Import the people already on /cards
        </button>
        <Link href="/cards" className={btn} target="_blank">
          View the public page ↗
        </Link>
      </div>

      {people.length === 0 && !adding && (
        <p className="[color:var(--muted)] text-sm mt-6">
          Nobody stored yet — /cards is showing its built-in list. Use{" "}
          <strong>Import the people already on /cards</strong> to pull them in and start editing.
        </p>
      )}

      {adding && draft && (
        <div className="panel rounded-2xl p-5 mt-6">
          <h3 className="font-bold">New person</h3>
          {form(draft)}
        </div>
      )}

      <div className="grid gap-3 mt-6">
        {people.map((row, i) => (
          <div key={row.id} className="panel rounded-xl p-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                {row.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={row.photo} alt="" className="h-10 w-10 rounded-full object-cover bg-black/10 shrink-0" />
                ) : (
                  <span className="h-10 w-10 rounded-full bg-black/10 grid place-items-center text-xs shrink-0">
                    {row.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <div className="font-semibold text-sm">
                    {row.name}
                    {!row.published && <span className="ml-2 text-xs text-amber-700">· hidden</span>}
                  </div>
                  <div className="text-xs [color:var(--muted)]">
                    {row.roleKey ? `preset: ${row.roleKey}` : row.roleCopy?.en || "—"} · /cards/{row.slug}
                  </div>
                  <div className="text-xs [color:var(--muted)] mt-0.5">
                    {row.phones.length} phone{row.phones.length === 1 ? "" : "s"}
                    {row.qrPath ? " · hand-made QR" : " · generated QR"}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button className={btn} onClick={() => move(i, -1)} disabled={busy || i === 0}>
                  ↑
                </button>
                <button className={btn} onClick={() => move(i, 1)} disabled={busy || i === people.length - 1}>
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
                <button className={danger} onClick={() => remove(row)} disabled={busy}>
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
