"use client";

import React, { useState } from "react";
import { useToolStore, toolStore } from "@/lib/toolStore";
import type { AgentMessages } from "@/lib/i18n";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

/** Interactive side form — the visitor enters their own data; submits a real lead. */
function DemoForm({ p, t }: { p: any; t: AgentMessages }) {
  const [name, setName] = useState(p?.name || "");
  const [email, setEmail] = useState(p?.email || "");
  const [msg, setMsg] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || state === "sending") return;
    setState("sending");
    const message = `Demo/contact request via AI advisor.\nSolution: ${p?.solution || "(general)"}\n${msg}`.trim();

    // Only claim success when the lead actually reached us. Previously any
    // failure was swallowed and the visitor still saw a green tick, so a
    // request that never arrived looked completed.
    let ok = false;
    try {
      const res = await fetch(`${SITE}/api/contact`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, message, source: "ai-advisor" }),
      });
      const body = await res.json().catch(() => ({}));
      ok = res.ok && body?.success !== false;
    } catch {
      ok = false;
    }

    setState(ok ? "done" : "error");
    // Hand the outcome back to the advisor so it can speak the confirmation,
    // say what happens next, and carry on — or help recover if it failed.
    toolStore.report(
      ok
        ? `The visitor just submitted the demo form on screen. Name: ${name}. Email: ${email}.${
            p?.solution ? ` Solution: ${p.solution}.` : ""
          } It reached the team successfully. Confirm this out loud, tell them the team will follow up by email, then ask whether there is anything else you can help with.`
        : `The visitor submitted the demo form but it FAILED to send. Apologise briefly, give them the direct contact details to use instead, and offer to keep helping.`
    );
  }

  if (state === "done") {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
        <h3 style={{ fontSize: 20, fontWeight: 800 }}>{t.received}</h3>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>{t.thanks.replace("{name}", name).replace("{email}", email)}</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div style={{ textAlign: "center" }} role="alert">
        <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
        <h3 style={{ fontSize: 20, fontWeight: 800 }}>{t.sendFailed}</h3>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>{t.sendFailedBody}</p>
        <p style={{ marginTop: 10 }}>
          <a style={link} href="mailto:inquiry@example.com">
            inquiry@example.com
          </a>
        </p>
        <button type="button" onClick={() => setState("idle")} className="btn btn-sm app-btn-outline mt-2">
          {t.tryAgain}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{t.formTitle}</h3>
      {p?.solution && <p style={{ color: "var(--muted)", fontSize: 13 }}>{p.solution}</p>}
      <input className="form-control mt-2" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.formName} required />
      <input className="form-control mt-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.formEmail} required />
      <textarea className="form-control mt-2" rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={t.formMsg} />
      <button type="submit" disabled={state === "sending"} className="btn btn-warning w-100 mt-3">
        {state === "sending" ? t.formSending : t.formSend}
      </button>
    </form>
  );
}

const CATEGORY_LABEL: Record<string, string> = {
  SAAS_PLATFORM: "White-Label SaaS",
  LAUNCH_KIT: "Launch Kit",
  AI_AUTOMATION: "AI & Automation",
  MARKETPLACE_SOLUTION: "Marketplace Solution",
  PRODUCTIZED_SERVICE: "Productized Service",
  MARKET_ENABLEMENT: "Market Enablement",
};

const fmt = (cents: number, currency = "EUR", noPrice = "Contact for pricing") =>
  !cents ? noPrice : new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);

const card: React.CSSProperties = {
  background: "var(--panel)", border: "1px solid var(--hairline)", borderRadius: 16,
  padding: "clamp(14px, 4vw, 20px)", color: "var(--ink)", maxWidth: 560, margin: "0 auto", width: "100%",
};
const chip: React.CSSProperties = {
  display: "inline-block", background: "var(--chip-bg)", color: "var(--accent)",
  borderRadius: 999, padding: "2px 10px", fontSize: 12, marginRight: 6,
};
const link: React.CSSProperties = { color: "var(--accent)", fontWeight: 700, textDecoration: "none" };

function Solution({ s, t }: { s: any; t: AgentMessages }) {
  return (
    <div>
      {s.images?.[0] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s.images[0]} alt="" style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 12, marginBottom: 14 }} />
      )}
      <span style={chip}>{CATEGORY_LABEL[s.category] ?? s.category}</span>
      <h3 style={{ fontSize: 20, fontWeight: 800, margin: "10px 0 4px" }}>{s.title}</h3>
      <p style={{ color: "var(--muted)", fontSize: 14 }}>{s.summary}</p>
      {s.description && <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 8 }}>{s.description}</p>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
        <strong style={{ color: "var(--accent)", fontSize: 18 }}>{fmt(s.price, s.currency, t.contactPrice)}</strong>
        <a style={link} href={`${SITE}/marketplace/${s.slug}`} target="_blank" rel="noopener noreferrer">{t.view}</a>
      </div>
    </div>
  );
}

