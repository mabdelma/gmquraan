"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

type TF = {
  title: string; descOff: string; descOn: string; enable: string; setupHint: string;
  secretLabel: string; codeLabel: string; confirm: string; confirming: string;
  disable: string; disabling: string; on: string; invalid: string;
};
const D: Record<Locale, TF> = {
  en: { title: "Two-factor authentication (2FA)", descOff: "Protect the console with a time-based code from an authenticator app.", descOn: "2FA is on — you'll enter a code from your authenticator app at sign-in.", enable: "Enable 2FA", setupHint: "Add this key to your authenticator app (Google Authenticator, Authy, 1Password), then enter the 6-digit code to confirm.", secretLabel: "Setup key", codeLabel: "6-digit code", confirm: "Confirm & enable", confirming: "Confirming…", disable: "Disable 2FA", disabling: "Disabling…", on: "Enabled ✓", invalid: "Invalid code — try again." },
  es: { title: "Autenticación en dos pasos (2FA)", descOff: "Protege la consola con un código temporal de una app de autenticación.", descOn: "2FA activo — introducirás un código de tu app al iniciar sesión.", enable: "Activar 2FA", setupHint: "Añade esta clave a tu app de autenticación y luego introduce el código de 6 dígitos.", secretLabel: "Clave de configuración", codeLabel: "Código de 6 dígitos", confirm: "Confirmar y activar", confirming: "Confirmando…", disable: "Desactivar 2FA", disabling: "Desactivando…", on: "Activado ✓", invalid: "Código inválido — inténtalo de nuevo." },
  fr: { title: "Authentification à deux facteurs (2FA)", descOff: "Protégez la console avec un code temporaire d'une app d'authentification.", descOn: "2FA activé — vous saisirez un code de votre app à la connexion.", enable: "Activer la 2FA", setupHint: "Ajoutez cette clé à votre app d'authentification, puis saisissez le code à 6 chiffres.", secretLabel: "Clé de configuration", codeLabel: "Code à 6 chiffres", confirm: "Confirmer et activer", confirming: "Confirmation…", disable: "Désactiver la 2FA", disabling: "Désactivation…", on: "Activé ✓", invalid: "Code invalide — réessayez." },
  
  pt: { title: "Autenticação de dois fatores (2FA)", descOff: "Proteja o console com um código temporário de um app autenticador.", descOn: "2FA ativo — você inserirá um código do seu app ao entrar.", enable: "Ativar 2FA", setupHint: "Adicione esta chave ao seu app autenticador e insira o código de 6 dígitos.", secretLabel: "Chave de configuração", codeLabel: "Código de 6 dígitos", confirm: "Confirmar e ativar", confirming: "Confirmando…", disable: "Desativar 2FA", disabling: "Desativando…", on: "Ativado ✓", invalid: "Código inválido — tente novamente." },

  ar: { title: "المصادقة الثنائية (2FA)", descOff: "احمِ لوحة التحكم برمز زمني من تطبيق مصادقة.", descOn: "2FA مفعّلة — ستُدخل رمزًا من تطبيقك عند تسجيل الدخول.", enable: "تفعيل 2FA", setupHint: "أضف هذا المفتاح إلى تطبيق المصادقة ثم أدخل الرمز المكوّن من 6 أرقام.", secretLabel: "مفتاح الإعداد", codeLabel: "رمز من 6 أرقام", confirm: "تأكيد وتفعيل", confirming: "جارٍ التأكيد…", disable: "تعطيل 2FA", disabling: "جارٍ التعطيل…", on: "مفعّل ✓", invalid: "رمز غير صحيح — حاول مجددًا." }

  
};

const input = "w-full rounded-xl bg-[color:var(--surface)] border border-[color:var(--hairline)] px-3 py-2 text-sm outline-none focus:border-[color:var(--accent-text)]/60";

export function CentralTwoFactor({ enabled, locale = "en" }: { enabled: boolean; locale?: Locale }) {
  const router = useRouter();
  const t = D[locale] ?? D.en;
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function post(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true); setErr("");
    const res = await fetch("/api/central/2fa", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, ...extra })
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    return { ok: res.ok && j.success, j };
  }

  async function startSetup() {
    const { ok, j } = await post("setup");
    if (ok) setSecret(j.secret);
  }
  async function confirmEnable() {
    const { ok } = await post("enable", { code });
    if (ok) { setSecret(null); setCode(""); router.refresh(); } else setErr(t.invalid);
  }
  async function disable() {
    const { ok } = await post("disable", { code });
    if (ok) { setCode(""); router.refresh(); } else setErr(t.invalid);
  }

  return (
    <div className="panel rounded-2xl p-6 space-y-3">
      <h2 className="text-lg font-bold">{t.title}</h2>
      <p className="text-[color:var(--ink)]/50 text-sm">{enabled ? t.descOn : t.descOff}</p>

      {enabled ? (
        <div className="space-y-2">
          <span className="text-emerald-300 text-sm">{t.on}</span>
          <div className="flex flex-wrap items-center gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" placeholder={t.codeLabel} className={`${input} w-40`} />
            <button onClick={disable} disabled={busy || code.length < 6} className="border border-red-500/40 text-red-300 rounded-lg px-4 py-2 text-sm hover:bg-red-500/10 disabled:opacity-40">
              {busy ? t.disabling : t.disable}
            </button>
          </div>
        </div>
      ) : secret ? (
        <div className="space-y-3">
          <p className="text-[color:var(--ink)]/60 text-xs">{t.setupHint}</p>
          <div>
            <div className="text-xs text-[color:var(--ink)]/50">{t.secretLabel}</div>
            <code className="block bg-[color:var(--surface)] border border-[color:var(--hairline)] rounded-lg px-3 py-2 text-sm break-all font-mono text-[color:var(--accent-text)]">{secret}</code>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" placeholder={t.codeLabel} className={`${input} w-40`} autoFocus />
            <button onClick={confirmEnable} disabled={busy || code.length < 6} className="app-gradient text-[color:var(--on-accent)] font-bold rounded-lg px-4 py-2 text-sm disabled:opacity-40">
              {busy ? t.confirming : t.confirm}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={startSetup} disabled={busy} className="app-gradient text-[color:var(--on-accent)] font-bold rounded-lg px-4 py-2 text-sm disabled:opacity-40">
          {t.enable}
        </button>
      )}
      {err && <p className="text-red-300 text-sm">{err}</p>}
    </div>
  );
}
