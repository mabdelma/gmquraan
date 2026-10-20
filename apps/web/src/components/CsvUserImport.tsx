"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CentralForms } from "@/lib/central-forms-i18n";

type CI = CentralForms["ci"];

type Result = {
  created: { email: string; password: string; role: string }[];
  skipped: { email: string; reason: string }[];
};

const SAMPLE = "email,name,role,plan,password\njane@acme.com,Jane Doe,CLIENT,STARTER,\nsam@partner.io,Sam,PARTNER,GROWTH,Secret123";

export function CsvUserImport({ t }: { t: CI }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function readFile(f: File) {
    setCsv(await f.text());
  }

  async function run() {
    setBusy(true);
    setErr(null);
    setRes(null);
    const r = await fetch("/api/central/users/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ csv }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok || !j.success) {
      setErr(j.error || t.importFailed);
      return;
    }
    setRes({ created: j.created, skipped: j.skipped });
    router.refresh();
  }

  function downloadCreated() {
    if (!res?.created.length) return;
    const csvOut = ["email,role,password", ...res.created.map((c) => `${c.email},${c.role},${c.password}`)].join("\n");
    const url = URL.createObjectURL(new Blob([csvOut], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "app-imported-users.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="text-xs border border-[color:var(--hairline)] rounded-lg px-3 py-1.5 hover:bg-[color:var(--overlay)]">
        {t.importCsv}
      </button>
    );

  return (
    <div className="panel rounded-2xl p-5 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold">{t.title}</h3>
        <button onClick={() => setOpen(false)} className="text-xs text-[color:var(--ink)]/50 hover:text-[color:var(--ink)]">
          {t.close}
        </button>
      </div>
      <p className="text-[color:var(--ink)]/50 text-xs mb-3">
        {t.colsLabel} <code>email, name, role, plan, password</code>. {t.colsHint}
      </p>
      <div className="flex items-center gap-3 mb-3">
        <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} className="text-xs" />
        <button onClick={() => setCsv(SAMPLE)} className="text-xs text-[color:var(--accent-text)] hover:underline">
          {t.pasteSample}
        </button>
      </div>
      <textarea
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        rows={6}
        placeholder={SAMPLE}
        className="w-full bg-[color:var(--surface)] border border-[color:var(--hairline)] rounded-lg px-3 py-2 text-sm font-mono"
      />
      <div className="flex items-center gap-4 mt-3 flex-wrap">
        <button
          disabled={busy || !csv.trim()}
          onClick={run}
          className="app-gradient text-[color:var(--on-accent)] font-bold rounded-lg px-4 py-2 text-sm disabled:opacity-40"
        >
          {busy ? t.importing : t.importBtn}
        </button>
        {err && <span className="text-red-300 text-sm">{err}</span>}
      </div>

      {res && (
        <div className="mt-4 text-sm">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-emerald-300">{res.created.length} {t.createdSuffix}</span>
            <span className="text-[color:var(--accent-text)]">{res.skipped.length} {t.skippedSuffix}</span>
            {res.created.length > 0 && (
              <button onClick={downloadCreated} className="text-xs border border-[color:var(--hairline)] rounded-lg px-3 py-1.5 hover:bg-[color:var(--overlay)]">
                {t.downloadCsv}
              </button>
            )}
          </div>
          {res.created.length > 0 && (
            <div className="mt-2 text-xs text-[color:var(--ink)]/60">
              <div className="text-[color:var(--ink)]/55 mb-1">{t.genPw}</div>
              <ul className="space-y-0.5 max-h-40 overflow-y-auto font-mono">
                {res.created.map((c) => (
                  <li key={c.email}>
                    {c.email} → <span className="text-[color:var(--accent-text)]">{c.password}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {res.skipped.length > 0 && (
            <ul className="mt-2 text-xs text-[color:var(--ink)]/50 space-y-0.5 max-h-40 overflow-y-auto">
              {res.skipped.map((s, i) => (
                <li key={i}>
                  {s.email} — <span className="text-[color:var(--accent-text)]/80">{s.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
