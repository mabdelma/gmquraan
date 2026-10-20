import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getLicenceActivity, LICENCE_ENTITIES } from "@/lib/licence-activities";
import { getLocale } from "@/lib/i18n.server";
import { t as pick, type Bi } from "@/lib/brand-content";
import { translateBatch } from "@/lib/translate";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = getLicenceActivity(slug);
  if (!a) return { title: "Activity not found" };
  return { title: `${a.title} · Registration & Activities`, description: a.description };
}

const UI = {
  back: { ar: "التسجيل والأنشطة", en: "Registration & activities", es: "Registro y actividades", pt: "Registo e atividades", fr: "Enregistrement et activités" } as Bi,
  scope: { ar: "نطاق النشاط", en: "Scope", es: "Alcance", pt: "Âmbito", fr: "Périmètre" } as Bi,
  opps: { ar: "ما يتيحه هذا النشاط", en: "What this activity allows", es: "Qué permite esta actividad", pt: "O que esta atividade permite", fr: "Ce que cette activité permet" } as Bi,
  all: { ar: "جميع الأنشطة", en: "All activities", es: "Todas las actividades", pt: "Todas as atividades", fr: "Toutes les activités" } as Bi,
  discuss: { ar: "ناقش مشروعاً", en: "Discuss a project", es: "Hablemos de su proyecto", pt: "Vamos falar do seu projeto", fr: "Discuter d'un projet" } as Bi,
};

export default async function LicenceActivityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = getLicenceActivity(slug);
  if (!a) notFound();
  const meta = LICENCE_ENTITIES[a.entity];
  const locale = await getLocale();
  const title = locale === "ar" ? a.titleAr : a.title;

  // Description, scope items and opportunities are authored in English only.
  // Translating them at render time keeps this page as localised as the rest
  // of the site instead of dropping to English below the heading. One batch,
  // so it is a single call rather than one per bullet.
  const src = [a.description, ...a.items.flatMap((i) => [i.name, i.detail]), ...a.opportunities];
  const out = locale === "en" ? src : await translateBatch(src, locale);
  const description = out[0];
  const items = a.items.map((_, k) => ({ name: out[1 + k * 2], detail: out[2 + k * 2] }));
  const opportunities = out.slice(1 + a.items.length * 2);

  return (
    <section className="mx-auto max-w-4xl px-5 py-14">
      <Link href="/licence" className="text-sm text-[color:var(--ink)]/50 hover:text-[color:var(--ink)]">
        ← {pick(UI.back, locale)}
      </Link>

      <div className="mt-5 flex items-center gap-2 flex-wrap text-xs">
        <span className="px-2.5 py-1 rounded-full border border-[color:var(--hairline)] text-[color:var(--ink)]/70">
          {meta.flag} {meta.label}
        </span>
      </div>

      <h1 className="text-3xl md:text-4xl font-extrabold mt-4">{title}</h1>
      <p className="text-[color:var(--ink)]/70 mt-4 leading-relaxed">{description}</p>

      <h2 className="font-bold text-lg mt-12 mb-4">
        {pick(UI.scope, locale)}{" "}
        <span className="text-[color:var(--ink)]/40 font-normal">({a.items.length})</span>
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((it, k) => (
          <div key={k} className="panel rounded-xl p-4">
            <div className="font-semibold text-[color:var(--ink)]/90 text-sm">{it.name}</div>
            <p className="text-[color:var(--ink)]/60 text-sm mt-1.5 leading-relaxed">{it.detail}</p>
          </div>
        ))}
      </div>

      <h2 className="font-bold text-lg mt-12 mb-4">{pick(UI.opps, locale)}</h2>
      <ul className="space-y-3">
        {opportunities.map((o, k) => (
          <li
            key={k}
            className="panel rounded-xl p-4 text-sm text-[color:var(--ink)]/70 leading-relaxed border-l-2 border-[color:var(--accent-text)]/40"
          >
            {o}
          </li>
        ))}
      </ul>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link
          href="/licence"
          className="border border-[color:var(--hairline)] px-5 py-2.5 rounded-xl text-sm hover:bg-[color:var(--overlay)]"
        >
          ← {pick(UI.all, locale)}
        </Link>
        <Link href="/contact" className="app-gradient text-[color:var(--on-accent)] font-bold px-5 py-2.5 rounded-xl text-sm">
          {pick(UI.discuss, locale)}
        </Link>
      </div>
    </section>
  );
}
