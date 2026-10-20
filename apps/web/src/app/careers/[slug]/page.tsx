import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale } from "@/lib/i18n.server";
import { getVacancyBySlug } from "@/lib/vacancies";
import { Ornament } from "@/components/brand/sections";
import { t, type Bi } from "@/lib/brand-content";
import { COMPANY } from "@/lib/content";

export const dynamic = "force-dynamic";

const WORK: Record<string, Bi> = {
  ON_SITE: { ar: "حضوري", en: "On-site", es: "Presencial", pt: "Presencial", fr: "Sur site" },
  REMOTE: { ar: "عن بُعد", en: "Remote", es: "En remoto", pt: "Remoto", fr: "À distance" },
  HYBRID: { ar: "هجين", en: "Hybrid", es: "Híbrido", pt: "Híbrido", fr: "Hybride" },
};

const TYPE: Record<string, Bi> = {
  FULL_TIME: { ar: "دوام كامل", en: "Full-time", es: "Jornada completa", pt: "Tempo inteiro", fr: "Temps plein" },
  PART_TIME: { ar: "دوام جزئي", en: "Part-time", es: "Jornada parcial", pt: "Tempo parcial", fr: "Temps partiel" },
  CONTRACT: { ar: "تعاقد", en: "Contract", es: "Contrato", pt: "Contrato", fr: "Contrat" },
  INTERNSHIP: { ar: "تدريب", en: "Internship", es: "Prácticas", pt: "Estágio", fr: "Stage" },
};

const BACK: Bi = { ar: "الوظائف", en: "Careers", es: "Empleo", pt: "Carreiras", fr: "Carrières" };
const APPLY: Bi = { ar: "أرسل سيرتك الذاتية", en: "Apply by email", es: "Postular por correo", pt: "Candidatar-se por e-mail", fr: "Postuler par e-mail" };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const vacancy = await getVacancyBySlug(slug);
  if (!vacancy) return { title: "Vacancy not found" };
  return {
    title: `${vacancy.title} — ${vacancy.location}`,
    description: vacancy.summary,
    openGraph: { title: vacancy.title, description: vacancy.summary, type: "article" },
  };
}

export default async function VacancyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vacancy = await getVacancyBySlug(slug);
  if (!vacancy) notFound();
  const locale = await getLocale();

  return (
    <article>
      <section className="border-b border-[color:var(--accent)]/20 bg-[#0c3433] text-white">
        <div className="mx-auto max-w-3xl px-5 py-14 text-center">
          <Link href="/careers" className="text-sm text-white/60 hover:text-white">← {t(BACK, locale)}</Link>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs flex-wrap">
            <span className="rounded-full border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/10 px-2.5 py-0.5 font-semibold text-[color:var(--accent-text)]">
              {t(TYPE[vacancy.type] ?? TYPE.FULL_TIME, locale)}
            </span>
            <span className="text-white/60">
              {t(WORK[vacancy.workMode] ?? WORK.ON_SITE, locale)} · {vacancy.location}
            </span>
            {vacancy.department && <span className="text-white/60">{vacancy.department}</span>}
          </div>
          <h1 className="mt-4 text-3xl font-bold md:text-4xl">{vacancy.title}</h1>
          {vacancy.publishedAt && <div className="mt-3 text-sm text-white/60">{new Date(vacancy.publishedAt).toLocaleDateString(locale)}</div>}
          <Ornament className="mx-auto mt-6 max-w-xs" />
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-14">
        <p className="text-lg leading-relaxed text-[color:var(--ink)]/85">{vacancy.summary}</p>
        <div className="prose prose-invert max-w-none mt-6 text-[color:var(--ink)]/80 whitespace-pre-line leading-relaxed">{vacancy.body}</div>
        <div className="mt-10 rounded-xl border border-[color:var(--hairline)] bg-[color:var(--panel)] p-6 text-center">
          <a
            href={`mailto:${COMPANY.email}?subject=${encodeURIComponent(`Application: ${vacancy.title}`)}`}
            className="inline-block rounded-xl bg-[color:var(--accent)] px-6 py-3 text-sm font-bold text-[color:var(--on-accent)] transition hover:opacity-90"
          >
            {t(APPLY, locale)}
          </a>
          <p className="mt-3 text-xs text-[color:var(--ink)]/55" dir="ltr">{COMPANY.email}</p>
        </div>
      </section>
    </article>
  );
}
