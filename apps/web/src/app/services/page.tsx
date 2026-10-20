import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/Section";
import { ACTIVITIES, OPERATING_MODEL, REGISTRATION, SERVICES } from "@/lib/content";
import { getLocale } from "@/lib/i18n.server";
import { PAGE_META, localeMeta, PRACTICE_AREAS, SECTIONS, SERVICE_ITEMS, t as pick, type Bi } from "@/lib/brand-content";
import { PRACTICE_ICON } from "@/components/brand/icons";
import { getMessages } from "@/lib/messages";

export async function generateMetadata(): Promise<Metadata> {
  return localeMeta("services", await getLocale());
}

const UI = {
  eyebrow: { ar: "خدماتنا", en: "Our services", es: "Nuestros servicios", pt: "Os nossos serviços", fr: "Nos services" } as Bi,
  title: { ar: "ستة مجالات عمل، مكتب واحد", en: "Six practice areas, one office", es: "Seis áreas de trabajo, una oficina", pt: "Seis áreas de atuação, um gabinete", fr: "Six domaines, un seul bureau" } as Bi,
  subtitle: {
    ar: "من الفكرة التصميمية حتى التسليم، عبر مكاتب هندسية مقيّدة — دون تسليم المشروع بين جهات لم تتشارك لوحة واحدة.",
    en: "From first concept to handover, through registered engineering offices — without passing a project between firms that have never shared a drawing set.", es: "Del primer concepto a la entrega, a través de oficinas de ingeniería registradas, sin pasar el proyecto entre empresas que nunca compartieron un plano.", pt: "Do primeiro conceito à entrega, através de gabinetes de engenharia registados — sem passar a obra entre empresas que nunca partilharam um desenho.", fr: "Du premier concept à la réception, via des bureaux d'études enregistrés — sans faire passer un projet entre des entreprises qui n'ont jamais partagé un plan.",
  } as Bi,
  /** The line-by-line inventory under each group's blurb. */
  includes: { ar: "يشمل", en: "Includes", es: "Incluye", pt: "Inclui", fr: "Comprend" } as Bi,
  approachEyebrow: { ar: "كيف نعمل", en: "How we work", es: "Cómo trabajamos", pt: "Como trabalhamos", fr: "Notre méthode" } as Bi,
  approachTitle: { ar: "خمس مراحل من الفكرة إلى التسليم", en: "Five stages from brief to handover", es: "Cinco etapas del encargo a la entrega", pt: "Cinco fases do programa à entrega", fr: "Cinq étapes du programme à la réception" } as Bi,
  activitiesTitle: { ar: "الأنشطة", en: "The activities we practise", es: "Las actividades que ejercemos", pt: "As atividades que exercemos", fr: "Les activités que nous exerçons" } as Bi,
  activitiesSubtitle: {
    ar: "نشاطان يغطّيان كل ما سبق، وتفصيلهما على صفحة التسجيل.",
    en: "Two activities cover everything above; the detail of each is on the registration page.", es: "Dos actividades cubren todo lo anterior; el detalle de cada una está en la página de registro.", pt: "Duas atividades cobrem tudo o acima; o detalhe de cada uma está na página de registo.", fr: "Deux activités couvrent tout ce qui précède ; le détail de chacune figure sur la page d'enregistrement.",
  } as Bi,
  activitiesLink: { ar: "التسجيل والأنشطة", en: "Registration & activities", es: "Registro y actividades", pt: "Registo e atividades", fr: "Enregistrement et activités" } as Bi,
};

export default async function ServicesPage() {
  const locale = await getLocale();

  // ACTIVITIES carries all five locales already — machine-translating it was
  // paying for a round trip to regenerate copy that was written by hand.
  const activityText = ACTIVITIES.map((x) => x[locale]);

  // Hand-translated in SERVICE_ITEMS, keyed by the English string. Falls back
  // to the English only if an item is added to SERVICES without a translation
  // — which a test catches before it ships.
  const itemLists = SERVICES.map((svc) =>
    svc.items.map((item) => (SERVICE_ITEMS[item] ? pick(SERVICE_ITEMS[item], locale) : item))
  );
  // The five stages are hand-translated in messages.ts, index-aligned with
  // OPERATING_MODEL (a test pins the lengths). Reading them here rather than
  // machine-translating the English means these render in every locale with
  // no API key involved — translateBatch returns the source unchanged when
  // OPENAI_API_KEY is unset, which is how this page used to show English.
  const stages = getMessages(locale).operating.items;

  return (
    <>
      <Section eyebrow={pick(UI.eyebrow, locale)} title={pick(UI.title, locale)} subtitle={pick(UI.subtitle, locale)}>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {PRACTICE_AREAS.map((a, i) => {
            const Icon = PRACTICE_ICON[a.slug];
            return (
              <div key={a.slug} id={a.slug} className="panel rounded-2xl p-7 scroll-mt-24">
                <div className="flex items-center gap-3">
                  <div className="app-gradient rounded-xl h-16 w-16 flex items-center justify-center text-[color:var(--on-accent)] shrink-0">
                    {Icon && <Icon className="size-10" />}
                  </div>
                  <h3 className="font-bold text-lg">{pick(a.title, locale)}</h3>
                </div>
                <p className="text-[color:var(--ink)]/60 mt-3">{pick(a.detail, locale)}</p>
                {/* The inventory from SERVICES, matched on slug so a group
                    cannot drift out of alignment with its line items. */}
                <div className="mt-4 text-[color:var(--ink)]/50 text-xs font-semibold uppercase tracking-widest">
                  {pick(UI.includes, locale)}
                </div>
                <ul className="mt-2 space-y-1.5 text-sm text-[color:var(--ink)]/65">
                  {itemLists[i].map((item, k) => (
                    <li key={k} className="flex items-start gap-2.5">
                      <span className="mt-1.5 size-1.5 shrink-0 rotate-45 bg-[color:var(--accent)]" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Section>

      <Section eyebrow={pick(UI.approachEyebrow, locale)} title={pick(UI.approachTitle, locale)}>
        <ol className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {OPERATING_MODEL.map((o, i) => (
            <li key={o.title} className="panel rounded-2xl p-5">
              <div className="app-gradient-text text-2xl font-extrabold">{String(i + 1).padStart(2, "0")}</div>
              <h3 className="font-semibold mt-2 text-sm">{stages[i].title}</h3>
              <p className="text-[color:var(--ink)]/55 text-xs mt-1.5 leading-relaxed">{stages[i].blurb}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        eyebrow={pick(REGISTRATION.authorityLoc, locale)}
        title={pick(UI.activitiesTitle, locale)}
        subtitle={pick(UI.activitiesSubtitle, locale)}
      >
        {/* No licence number on the button: none has been supplied, and a
            placeholder that looks like a reference is worse than no button. */}
        <Link
          href="/licence"
          className="inline-block mb-8 text-sm app-gradient text-[color:var(--on-accent)] font-bold px-4 py-2.5 rounded-xl"
        >
          {pick(UI.activitiesLink, locale)} →
        </Link>

        <div className="grid gap-3 md:grid-cols-2">
          {activityText.map((text, i) => (
            <div key={ACTIVITIES[i].en} className="panel rounded-xl p-4 flex items-start gap-3">
              <span className="text-sm text-[color:var(--ink)]/80 flex-1">{text}</span>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
