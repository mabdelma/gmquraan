"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

const L: Record<Locale, { open: string; pick: string; compare: string; clear: string }> = {
  en: { open: "Compare", pick: "Select up to 4 to compare", compare: "Compare", clear: "Clear" },
  es: { open: "Comparar", pick: "Selecciona hasta 4 para comparar", compare: "Comparar", clear: "Limpiar" },
  fr: { open: "Comparer", pick: "Sélectionnez jusqu'à 4", compare: "Comparer", clear: "Effacer" },
  
  pt: { open: "Comparar", pick: "Selecione até 4 para comparar", compare: "Comparar", clear: "Limpar" },

  ar: { open: "قارن", pick: "اختر حتى 4 للمقارنة", compare: "قارن", clear: "مسح" }

  
};

export function CompareBar({ items, locale = "en" }: { items: { slug: string; title: string }[]; locale?: Locale }) {
  const router = useRouter();
  const t = L[locale] ?? L.en;
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<string[]>([]);

  function toggle(slug: string) {
    setSel((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : prev.length >= 4 ? prev : [...prev, slug]));
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed app-fab app-fab-r z-40 app-gradient text-[color:var(--on-accent)] font-bold rounded-full px-5 py-3 shadow-lg text-sm"
      >
        ⇄ {t.open}{sel.length > 0 ? ` (${sel.length})` : ""}
      </button>

      {open && (
        <div className="fixed app-panel-lo app-fab-r z-40 w-80 max-w-[92vw] panel rounded-2xl border border-[color:var(--hairline)] shadow-xl p-4">
          <div className="text-xs text-[color:var(--ink)]/50 mb-2">{t.pick}</div>
          <div className="max-h-72 overflow-y-auto space-y-1">
            {items.map((it) => {
              const checked = sel.includes(it.slug);
              const disabled = !checked && sel.length >= 4;
              return (
                <label key={it.slug} className={`flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg cursor-pointer ${disabled ? "opacity-40" : "hover:bg-[color:var(--overlay)]"}`}>
                  <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggle(it.slug)} />
                  <span className="truncate">{it.title}</span>
                </label>
              );
            })}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => router.push(`/compare?slugs=${sel.join(",")}`)}
              disabled={sel.length < 2}
              className="app-gradient text-[color:var(--on-accent)] font-bold rounded-lg px-4 py-2 text-sm disabled:opacity-40"
            >
              {t.compare}
            </button>
            {sel.length > 0 && <button onClick={() => setSel([])} className="text-xs text-[color:var(--ink)]/50 hover:text-[color:var(--ink)]">{t.clear}</button>}
          </div>
        </div>
      )}
    </>
  );
}
