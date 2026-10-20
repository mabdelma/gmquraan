"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { USER_ROLES, USER_PLANS } from "@/lib/central-users";
import type { CentralForms } from "@/lib/central-forms-i18n";

type Row = { id: string; email: string; name: string | null; role: string; plan: string; createdAt: string };
type UM = CentralForms["um"];

const sel = "bg-[color:var(--surface)] border border-[color:var(--hairline)] rounded-lg px-2 py-1.5 text-sm";
const input = "bg-[color:var(--surface)] border border-[color:var(--hairline)] rounded-lg px-3 py-2 text-sm w-full";

export function UserManager({ users, isSuper, selfId, t }: { users: Row[]; isSuper: boolean; selfId: string; t: UM }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [q, setQ] = useState("");

  // add form
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "CLIENT", plan: "STARTER" });
  // separate admin-creation form (super-admin only)
  const [aForm, setAForm] = useState({ email: "", name: "", password: "", role: "ADMIN", plan: "ENTERPRISE" });

  const roleOptions = USER_ROLES.filter((r) => r !== "ADMIN" && r !== "SUPER_ADMIN");

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
      setMsg(json.error || t.actionFailed);
      return false;
    }
    router.refresh();
    return true;
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (await call("POST", "/api/central/users", form)) {
      setForm({ email: "", name: "", password: "", role: "CLIENT", plan: "STARTER" });
      setMsg(t.userCreated);
    }
  }

  async function addAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (await call("POST", "/api/central/users", aForm)) {
      setAForm({ email: "", name: "", password: "", role: "ADMIN", plan: "ENTERPRISE" });
      setMsg(t.adminCreated);
    }
  }

  const filtered = users.filter(
    (u) => !q || u.email.toLowerCase().includes(q.toLowerCase()) || (u.name || "").toLowerCase().includes(q.toLowerCase())
  );
  const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);
  const admins = filtered.filter((u) => ADMIN_ROLES.has(u.role));
  const regular = filtered.filter((u) => !ADMIN_ROLES.has(u.role));

  const renderGroup = (title: string, rows: Row[], hint: string, accent: string) => (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-1">
        <h3 className={`font-bold text-sm ${accent}`}>{title}</h3>
        <span className="text-xs text-[color:var(--ink)]/55">({rows.length})</span>
      </div>
      <p className="text-[color:var(--ink)]/55 text-xs mb-3">{hint}</p>
      <div className="panel rounded-2xl p-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-widest text-[color:var(--ink)]/55">
              <th className="pb-3 pr-4">{t.user}</th>
              <th className="pb-3 pr-4">{t.role}</th>
              <th className="pb-3 pr-4">{t.plan}</th>
              <th className="pb-3 pr-4">{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <UserRowEditor key={u.id} u={u} selfId={selfId} busy={busy} call={call} t={t} isSuper={isSuper} />
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="text-[color:var(--ink)]/55 text-sm py-4">{t.none}</p>}
      </div>
    </div>
  );

  return (
    <div>
      {msg && <div className="panel rounded-xl px-4 py-3 text-sm mb-4 border border-[color:var(--accent-text)]/30 text-[color:var(--accent-text)]">{msg}</div>}

      {/* Add user */}
      <form onSubmit={add} className="panel rounded-2xl p-5 grid md:grid-cols-6 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="text-xs text-[color:var(--ink)]/50">{t.email}</label>
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} />
        </div>
        <div>
          <label className="text-xs text-[color:var(--ink)]/50">{t.name}</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
        </div>
        <div>
          <label className="text-xs text-[color:var(--ink)]/50">{t.password}</label>
          <input required type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={input} placeholder={t.pwHint}/>
        </div>
        <div>
          <label className="text-xs text-[color:var(--ink)]/50">{t.role}</label>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={`${sel} w-full`}>
            {roleOptions.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
        <button disabled={busy} className="app-gradient text-[color:var(--on-accent)] font-bold rounded-lg px-4 py-2 text-sm disabled:opacity-40">
          {t.addUser}
        </button>
      </form>

      {/* Search */}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t.search}
        className={`${input} mt-6 max-w-sm`}
      />

      {/* Split: administrators vs. normal users */}
      {isSuper && (
        <form onSubmit={addAdmin} className="panel rounded-2xl p-5 grid md:grid-cols-6 gap-3 items-end mt-8 border border-emerald-400/20">
          <div className="md:col-span-6 text-sm font-semibold text-emerald-300">{t.addAdmin}</div>
          <div className="md:col-span-2">
            <label className="text-xs text-[color:var(--ink)]/50">{t.email}</label>
            <input required type="email" value={aForm.email} onChange={(e) => setAForm({ ...aForm, email: e.target.value })} className={input} />
          </div>
          <div>
            <label className="text-xs text-[color:var(--ink)]/50">{t.name}</label>
            <input value={aForm.name} onChange={(e) => setAForm({ ...aForm, name: e.target.value })} className={input} />
          </div>
          <div>
            <label className="text-xs text-[color:var(--ink)]/50">{t.password}</label>
            <input required type="text" value={aForm.password} onChange={(e) => setAForm({ ...aForm, password: e.target.value })} className={input} placeholder={t.pwHint}/>
          </div>
          <div>
            <label className="text-xs text-[color:var(--ink)]/50">{t.role}</label>
            <select value={aForm.role} onChange={(e) => setAForm({ ...aForm, role: e.target.value })} className={`${sel} w-full`}>
              <option value="ADMIN">ADMIN</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            </select>
          </div>
          <button disabled={busy} className="app-gradient text-[color:var(--on-accent)] font-bold rounded-lg px-4 py-2 text-sm disabled:opacity-40">
            {t.addAdminBtn}
          </button>
        </form>
      )}
      {renderGroup(t.administrators, admins, isSuper ? t.hintSuper : t.hintNo, "text-emerald-300")}
      {renderGroup(t.users, regular, t.hintUsers, "text-[color:var(--accent-text)]")}
    </div>
  );
}

