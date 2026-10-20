"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import type { Locale } from "@/lib/i18n";
import { getUiB } from "@/lib/ui-i18n";
import { BrandLogo } from "./BrandLogo";
import { COMPANY } from "@/lib/content";

type T = { title: string; subtitle: string; email: string; password: string; signIn: string; signingIn: string };
const DEF: T = { title: "Staff sign in", subtitle: "Restricted — administrators only.", email: "Admin email", password: "Password", signIn: "Sign in to console", signingIn: "Signing in…" };

const TWO_FA_LABEL: Record<string, string> = {
  en: "2FA code (from your authenticator app)", es: "Código 2FA (de tu app de autenticación)", fr: "Code 2FA (de votre app d'authentification)",
   pt: "Código 2FA (do seu app autenticador)", 
   ar: "رمز 2FA (من تطبيق المصادقة)" 
   
};

export function CentralLoginForm({ t = DEF, locale = "en" }: { t?: T; locale?: Locale }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [need2fa, setNeed2fa] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch("/api/central/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    setLoading(false);
    if (json.success) { router.refresh(); return; }
    if (json.need2fa) setNeed2fa(true);
    setError(json.error || getUiB(locale).failed);
  }

  const input =
    "w-full rounded-xl bg-[color:var(--surface)] border border-[color:var(--hairline)] px-4 py-3 text-sm outline-none focus:border-[color:var(--accent-text)]/60";

  return (
    <div className="mx-auto max-w-md px-5 py-24">
      <div className="flex items-center justify-center gap-2 font-extrabold text-lg mb-8">
        <BrandLogo h={32} alt="" />
        <span>
          <span className="app-gradient-text">{COMPANY.wordmarkLead}</span> · Central
        </span>
      </div>
      <div className="flex justify-center mb-4">
        <LanguageSwitcher current={locale} />
      </div>
      <div className="panel rounded-2xl p-8">
        <h1 className="text-2xl font-extrabold">{t.title}</h1>
        <p className="text-[color:var(--ink)]/60 text-sm mt-2">{t.subtitle}</p>
        <form onSubmit={onSubmit} className="space-y-4 mt-6">
          <input name="email" type="email" required placeholder={t.email} className={input} />
          <input name="password" type="password" required placeholder={t.password} className={input} />
          {need2fa && (
            <input name="code" inputMode="numeric" autoComplete="one-time-code" required placeholder={TWO_FA_LABEL[locale] || TWO_FA_LABEL.en} className={input} autoFocus />
          )}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="app-gradient text-[color:var(--on-accent)] font-bold w-full py-3 rounded-xl disabled:opacity-50"
          >
            {loading ? t.signingIn : t.signIn}
          </button>
        </form>
      </div>
    </div>
  );
}
