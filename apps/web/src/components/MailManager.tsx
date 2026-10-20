"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUpload } from "@/components/ImageUpload";
import { fmtMb } from "@/components/MailStatus";
import type { CentralForms } from "@/lib/central-forms-i18n";

type Row = {
  email: string;
  name: string;
  active: boolean;
  quotaMb: number;
  usedMb: number;
  messages: number;
  lastLogin: string | null;
  photo?: string;
};
type Alias = { id: number; address: string; goto: string; active: boolean };
type MM = CentralForms["mm"];

const gen = () => "Pw" + Math.random().toString(36).slice(2, 8) + Math.floor(10 + Math.random() * 89) + "x";

const input = "bg-[color:var(--surface)] border border-[color:var(--hairline)] rounded-lg px-3 py-2 text-sm";
const rowInput = "bg-[color:var(--surface)] border border-[color:var(--hairline)] rounded-lg px-2 py-1.5 text-sm";
const ghost = "text-xs border border-[color:var(--hairline)] rounded-lg px-3 py-1.5 hover:bg-[color:var(--overlay)] disabled:opacity-40";
// The console runs on a light grey panel — danger text must be dark to be legible.
const danger = "text-xs border border-red-500/40 text-red-700 rounded-lg px-3 py-1.5 hover:bg-red-500/10 disabled:opacity-40";

/** A secret the admin must copy before it is gone. */
function SecretBanner({ text, label, t }: { text: string; label: string; t: MM }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl px-4 py-3 text-sm mb-4 border border-amber-500/40 bg-amber-400/10">
      <div className="text-amber-900 font-semibold">{label}</div>
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        <code className="font-mono text-amber-950 bg-amber-400/20 rounded px-2 py-1 break-all">{text}</code>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="text-xs border border-amber-600/40 text-amber-900 rounded-lg px-3 py-1.5 hover:bg-amber-400/20"
        >
          {copied ? t.copied : t.copy}
        </button>
      </div>
    </div>
  );
}