function UserRowEditor({
  u,
  selfId,
  busy,
  call,
  t,
  isSuper,
}: {
  u: Row;
  selfId: string;
  busy: boolean;
  call: (m: string, url: string, b?: unknown) => Promise<boolean>;
  t: UM;
  isSuper: boolean;
}) {
  const [role, setRole] = useState(u.role);
  const [plan, setPlan] = useState(u.plan);
  const isAdminRow = u.role === "ADMIN" || u.role === "SUPER_ADMIN";
  // Admin rows are locked to everyone EXCEPT a super-admin (who can reset/demote/delete
  // them). The backend still refuses self-delete and removing the last super-admin.
  const locked = isAdminRow && !isSuper;
  const roleOptions = USER_ROLES.filter((r) => r !== "ADMIN" && r !== "SUPER_ADMIN");
  const dirty = role !== u.role || plan !== u.plan;

  async function resetPw() {
    const pw = prompt(t.resetPrompt.replace("{email}", u.email));
    if (!pw) return;
    if (await call("PATCH", `/api/central/users/${u.id}`, { password: pw })) alert(t.pwUpdated);
  }

  return (
    <tr className="border-t border-[color:var(--hairline)] align-middle">
      <td className="py-3 pr-4">
        <div className="font-medium">{u.name || "—"}</div>
        <div className="text-[color:var(--ink)]/55 text-xs">{u.email}</div>
      </td>
      <td className="py-3 pr-4">
        <select value={role} onChange={(e) => setRole(e.target.value)} disabled={locked} className={`${sel} disabled:opacity-50`}>
          {roleOptions.map((r) => (
            <option key={r}>{r}</option>
          ))}
          {isAdminRow && <option value={u.role}>{u.role}</option>}
        </select>
      </td>
      <td className="py-3 pr-4">
        <select value={plan} onChange={(e) => setPlan(e.target.value)} disabled={locked} className={`${sel} disabled:opacity-50`}>
          {USER_PLANS.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          <button
            disabled={busy || locked || !dirty}
            onClick={() => call("PATCH", `/api/central/users/${u.id}`, { role, plan })}
            className="text-xs app-gradient text-[color:var(--on-accent)] font-bold rounded-lg px-3 py-1.5 disabled:opacity-30"
          >
            {t.save}
          </button>
          <button
            disabled={busy || locked}
            onClick={resetPw}
            className="text-xs border border-[color:var(--hairline)] rounded-lg px-3 py-1.5 hover:bg-[color:var(--overlay)] disabled:opacity-30"
          >
            {t.resetPw}
          </button>
          <button
            disabled={busy || locked || u.id === selfId}
            onClick={() => confirm(t.delConfirm.replace("{email}", u.email)) && call("DELETE", `/api/central/users/${u.id}`)}
            className="text-xs border border-red-500/40 text-red-300 rounded-lg px-3 py-1.5 hover:bg-red-500/10 disabled:opacity-30"
          >
            {t.del}
          </button>
        </div>
      </td>
    </tr>
  );
}
