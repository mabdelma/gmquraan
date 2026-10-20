import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getVendor } from "@/lib/vendors";
import { SolutionCard } from "@/components/SolutionCard";
import { getLocale } from "@/lib/i18n.server";
import type { Locale } from "@/lib/i18n";
import { getAppMessages } from "@/lib/app-messages";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const v = await getVendor(slug);
  if (!v) return { title: "Vendor not found" };
  return { title: `${v.name} — solutions on Unskinned`, description: `Explore ${v.solutions.length} solution(s) by ${v.name} on the Unskinned marketplace.` };
}

const T: Record<Locale, { by: string; sols: string }> = {
  en: { by: "Solutions by", sols: "solutions" }, es: { by: "Soluciones de", sols: "soluciones" },
  fr: { by: "Solutions de", sols: "solutions" }, 
  pt: { by: "Soluções de", sols: "soluções" }, 
   ar: { by: "حلول من", sols: "حلول" }
    
};

export default async function VendorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const v = await getVendor(slug);
  if (!v) notFound();

  const locale = await getLocale();
  const app = getAppMessages(locale);
  const t = T[locale] ?? T.en;
  const cardT = { catLabels: app.categories, contactPricing: app.detail.contactPricing, featured: app.market.featured, live: app.market.live };

  return (
    <section className="mx-auto max-w-6xl px-5 py-14">
      <Link href="/marketplace" className="text-sm text-[color:var(--ink)]/50 hover:text-[color:var(--ink)]">← {app.market.title}</Link>
      <h1 className="text-3xl md:text-4xl font-extrabold mt-6">{v.name}</h1>
      <p className="text-[color:var(--ink)]/55 mt-2">{t.by} {v.name} · {v.solutions.length} {t.sols}</p>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-10">
        {v.solutions.map((s) => (
          <SolutionCard key={s.id} s={s} t={cardT} />
        ))}
      </div>
    </section>
  );
}
