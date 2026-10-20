"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { getUiB } from "@/lib/ui-i18n";

type Key = {
  id: string; name: string; prefix: string; active: boolean;
  lastUsedAt: string | null; createdAt: string; revokedAt: string | null; syncUrl?: string | null;
};

const input = "rounded-lg bg-[color:var(--surface)] border border-[color:var(--hairline)] px-3 py-2 text-sm";

type KL = { syncUrl: string; syncSecret: string; issueKey: string; thKey: string; thLastUsed: string; thStatus: string; revokeConfirm: string; guideTitle: string; authPre: string; step1: string; step2: string; idempotent: string };
const KLD: Record<Locale, KL> = {
  en: { syncUrl: "Sync URL (optional — instant sync)", syncSecret: "Sync secret", issueKey: "Issue key", thKey: "Key", thLastUsed: "Last used", thStatus: "Status", revokeConfirm: 'Revoke the key for "{n}"? That product can no longer validate codes or report sales.', guideTitle: "How another product integrates", authPre: "Authenticate every request with the product key:", step1: "1 · Validate a reseller code", step2: "2 · Report an attributed sale (records commission)", idempotent: "externalId makes reporting idempotent (safe to retry). The reseller earns the configured commission on each reported sale." },
  es: { syncUrl: "URL de sincronización (opcional — sincronización instantánea)", syncSecret: "Secreto de sincronización", issueKey: "Emitir clave", thKey: "Clave", thLastUsed: "Último uso", thStatus: "Estado", revokeConfirm: '¿Revocar la clave de "{n}"? Ese producto ya no podrá validar códigos ni informar ventas.', guideTitle: "Cómo se integra otro producto", authPre: "Autentica cada solicitud con la clave del producto:", step1: "1 · Validar un código de reseller", step2: "2 · Informar una venta atribuida (registra comisión)", idempotent: "externalId hace que el reporte sea idempotente (seguro de reintentar). El reseller gana la comisión configurada en cada venta reportada." },
  fr: { syncUrl: "URL de synchronisation (facultatif — sync instantanée)", syncSecret: "Secret de synchronisation", issueKey: "Émettre une clé", thKey: "Clé", thLastUsed: "Dernière utilisation", thStatus: "Statut", revokeConfirm: 'Révoquer la clé de « {n} » ? Ce produit ne pourra plus valider de codes ni signaler de ventes.', guideTitle: "Comment un autre produit s'intègre", authPre: "Authentifiez chaque requête avec la clé du produit :", step1: "1 · Valider un code revendeur", step2: "2 · Signaler une vente attribuée (enregistre la commission)", idempotent: "externalId rend le rapport idempotent (réessai sans risque). Le revendeur gagne la commission configurée sur chaque vente signalée." },
  
  pt: { syncUrl: "URL de sincronização (opcional — sync instantânea)", syncSecret: "Segredo de sincronização", issueKey: "Emitir chave", thKey: "Chave", thLastUsed: "Último uso", thStatus: "Status", revokeConfirm: 'Revogar a chave de "{n}"? Esse produto não poderá mais validar códigos nem reportar vendas.', guideTitle: "Como outro produto se integra", authPre: "Autentique cada requisição com a chave do produto:", step1: "1 · Validar um código de revendedor", step2: "2 · Reportar uma venda atribuída (registra comissão)", idempotent: "externalId torna o relatório idempotente (seguro para repetir). O revendedor ganha a comissão configurada em cada venda reportada." },

  ar: { syncUrl: "رابط المزامنة (اختياري — مزامنة فورية)", syncSecret: "سرّ المزامنة", issueKey: "إصدار مفتاح", thKey: "المفتاح", thLastUsed: "آخر استخدام", thStatus: "الحالة", revokeConfirm: 'إلغاء مفتاح "{n}"؟ لن يتمكّن هذا المنتج بعد الآن من التحقّق من الرموز أو الإبلاغ عن المبيعات.', guideTitle: "كيف يتكامل منتج آخر", authPre: "وثّق كل طلب بمفتاح المنتج:", step1: "1 · التحقّق من رمز موزّع", step2: "2 · الإبلاغ عن عملية بيع منسوبة (يسجّل العمولة)", idempotent: "يجعل externalId الإبلاغ عديم التأثير عند التكرار (آمن لإعادة المحاولة). يكسب الموزّع العمولة المُهيّأة عن كل عملية بيع مُبلَّغ عنها." }

};

const SYNC: Record<Locale, string> = {
  en: "Instant sync enabled", es: "Sincronización instantánea activada", fr: "Synchronisation instantanée activée",
   pt: "Sincronização instantânea ativada", 
   ar: "المزامنة الفورية مُفعّلة"   
};

