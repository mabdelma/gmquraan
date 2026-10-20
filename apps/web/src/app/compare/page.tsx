import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@app/db";
import { categoryLabel, licenseLabel, formatPrice } from "@/lib/format";
import { getLocale } from "@/lib/i18n.server";
import type { Locale } from "@/lib/i18n";
import { getAppMessages } from "@/lib/app-messages";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Compare solutions" };

const T: Record<Locale, Record<string, string>> = {
  en: { h1: "Compare solutions", empty: "Pick solutions from the marketplace to compare.", price: "Price", category: "Category", license: "License", region: "Region", whiteLabel: "White-label", yes: "Yes", no: "No", view: "View", back: "Marketplace" },
  es: { h1: "Comparar soluciones", empty: "Elige soluciones del marketplace para comparar.", price: "Precio", category: "Categoría", license: "Licencia", region: "Región", whiteLabel: "Marca blanca", yes: "Sí", no: "No", view: "Ver", back: "Marketplace" },
  fr: { h1: "Comparer les solutions", empty: "Choisissez des solutions à comparer.", price: "Prix", category: "Catégorie", license: "Licence", region: "Région", whiteLabel: "Marque blanche", yes: "Oui", no: "Non", view: "Voir", back: "Marketplace" },
  
  pt: { h1: "Comparar soluções", empty: "Escolha soluções para comparar.", price: "Preço", category: "Categoria", license: "Licença", region: "Região", whiteLabel: "Marca branca", yes: "Sim", no: "Não", view: "Ver", back: "Marketplace" },

  ar: { h1: "قارن الحلول", empty: "اختر حلولًا للمقارنة.", price: "السعر", category: "الفئة", license: "الترخيص", region: "المنطقة", whiteLabel: "علامة بيضاء", yes: "نعم", no: "لا", view: "عرض", back: "السوق" }

  
};

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ slugs?: string }> }) {
  const sp = await searchParams;
  const slugs = (sp.slugs || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4);
  const locale = await getLocale();
  const app = getAppMessages(locale);
  const t = T[locale] ?? T.en;

  const solutions = slugs.length
    ? await prisma.solution.findMany({ where: { slug: { in: slugs }, published: true } })
    : [];
  // preserve requested order
  const ordered = slugs.map((s) => solutions.find((x) => x.slug === s)).filter(Boolean) as typeof solutions;

  return (
    <section className="mx-auto max-w-6xl px-5 py-14">
      <Link href="/marketplace" className="inline-flex items-center min-h-11 text-sm text-[color:var(--ink)]/50 hover:text-[color:var(--ink)]">← {t.back}</Link>
      <h1 className="text-3xl font-extrabold mt-6">{t.h1}</h1>

      {ordered.length === 0 ? (
        <p className="text-[color:var(--ink)]/55 mt-10 panel rounded-2xl p-10 text-center">{t.empty}</p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[600px]">
            <thead>
              <tr>
                <th className="text-left p-3 w-32"><span className="sr-only">{t.h1}</span></th>
                {ordered.map((s) => (
                  <th key={s.id} scope="col" className="text-left p-3 align-bottom">
                    <div className="font-bold text-base">{s.title}</div>
                    <Link href={`/marketplace/${s.slug}`} className="text-xs text-[color:var(--accent-text)] hover:underline">{t.view} →</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                [t.price, (s: (typeof ordered)[number]) => formatPrice(s.price, s.currency, app.detail.contactPricing)],
                [t.category, (s: (typeof ordered)[number]) => categoryLabel(s.category, app.categories)],
                [t.license, (s: (typeof ordered)[number]) => licenseLabel(s.licenseModel, app.licenses)],
                [t.region, (s: (typeof ordered)[number]) => s.region],
                [t.whiteLabel, (s: (typeof ordered)[number]) => (s.whiteLabel ? t.yes : t.no)],
                ["", (s: (typeof ordered)[number]) => s.summary]
              ].map(([label, fn], i) => (
                <tr key={i} className="border-t border-[color:var(--hairline)]">
                  <th scope="row" className="p-3 text-[color:var(--ink)]/50 align-top text-left font-normal">{label as string}</th>
                  {ordered.map((s) => (
                    <td key={s.id} className="p-3 align-top">{(fn as (x: typeof s) => string)(s)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
