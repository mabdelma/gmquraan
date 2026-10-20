import type { Metadata } from "next";
import Link from "next/link";
import { listSolutions } from "@/lib/catalog";
import { SolutionCard } from "@/components/SolutionCard";
import { CompareBar } from "@/components/CompareBar";
import { SERVICES } from "@/lib/content";
import { getLocale } from "@/lib/i18n.server";
import { getAppMessages } from "@/lib/app-messages";
import { translateBatch } from "@/lib/translate";

export const metadata: Metadata = {
  title: "Marketplace",
  description: "Browse white-label SaaS, launch kits, AI tools and productized services on the Unskinned marketplace.",
};

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; region?: string }>;
}) {
  const sp = await searchParams;
  const locale = await getLocale();
  const app = getAppMessages(locale);
  const t = app.market;
  const raw = await listSolutions({ q: sp.q, category: sp.category, region: sp.region });

  // Translate the dynamic catalog copy (title + summary) into the selected language.
  const tr = await translateBatch(raw.flatMap((s) => [s.title, s.summary]), locale);
  const solutions = raw.map((s, i) => ({ ...s, title: tr[i * 2], summary: tr[i * 2 + 1] }));

  const categories = [{ key: "", title: t.all }, ...SERVICES.map((s) => ({ key: s.key, title: app.categories[s.key] }))];

  return (
    <section className="mx-auto max-w-6xl px-5 py-14">
      <div className="text-xs font-bold tracking-widest uppercase app-gradient-text mb-3">Marketplace</div>
      <h1 className="text-3xl md:text-4xl font-extrabold">{t.title}</h1>
      <p className="text-[color:var(--ink)]/60 mt-3 max-w-2xl">{t.subtitle}</p>

      <form className="mt-8 flex gap-3" action="/marketplace">
        <input
          name="q"
          defaultValue={sp.q}
          placeholder={t.searchPh}
          className="flex-1 rounded-xl bg-[color:var(--surface)] border border-[color:var(--hairline)] px-4 py-3 text-sm outline-none focus:border-[color:var(--accent-text)]/60"
        />
        {sp.category && <input type="hidden" name="category" value={sp.category} />}
        <button className="app-gradient text-[color:var(--on-accent)] font-bold px-5 rounded-xl">{t.search}</button>
      </form>

      <div className="flex flex-wrap gap-2 mt-5">
        {categories.map((c) => {
          const active = (sp.category || "") === c.key;
          const params = new URLSearchParams();
          if (c.key) params.set("category", c.key);
          if (sp.q) params.set("q", sp.q);
          return (
            <Link
              key={c.key || "all"}
              href={`/marketplace${params.toString() ? `?${params}` : ""}`}
              className={`inline-flex items-center min-h-11 text-xs px-4 rounded-full border transition ${
                active
                  ? "app-gradient text-[color:var(--on-accent)] font-bold border-transparent"
                  : "border-[color:var(--hairline)] text-[color:var(--ink)]/70 hover:border-[color:var(--hairline)]"
              }`}
            >
              {c.title}
            </Link>
          );
        })}
      </div>

      {solutions.length === 0 ? (
        <div className="panel rounded-2xl p-12 mt-10 text-center text-[color:var(--ink)]/50">
          {t.empty}{" "}
          <Link href="/contact" className="text-[color:var(--accent-text)]">
            {t.emptyCta}
          </Link>
          .
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
          {solutions.map((s) => (
            <SolutionCard
              key={s.id}
              s={s}
              t={{ catLabels: app.categories, contactPricing: app.detail.contactPricing, featured: t.featured, live: t.live }}
            />
          ))}
        </div>
      )}
      {solutions.length >= 2 && <CompareBar items={solutions.map((s) => ({ slug: s.slug, title: s.title }))} locale={locale} />}
    </section>
  );
}