export function MailManager({ mailboxes, aliases, domains, t }: { mailboxes: Row[]; aliases: Alias[]; domains: string[]; t: MM }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [secret, setSecret] = useState<{ text: string; label: string } | null>(null);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ localPart: "", name: "", password: gen(), quotaMb: 2048, photo: "", domain: domains[0] ?? "" });
  const [aliasForm, setAliasForm] = useState({ localPart: "", goto: "", domain: domains[0] ?? "" });

  async function req(url: string, method: string, body: unknown) {
    setBusy(true);
    setMsg(null);
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !j.success) {
      setErr(true);
      setMsg(j.error || "Action failed");
      return false;
    }
    setErr(false);
    router.refresh();
    return true;
  }
  const call = (method: string, body: unknown) => req("/api/central/mail", method, body);
  const aliasCall = (method: string, body: unknown) => req("/api/central/mail/aliases", method, body);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const pw = form.password;
    const address = `${form.localPart}@${form.domain}`;
    if (await call("POST", form)) {
      setSecret({ text: pw, label: `${address} — ${t.password}` });
      setForm({ localPart: "", name: "", password: gen(), quotaMb: 2048, photo: "", domain: form.domain });
    }
  }

  async function reset(email: string) {
    // Generated inline rather than via prompt(): some browsers suppress prompt,
    // and it gave no way to copy the result reliably.
    const pw = gen();
    if (await call("PUT", { email, password: pw })) {
      setSecret({ text: pw, label: `${email} — ${t.newPassword}` });
    }
  }

  async function del(email: string) {
    if (!confirm(`Delete ${email}? This permanently removes the mailbox and all its mail.`)) return;
    if (await call("DELETE", { email })) setMsg(`Deleted ${email}.`);
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return mailboxes;
    return mailboxes.filter(
      (m) => m.email.toLowerCase().includes(needle) || (m.name || "").toLowerCase().includes(needle)
    );
  }, [mailboxes, q]);

  return (
    <div>
      {secret && <SecretBanner text={secret.text} label={secret.label} t={t} />}
      {msg && (
        <div
          className={`rounded-xl px-4 py-3 text-sm mb-4 border break-all ${
            err ? "border-red-500/40 bg-red-500/10 text-red-800" : "border-sky-500/40 bg-sky-500/10 text-sky-900"
          }`}
        >
          {msg}
        </div>
      )}

      <form onSubmit={create} className="panel rounded-2xl p-5 grid md:grid-cols-6 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="text-xs text-[color:var(--ink)]/50">{t.mailbox}</label>
          <div className="flex items-center">
            <input
              required
              value={form.localPart}
              onChange={(e) => setForm({ ...form, localPart: e.target.value })}
              placeholder="name"
              className={`${input} rounded-r-none w-full`}
            />
            <select
              value={form.domain}
              onChange={(e) => setForm({ ...form, domain: e.target.value })}
              className={`${input} rounded-l-none border-l-0 shrink-0 max-w-44`}
            >
              {domains.map((d) => (
                <option key={d} value={d}>
                  @{d}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs text-[color:var(--ink)]/50">{t.displayName}</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`${input} w-full`} />
        </div>
        <div>
          <label className="text-xs text-[color:var(--ink)]/50">{t.password}</label>
          <div className="flex">
            <input
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={`${input} rounded-r-none w-full`}
            />
            <button
              type="button"
              onClick={() => setForm({ ...form, password: gen() })}
              className="text-xs border border-l-0 border-[color:var(--hairline)] rounded-r-lg px-2 hover:bg-[color:var(--overlay)]"
            >
              ↻
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs text-[color:var(--ink)]/50">{t.quota}</label>
          <input
            type="number"
            min="64"
            value={form.quotaMb}
            onChange={(e) => setForm({ ...form, quotaMb: +e.target.value })}
            className={`${input} w-full`}
          />
        </div>
        <button disabled={busy} className="app-gradient text-[color:var(--on-accent)] font-bold rounded-lg px-4 py-2 text-sm disabled:opacity-40">
          {t.create}
        </button>
        <div className="md:col-span-6">
          <ImageUpload name="photo" initial={form.photo} label={t.photoLabel} onChange={(url) => setForm((f) => ({ ...f, photo: url }))} />
        </div>
      </form>

      <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.search}
          className={`${input} w-full sm:w-80`}
        />
        <span className="text-xs text-[color:var(--ink)]/50">
          {filtered.length}/{mailboxes.length}
        </span>
      </div>

      <div className="panel rounded-2xl p-4 mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-widest text-[color:var(--ink)]/55">
              <th className="pb-3 pr-4">{t.mailbox}</th>
              <th className="pb-3 pr-4">{t.usage}</th>
              <th className="pb-3 pr-4">{t.lastLogin}</th>
              <th className="pb-3">{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <MailRow key={m.email} m={m} t={t} busy={busy} call={call} reset={reset} del={del} />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-[color:var(--ink)]/55">
                  {mailboxes.length === 0 ? t.noMailboxes : t.noMatches}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Aliases / forwarders */}
      <h2 className="font-bold text-lg mt-12 mb-2">{t.aliasesTitle}</h2>
      <p className="text-[color:var(--ink)]/55 text-xs mb-3">{t.aliasesHint}</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await aliasCall("POST", aliasForm)) {
            setMsg(`Alias ${aliasForm.localPart || "*"}@${aliasForm.domain} → ${aliasForm.goto} created.`);
            setAliasForm({ localPart: "", goto: "", domain: aliasForm.domain });
          }
        }}
        className="panel rounded-2xl p-5 grid md:grid-cols-5 gap-3 items-end"
      >
        <div className="md:col-span-2">
          <label className="text-xs text-[color:var(--ink)]/50">{t.alias}</label>
          <div className="flex items-center">
            <input
              value={aliasForm.localPart}
              onChange={(e) => setAliasForm({ ...aliasForm, localPart: e.target.value })}
              placeholder="sales or *"
              className={`${input} rounded-r-none w-full`}
            />
            <select
              value={aliasForm.domain}
              onChange={(e) => setAliasForm({ ...aliasForm, domain: e.target.value })}
              className={`${input} rounded-l-none border-l-0 shrink-0 max-w-44`}
            >
              {domains.map((d) => (
                <option key={d} value={d}>
                  @{d}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-[color:var(--ink)]/50">{t.forwardsTo}</label>
          <input
            required
            value={aliasForm.goto}
            onChange={(e) => setAliasForm({ ...aliasForm, goto: e.target.value })}
            placeholder="info@gmquran.com"
            className={`${input} w-full`}
          />
        </div>
        <button disabled={busy} className="app-gradient text-[color:var(--on-accent)] font-bold rounded-lg px-4 py-2 text-sm disabled:opacity-40">
          {t.addAlias}
        </button>
      </form>

      <div className="mt-4 space-y-2">
        {aliases.length === 0 ? (
          <p className="text-[color:var(--ink)]/55 text-sm">{t.noAliases}</p>
        ) : (
          aliases.map((a) => (
            <div key={a.id} className="panel rounded-lg px-4 py-3 text-sm flex items-center justify-between gap-3 flex-wrap">
              <span>
                <span className="font-mono">{a.address}</span> <span className="text-[color:var(--ink)]/55">→ {a.goto}</span>
                {!a.active && <span className="text-amber-700 text-xs"> · {t.disable}d</span>}
              </span>
              <span className="flex gap-2">
                <button
                  onClick={() => aliasCall("PUT", { id: a.id, active: !a.active })}
                  disabled={busy}
                  className={ghost}
                >
                  {a.active ? t.disable : t.enable}
                </button>
                <button
                  onClick={() => confirm(`Delete alias ${a.address}?`) && aliasCall("DELETE", { id: a.id })}
                  disabled={busy}
                  className={danger}
                >
                  {t.del}
                </button>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function MailRow({
  m,
  t,
  busy,
  call,
  reset,
  del,
}: {
  m: Row;
  t: MM;
  busy: boolean;
  call: (method: string, body: unknown) => Promise<boolean>;
  reset: (email: string) => void;
  del: (email: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(m.name);
  const [quotaMb, setQuotaMb] = useState(m.quotaMb);
  const [photo, setPhoto] = useState(m.photo ?? "");

  async function save() {
    if (await call("PUT", { email: m.email, name, quotaMb, photo })) setEditing(false);
  }

  // mailcow reports quota 0 as unlimited; a percentage would be meaningless.
  const unlimited = m.quotaMb <= 0;
  const pct = unlimited ? 0 : Math.min(100, (m.usedMb / m.quotaMb) * 100);
  const over = !unlimited && m.usedMb >= m.quotaMb;
  const nearly = !unlimited && !over && pct >= 90;

  return (
    <tr className="border-t border-[color:var(--hairline)]">
      <td className="py-3 pr-4">
        <div className="flex items-center gap-3">
          {m.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.photo} alt="" className="h-9 w-9 rounded-full object-cover bg-[color:var(--overlay)] shrink-0" />
          ) : (
            <span className="h-9 w-9 rounded-full bg-[color:var(--overlay)] grid place-items-center text-xs text-[color:var(--ink)]/55 shrink-0">
              {(m.name || m.email).slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <div className="font-medium">{m.email}</div>
            {editing ? (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.displayName}
                className={`${rowInput} mt-1 w-full`}
              />
            ) : (
              <div className="text-[color:var(--ink)]/55 text-xs">
                {m.name || "—"}
                {!m.active && <span className="text-amber-700"> · {t.disable}d</span>}
              </div>
            )}
          </div>
        </div>
        {editing && (
          <div className="mt-2">
            <ImageUpload name={`photo-${m.email}`} initial={photo} label={t.photoLabel} onChange={setPhoto} />
          </div>
        )}
      </td>
      <td className="py-3 pr-4 text-[color:var(--ink)]/60 min-w-44">
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="64"
              value={quotaMb}
              onChange={(e) => setQuotaMb(+e.target.value)}
              className={`${rowInput} w-24`}
            />
            <span className="text-xs text-[color:var(--ink)]/55">MB</span>
          </div>
        ) : (
          <>
            <div className={over ? "text-red-700 font-medium" : ""}>
              {fmtMb(m.usedMb)} / {unlimited ? t.unlimited : fmtMb(m.quotaMb)}
              {over && <span className="text-xs"> · {t.overQuota}</span>}
            </div>
            {!unlimited && (
              <div className="h-1.5 rounded-full bg-[color:var(--overlay)] mt-1.5 overflow-hidden max-w-36">
                <div
                  className={`h-full rounded-full ${over || nearly ? "bg-red-500" : "app-gradient"}`}
                  style={{ width: `${Math.max(2, pct)}%` }}
                />
              </div>
            )}
            <div className="text-xs text-[color:var(--ink)]/45 mt-1">
              {m.messages.toLocaleString()} {t.statusMessages}
            </div>
          </>
        )}
      </td>
      <td className="py-3 pr-4 text-[color:var(--ink)]/50">
        {m.lastLogin ? new Date(m.lastLogin).toLocaleDateString() : t.never}
      </td>
      <td className="py-3">
        <div className="flex items-center gap-2 flex-wrap">
          {editing ? (
            <>
              <button
                onClick={save}
                disabled={busy}
                className="text-xs app-gradient text-[color:var(--on-accent)] font-bold rounded-lg px-3 py-1.5 disabled:opacity-40"
              >
                {t.save}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setName(m.name);
                  setQuotaMb(m.quotaMb);
                  setPhoto(m.photo ?? "");
                }}
                disabled={busy}
                className={ghost}
              >
                {t.cancel}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} disabled={busy} className={ghost}>
                {t.edit}
              </button>
              <button onClick={() => reset(m.email)} disabled={busy} className={ghost}>
                {t.resetPw}
              </button>
              <button onClick={() => call("PUT", { email: m.email, active: !m.active })} disabled={busy} className={ghost}>
                {m.active ? t.disable : t.enable}
              </button>
              <button onClick={() => del(m.email)} disabled={busy} className={danger}>
                {t.del}
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