function RoiChart({ p, t }: { p: any; t: AgentMessages }) {
  const W = 460, H = 200, pad = 30;
  const series: any[] = p.series || [];
  const maxV = Math.max(1, ...series.map((d) => Math.max(d.cost, d.value)));
  const x = (i: number) => pad + (i / Math.max(1, series.length - 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - (v / maxV) * (H - pad * 2);
  const path = (key: string) => series.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(d[key]).toFixed(1)}`).join(" ");
  const net = (p.expectedMonthlyValue - p.monthlyCost) * p.months;
  return (
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 2 }}>{t.roi}{p.solution ? ` — ${p.solution}` : ""}</h3>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 10 }}>
        {fmt(p.monthlyCost * 100, "EUR")}/mo · {fmt(p.expectedMonthlyValue * 100, "EUR")}/mo · {p.months}mo
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
        <path d={path("value")} fill="none" stroke="var(--ok)" strokeWidth={2.5} />
        <path d={path("cost")} fill="none" stroke="var(--danger)" strokeWidth={2.5} />
      </svg>
      <div style={{ display: "flex", gap: 16, fontSize: 13, marginTop: 8 }}>
        <span style={{ color: "var(--ok)" }}>● {t.value}</span>
        <span style={{ color: "var(--danger)" }}>● {t.cost}</span>
        <span style={{ marginLeft: "auto", color: net >= 0 ? "var(--ok)" : "var(--danger)", fontWeight: 700 }}>
          {t.net}: {fmt(net * 100, "EUR")}
        </span>
      </div>
    </div>
  );
}

export function ToolRenderer({ t }: { t: AgentMessages }) {
  const { activeTool, toolParams: p } = useToolStore();
  if (!activeTool) return null;

  let body: React.ReactNode = null;

  if (activeTool === "showSolution") body = <Solution s={p?.solution} t={t} />;
  else if (activeTool === "solutionList")
    body = (
      <div>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>{t.matching}{p?.query ? ` — “${p.query}”` : ""}</h3>
        {(p?.matches || []).length === 0 && <p style={{ color: "var(--muted)" }}>{t.noMatches}</p>}
        {(p?.matches || []).map((m: any) => (
          <a key={m.slug} href={`${SITE}/marketplace/${m.slug}`} target="_blank" rel="noopener noreferrer"
            style={{ display: "block", textDecoration: "none", color: "var(--ink)", borderTop: "1px solid var(--hairline)", padding: "10px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontWeight: 600 }}>{m.title}</span>
              <span style={{ color: "var(--accent)", whiteSpace: "nowrap" }}>{fmt(m.price, m.currency, t.contactPrice)}</span>
            </div>
            <span style={{ color: "var(--muted)", fontSize: 12 }}>{CATEGORY_LABEL[m.category] ?? m.category} · {m.region}</span>
          </a>
        ))}
      </div>
    );
  else if (activeTool === "compareSolutions")
    body = (
      <div>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>{t.comparison}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))", gap: 12 }}>
          {[p?.a, p?.b].map((s: any, i: number) => (
            <div key={i} style={{ background: "var(--surface)", borderRadius: 12, padding: 12 }}>
              <strong>{s?.title}</strong>
              <p style={{ color: "var(--muted)", fontSize: 12, margin: "6px 0" }}>{CATEGORY_LABEL[s?.category] ?? s?.category}</p>
              <p style={{ color: "var(--muted)", fontSize: 13 }}>{s?.summary}</p>
              <p style={{ color: "var(--accent)", marginTop: 8, fontWeight: 700 }}>{fmt(s?.price, s?.currency, t.contactPrice)}</p>
            </div>
          ))}
        </div>
      </div>
    );
  else if (activeTool === "roi") body = <RoiChart p={p} t={t} />;
  else if (activeTool === "demoForm") body = <DemoForm p={p} t={t} />;
  else if (activeTool === "marketInsights")
    body = (
      <div>
        <h3 style={{ fontSize: 18, fontWeight: 800 }}>{t.market}</h3>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 12px" }}>
          {CATEGORY_LABEL[p?.category] ?? p?.category ?? ""}{p?.region ? ` · ${p.region}` : ""}
        </p>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          <div><div style={{ fontSize: 26, fontWeight: 800, color: "var(--accent)" }}>{p?.stats?.count ?? 0}</div><div style={{ color: "var(--muted)", fontSize: 12 }}>{t.count}</div></div>
          <div><div style={{ fontSize: 26, fontWeight: 800 }}>{fmt(p?.stats?.min, p?.stats?.currency, t.contactPrice)}</div><div style={{ color: "var(--muted)", fontSize: 12 }}>{t.from}</div></div>
          <div><div style={{ fontSize: 26, fontWeight: 800 }}>{fmt(p?.stats?.max, p?.stats?.currency, t.contactPrice)}</div><div style={{ color: "var(--muted)", fontSize: 12 }}>{t.upTo}</div></div>
        </div>
      </div>
    );
  else if (activeTool === "requestDemo")
    body = (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>{p?.ok ? "✅" : "📨"}</div>
        <h3 style={{ fontSize: 20, fontWeight: 800 }}>{t.received}</h3>
        <p style={{ color: "var(--muted)", marginTop: 6 }}>{t.thanks.replace("{name}", p?.name ?? "").replace("{email}", p?.email ?? "")}</p>
        {p?.solution && <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>{p.solution}</p>}
      </div>
    );
  else if (activeTool === "reward")
    body = (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🎁</div>
        <h3 style={{ fontSize: 20, fontWeight: 800 }}>{t.reward}</h3>
        <p style={{ color: "var(--muted)", marginTop: 8 }}>
          {t.rewardBody.replace("{d}", String(p?.discountPercent ?? 10)).replace("{c}", String(p?.commissionPercent ?? 15))}
        </p>
        {p?.code && <p style={{ marginTop: 10, fontFamily: "monospace", color: "var(--accent)", fontSize: 18 }}>{p.code}</p>}
        <a style={{ ...link, display: "inline-block", marginTop: 12 }} href={`${SITE}/pricing`} target="_blank" rel="noopener noreferrer">{t.pricing}</a>
      </div>
    );

  return <div style={card}>{body}</div>;
}