export function ProductKeyManager({ keys, baseUrl }: { keys: Key[]; baseUrl: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [syncUrl, setSyncUrl] = useState("");
  const [syncSecret, setSyncSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [loc, setLoc] = useState<Locale>("en");
  useEffect(() => { setLoc((document.cookie.match(/(?:^|; )app_locale=([^;]+)/)?.[1] || "en") as Locale); }, []);
  const L = KLD[loc] ?? KLD.en;
  const uiB = getUiB(loc);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setErr("");
    setNewKey(null);
    const res = await fetch("/api/central/product-keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, syncUrl: syncUrl.trim() || undefined, syncSecret: syncSecret.trim() || undefined })
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (j.success) {
      setNewKey(j.key);
      setName("");
      setSyncUrl("");
      setSyncSecret("");
      router.refresh();
    } else setErr(j.error || uiB.failed);
  }

  async function revoke(id: string, n: string) {
    if (!confirm(L.revokeConfirm.replace("{n}", n))) return;
    await fetch(`/api/central/product-keys/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <form onSubmit={create} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-[color:var(--ink)]/50">{uiB.productName}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. the upstream platform" className={`${input} block mt-1 w-48`} />
        </div>
        <div>
          <label className="text-xs text-[color:var(--ink)]/50">{L.syncUrl}</label>
          <input value={syncUrl} onChange={(e) => setSyncUrl(e.target.value)} placeholder="https://partner-one.example/api/cron/app-reseller-sync" className={`${input} block mt-1 w-72`} />
        </div>
        <div>
          <label className="text-xs text-[color:var(--ink)]/50">{L.syncSecret}</label>
          <input value={syncSecret} onChange={(e) => setSyncSecret(e.target.value)} placeholder="product CRON secret" className={`${input} block mt-1 w-44`} />
        </div>
        <button disabled={busy} className="app-gradient text-[color:var(--on-accent)] font-bold rounded-lg px-4 py-2 text-sm disabled:opacity-40">
          {busy ? "…" : `+ ${L.issueKey}`}
        </button>
        {err && <span className="text-red-300 text-sm">{err}</span>}
      </form>

      {newKey && (
        <div className="panel rounded-xl p-4 border border-[color:var(--accent-text)]/30 text-sm">
          <div className="text-[color:var(--accent-text)] font-semibold mb-1">{uiB.copyKeyOnce}</div>
          <code className="break-all text-[color:var(--accent-text)]">{newKey}</code>
        </div>
      )}

      {keys.length > 0 && (
        <div className="panel rounded-2xl p-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-widest text-[color:var(--ink)]/55">
                <th className="pb-3 pr-4">{uiB.productName}</th>
                <th className="pb-3 pr-4">{L.thKey}</th>
                <th className="pb-3 pr-4">{L.thLastUsed}</th>
                <th className="pb-3 pr-4">{L.thStatus}</th>
                <th className="pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-t border-[color:var(--hairline)]">
                  <td className="py-2.5 pr-4 font-medium">{k.name}{k.syncUrl ? <span className="ml-2 text-[11px] text-[color:var(--accent-text)]" title={SYNC[loc] ?? SYNC.en}>⚡</span> : null}</td>
                  <td className="py-2.5 pr-4 font-mono text-[color:var(--ink)]/50">{k.prefix}…</td>
                  <td className="py-2.5 pr-4 text-[color:var(--ink)]/50">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : uiB.never}</td>
                  <td className="py-2.5 pr-4">
                    {k.active ? <span className="text-emerald-300">{uiB.active}</span> : <span className="text-[color:var(--ink)]/55">{uiB.revoked}</span>}
                  </td>
                  <td className="py-2.5">
                    {k.active && (
                      <button onClick={() => revoke(k.id, k.name)} className="text-xs border border-red-500/40 text-red-300 rounded-lg px-2.5 py-1 hover:bg-red-500/10">
                        {uiB.revoke}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="panel rounded-2xl p-5 text-sm text-[color:var(--ink)]/70 space-y-3">
        <div className="font-semibold text-[color:var(--ink)]">{L.guideTitle}</div>
        <p>{L.authPre} <code className="text-[color:var(--accent-text)]">Authorization: Bearer &lt;key&gt;</code></p>
        <div>
          <div className="text-[color:var(--ink)]/50 text-xs uppercase tracking-widest mb-1">{L.step1}</div>
          <pre className="bg-[color:var(--surface)] rounded-lg p-3 overflow-x-auto text-xs">{`curl "${baseUrl}/api/v1/reseller/validate?code=ABCD1234" \\
  -H "Authorization: Bearer <product key>"`}</pre>
        </div>
        <div>
          <div className="text-[color:var(--ink)]/50 text-xs uppercase tracking-widest mb-1">{L.step2}</div>
          <pre className="bg-[color:var(--surface)] rounded-lg p-3 overflow-x-auto text-xs">{`curl -X POST "${baseUrl}/api/v1/reseller/sales" \\
  -H "Authorization: Bearer <product key>" \\
  -H "content-type: application/json" \\
  -d '{"code":"ABCD1234","amountCents":12000,"currency":"EUR","externalId":"order_123"}'`}</pre>
        </div>
        <p className="text-[color:var(--ink)]/55 text-xs">{L.idempotent}</p>
      </div>
    </div>
  );
}
