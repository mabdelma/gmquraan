import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "@/lib/i18n.server";
import { getPublishedVacancies } from "@/lib/vacancies";
import { Ornament } from "@/components/brand/sections";
import { PAGE_META, localeMeta, SECTIONS, t, type Bi } from "@/lib/brand-content";
import { COMPANY } from "@/lib/content";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  return localeMeta("careers", await getLocale());
}

const UI = {
  eyebrow: { ar: "الوظائف", en: "Careers", es: "Empleo", pt: "Carreiras", fr: "Carrières" } as Bi,
  read: { ar: "اعرف المزيد", en: "View role", es: "Ver puesto", pt: "Ver vaga", fr: "Voir le poste" } as Bi,
  apply: { ar: "أرسل سيرتك الذاتية", en: "Send your CV", es: "Envíe su CV", pt: "Envie o seu CV", fr: "Envoyez votre CV" } as Bi,
  emptyTitle: { ar: "لا توجد وظائف شاغرة حالياً", en: "No open positions right now", es: "No hay vacantes en este momento", pt: "Não há vagas abertas de momento", fr: "Aucun poste à pourvoir actuellement" } as Bi,
  emptyBody: {
    ar: "لا نعلن عن وظائف في الوقت الحالي. إن كنت ترى أن خبرتك تناسبنا، راسلنا وسنحتفظ بطلبك.",
    en: "We are not advertising roles at the moment. If you believe your experience fits, write to us and we will keep your details on file.", es: "En este momento no publicamos vacantes. Si cree que su experiencia encaja, escríbanos y conservaremos sus datos.", pt: "De momento não estamos a publicar vagas. Se considera que a sua experiência se enquadra, escreva-nos e guardaremos os seus dados.", fr: "Nous ne publions pas d'offres pour le moment. Si vous pensez que votre profil correspond, écrivez-nous et nous conserverons vos coordonnées.",
  } as Bi,
  write: { ar: "راسلنا", en: "Write to us", es: "Escríbanos", pt: "Escreva-nos", fr: "Écrivez-nous" } as Bi,
};

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

/**
 * Careers.
 *
 * Reads the Vacancy model (authored at /central/vacancies). Nothing is
 * seeded, so until the first opening is published the page states the
 * position honestly and gives a real address to write to.
 */
export default async function CareersPage() {
  const locale = await getLocale();
  const vacancies = await getPublishedVacancies().catch(() => []);

  return (
    <>
      <section className="border-b border-[color:var(--accent)]/20 bg-[#0c3433] text-white">
        <div className="mx-auto max-w-6xl px-5 py-14 text-center">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--accent)]">
            {t(UI.eyebrow, locale)}
          </div>
          <h1 className="mt-4 text-3xl font-bold md:text-4xl">{t(SECTIONS.careersTitle, locale)}</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/70">
            {t(SECTIONS.careersBody, locale)}
          </p>
          <Ornament className="mx-auto mt-6 max-w-xs" />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16">
        {vacancies.length === 0 ? (
          <div className="mx-auto max-w-lg rounded-xl border border-[color:var(--hairline)] bg-[color:var(--panel)] p-10 text-center">
            <span className="mx-auto block size-2 rotate-45 bg-[color:var(--accent)]" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-bold">{t(UI.emptyTitle, locale)}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[color:var(--ink)]/65">{t(UI.emptyBody, locale)}</p>
            <Link
              href={`mailto:${COMPANY.email}`}
              className="mt-6 inline-block rounded-xl bg-[color:var(--accent)] px-6 py-3 text-sm font-bold text-[color:var(--on-accent)] transition hover:opacity-90"
            >
              {t(UI.write, locale)}
            </Link>
          </div>
        ) : (
          <>
            <div className="grid auto-rows-fr gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {vacancies.map((v) => (
                <article
                  key={v.slug}
                  className="app-reveal flex flex-col overflow-hidden rounded-xl border border-[color:var(--hairline)] bg-[color:var(--panel)]"
                >
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/10 px-2.5 py-0.5 font-semibold text-[color:var(--accent-text)]">
                        {t(TYPE[v.type] ?? TYPE.FULL_TIME, locale)}
                      </span>
                      <span className="text-[color:var(--ink)]/50">
                        {t(WORK[v.workMode] ?? WORK.ON_SITE, locale)} · {v.location}
                      </span>
                    </div>
                    <h2 className="mt-3 text-lg font-bold leading-snug">{v.title}</h2>
                    {v.department && <div className="mt-1 text-xs font-semibold text-[color:var(--accent-text)]">{v.department}</div>}
                    <p className="mt-2 flex-1 text-sm text-[color:var(--ink)]/65">{v.summary}</p>
                    <Link href={`/careers/${v.slug}`} className="mt-4 text-sm font-semibold text-[color:var(--accent-text)] hover:underline">
                      {t(UI.read, locale)} <span aria-hidden="true">›</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
            <p className="mt-12 text-center text-sm text-[color:var(--ink)]/60">
              {t(UI.apply, locale)}{" "}
              <a href={`mailto:${COMPANY.email}`} className="text-[color:var(--accent-text)] hover:underline" dir="ltr">
                {COMPANY.email}
              </a>
            </p>
          </>
        )}
      </section>
    </>
  );
}
