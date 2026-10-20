"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

type CT = { title: string; subtitle: string; label: string; hint: string; save: string; saving: string; saved: string; invalid: string };
const D: Record<Locale, CT> = {
  en: { title: "WhatsApp contact", subtitle: "Number behind the floating WhatsApp button on public pages.", label: "WhatsApp number", hint: "Digits only, with country code — e.g. 15555550107 (the + is added automatically).", save: "Save", saving: "Saving…", saved: "Saved ✓", invalid: "Enter a valid number (digits only)." },
  es: { title: "Contacto de WhatsApp", subtitle: "Número del botón flotante de WhatsApp en las páginas públicas.", label: "Número de WhatsApp", hint: "Solo dígitos, con código de país — p. ej. 15555550107 (el + se añade automáticamente).", save: "Guardar", saving: "Guardando…", saved: "Guardado ✓", invalid: "Introduce un número válido (solo dígitos)." },
  fr: { title: "Contact WhatsApp", subtitle: "Numéro du bouton WhatsApp flottant sur les pages publiques.", label: "Numéro WhatsApp", hint: "Chiffres uniquement, avec indicatif — ex. 15555550107 (le + est ajouté automatiquement).", save: "Enregistrer", saving: "Enregistrement…", saved: "Enregistré ✓", invalid: "Saisissez un numéro valide (chiffres uniquement)." },
  
  pt: { title: "Contato do WhatsApp", subtitle: "Número do botão flutuante do WhatsApp nas páginas públicas.", label: "Número do WhatsApp", hint: "Somente dígitos, com código do país — ex. 15555550107 (o + é adicionado automaticamente).", save: "Salvar", saving: "Salvando…", saved: "Salvo ✓", invalid: "Insira um número válido (somente dígitos)." },

  ar: { title: "جهة اتصال واتساب", subtitle: "رقم زر واتساب العائم في الصفحات العامة.", label: "رقم واتساب", hint: "أرقام فقط، مع رمز الدولة — مثل 15555550107 (تُضاف + تلقائيًا).", save: "حفظ", saving: "جارٍ الحفظ…", saved: "تم الحفظ ✓", invalid: "أدخل رقمًا صحيحًا (أرقام فقط)." }

  
};

const input = "w-full rounded-xl bg-[color:var(--surface)] border border-[color:var(--hairline)] px-3 py-2 text-sm outline-none focus:border-[color:var(--accent-text)]/60";

export function ContactSettingsForm({ initial, locale = "en" }: { initial: string; locale?: Locale }) {
  const router = useRouter();
  const t = D[locale] ?? D.en;
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const digits = value.replace(/[^0-9]/g, "");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setDone(false);
    setErr("");
    const res = await fetch("/api/central/settings/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ whatsapp: digits })
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && j.success) {
      setDone(true);
      router.refresh();
    } else setErr(j.error || t.invalid);
  }

  return (
    <form onSubmit={onSubmit} className="panel rounded-2xl p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold">{t.title}</h2>
        <p className="text-[color:var(--ink)]/50 text-sm mt-1">{t.subtitle}</p>
      </div>
      <div>
        <label className="text-xs text-[color:var(--ink)]/50">{t.label}</label>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[color:var(--ink)]/40 text-sm">+</span>
          <input
            value={value}
            onChange={(e) => { setValue(e.target.value); setDone(false); }}
            inputMode="numeric"
            placeholder="15555550107"
            className={input}
          />
        </div>
        <p className="text-[color:var(--ink)]/40 text-xs mt-1">{t.hint}</p>
        {digits.length >= 6 && (
          <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer" className="text-[color:var(--accent-text)] text-xs mt-1 inline-block hover:underline">
            wa.me/{digits}
          </a>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button disabled={busy || digits.length < 6} className="app-gradient text-[color:var(--on-accent)] font-bold rounded-lg px-4 py-2 text-sm disabled:opacity-40">
          {busy ? t.saving : t.save}
        </button>
        {done && <span className="text-emerald-300 text-sm">{t.saved}</span>}
        {err && <span className="text-red-300 text-sm">{err}</span>}
      </div>
    </form>
  );
}
