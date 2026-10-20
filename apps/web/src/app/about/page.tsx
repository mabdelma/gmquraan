import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/Section";
import { ACTIVITIES, COMPANY, LEADERSHIP, REGIONS, REGISTRATION, STATS } from "@/lib/content";
import { LegalEntities } from "@/components/LegalEntities";
import { getLocale } from "@/lib/i18n.server";
import { getUi } from "@/lib/ui-i18n";
import { ABOUT, PAGE_META, localeMeta, SECTIONS, VALUES, t as pick, type Bi } from "@/lib/brand-content";
import { VALUE_ICON } from "@/components/brand/icons";

export async function generateMetadata(): Promise<Metadata> {
  return localeMeta("about", await getLocale());
}

const UI = {
  missionTitle: { ar: "رسالتنا", en: "Our mission", es: "Nuestra misión", pt: "A nossa missão", fr: "Notre mission" } as Bi,
  missionBody: {
    ar: "أن يحصل العميل على التصميم والمكتب الفني والترخيص والتنفيذ والإشراف من جهة واحدة مسؤولة، بدل أن يتنقّل بين أربع جهات ويتحمّل هو ما يسقط بينها.",
    en: "That a client gets design, technical office, permits, construction and supervision from one accountable office, instead of moving between four firms and carrying whatever falls between them.", es: "Que el cliente obtenga diseño, oficina técnica, licencias, obra y supervisión de una sola oficina responsable, en lugar de ir entre cuatro empresas y cargar con lo que se pierde entre ellas.", pt: "Que o cliente obtenha projeto, escritório técnico, licenças, obra e fiscalização de um único gabinete responsável, em vez de andar entre quatro empresas e carregar com o que se perde entre elas.", fr: "Que le client obtienne conception, bureau technique, permis, travaux et supervision d'un seul bureau responsable, plutôt que de passer entre quatre entreprises et d'assumer ce qui tombe entre elles.",
  } as Bi,
  whatTitle: { ar: "ماذا نفعل", en: "What we do", es: "Qué hacemos", pt: "O que fazemos", fr: "Ce que nous faisons" } as Bi,
  whatItems: [
    { ar: "تصميم معماري وإنشائي وميكانيكي وكهربائي", en: "Architectural, structural, mechanical and electrical design", es: "Diseño arquitectónico, estructural, mecánico y eléctrico", pt: "Projeto de arquitetura, estruturas, mecânica e eletricidade", fr: "Conception architecturale, structurelle, mécanique et électrique" },
    { ar: "أعمال المكتب الفني: الحصر والمستخلصات والمناقصات", en: "Technical-office work: quantities, payment statements and tenders", es: "Trabajos de oficina técnica: mediciones, certificaciones y licitaciones", pt: "Trabalhos de escritório técnico: medições, autos e concursos", fr: "Travaux de bureau technique : métrés, situations et appels d'offres" },
    { ar: "استخراج تراخيص البناء ومتابعتها حتى الاعتماد", en: "Building permits, pursued to approval", es: "Licencias de obra, gestionadas hasta su aprobación", pt: "Licenças de construção, acompanhadas até à aprovação", fr: "Permis de construire, suivis jusqu'à l'approbation" },
    { ar: "تنفيذ إنشائي بإشراف مقيم حتى التسليم", en: "Construction execution with resident supervision to handover", es: "Ejecución de obra con supervisión residente hasta la entrega", pt: "Execução de obra com fiscalização residente até à entrega", fr: "Exécution des travaux avec supervision résidente jusqu'à la réception" },
    { ar: "رسومات تنفيذية ونمذجة BIM وإظهار ثلاثي الأبعاد", en: "Shop drawings, BIM modelling and 3D visualisation", es: "Planos de taller, modelado BIM y visualización 3D", pt: "Desenhos de execução, modelação BIM e visualização 3D", fr: "Plans d'exécution, modélisation BIM et visualisation 3D" },
  ] as Bi[],
  valuesTitle: { ar: "قيمنا", en: "Our values", es: "Nuestros valores", pt: "Os nossos valores", fr: "Nos valeurs" } as Bi,
  valuesSubtitle: {
    ar: "المبادئ التي يُدار بها كل مشروع في المكتب.",
    en: "The principles every project in the office is run on.", es: "Los principios con los que se dirige cada proyecto de la oficina.", pt: "Os princípios com que se conduz cada projeto do gabinete.", fr: "Les principes selon lesquels chaque projet du bureau est conduit.",
  } as Bi,
  reachTitle: { ar: "أين نعمل", en: "Where we work", es: "Dónde trabajamos", pt: "Onde trabalhamos", fr: "Où nous intervenons" } as Bi,
  reachSubtitle: {
    ar: "مكتبان في بلد المثال، وأعمال هندسية ومقاولات في المنطقة الثانية والمنطقة الثالثة.",
    en: "Two offices in Example Country, with engineering and contracting work in Region Two and Region Three.", es: "Dos oficinas en País de Ejemplo, con trabajos de ingeniería y contratación en Región Dos y Región Tres.", pt: "Dois escritórios no País de Exemplo, com trabalhos de engenharia e contratação na Região Dois e na Região Três.", fr: "Deux bureaux en Pays d'Exemple, avec des travaux d'ingénierie et d'entreprise en Région Deux et en Région Trois.",
  } as Bi,
  leadershipTitle: { ar: "القيادة", en: "Leadership", es: "Dirección", pt: "Direção", fr: "Direction" } as Bi,
  leadershipSubtitle: {
    ar: "الاسم المدوّن على بطاقة العمل الرسمية للمكتب.",
    en: "The name printed on the office's business card.", es: "El nombre impreso en la tarjeta de visita de la oficina.", pt: "O nome impresso no cartão de visita do gabinete.", fr: "Le nom imprimé sur la carte de visite du bureau.",
  } as Bi,
  profile: { ar: "الملف المهني", en: "Professional profile", es: "Perfil profesional", pt: "Perfil profissional", fr: "Profil professionnel" } as Bi,
  activitiesTitle: { ar: "الأنشطة", en: "Our activities", es: "Nuestras actividades", pt: "As nossas atividades", fr: "Nos activités" } as Bi,
  activitiesLabel: {
    ar: "الأنشطة التي يزاولها المكتب:",
    en: "The activities the office practises:", es: "Las actividades que ejerce la oficina:", pt: "As atividades que o gabinete exerce:", fr: "Les activités exercées par le bureau :",
  } as Bi,
  activitiesMore: { ar: "تفاصيل الأنشطة والتسجيل", en: "Activity and registration detail", es: "Detalle de actividades y registro", pt: "Detalhe das atividades e do registo", fr: "Détail des activités et de l'enregistrement" } as Bi,
};

/**
 * Labels for `STATS`. Index-aligned with that tuple in content.ts, which is
 * why the two have to stay the same length — a fourth stat with no label here
 * renders a number with nothing under it.
 */
const STAT_LABELS: Bi[] = [
  { en: "Registered since", ar: "مشهرة منذ", es: "Inscrita desde", pt: "Registada desde", fr: "Enregistrée depuis" },
  { en: "Fields of work", ar: "مجالات العمل", es: "Campos de trabajo", pt: "Campos de atuação", fr: "Champs d'action" },
  { en: "Registration number", ar: "رقم الإشهار", es: "Número de inscripción", pt: "Número de registo", fr: "Numéro d'enregistrement" },
];

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

export default async function AboutPage() {
  const locale = await getLocale();
  const ui = getUi(locale);
  const isAr = locale === "ar";

  // ACTIVITIES is hand-written in all five locales; Arabic is the original
  // wording from the supplied profile, not a translation of the English.
  const activityText = ACTIVITIES.map((x) => x[locale]);

  return (
    <>
      <Section eyebrow={pick(ABOUT.eyebrow, locale)} title={pick(ABOUT.title, locale)} subtitle={pick(ABOUT.body, locale)}>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="panel rounded-2xl p-7">
            <h3 className="font-bold text-lg">{pick(UI.missionTitle, locale)}</h3>
            <p className="text-[color:var(--ink)]/60 mt-3">{pick(UI.missionBody, locale)}</p>
          </div>
          <div className="panel rounded-2xl p-7">
            <h3 className="font-bold text-lg">{pick(UI.whatTitle, locale)}</h3>
            <ul className="text-[color:var(--ink)]/60 mt-3 space-y-2 text-sm list-disc list-inside">
              {UI.whatItems.map((item) => (
                <li key={item.en}>{pick(item, locale)}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mt-10 max-w-2xl">
          {STATS.map((s, i) => (
            <div key={s.label}>
              <div className="text-3xl md:text-4xl font-extrabold app-gradient-text">{s.value}</div>
              <div className="text-[color:var(--ink)]/50 text-sm mt-1">{pick(STAT_LABELS[i], locale)}</div>
            </div>
          ))}
        </div>

        <div className="panel rounded-2xl p-5 mt-10 text-sm text-[color:var(--ink)]/60 max-w-2xl space-y-3">
          <LegalEntities ui={ui} pending={pick(REGISTRATION.pendingLoc, locale)} />
        </div>

        <div className="panel rounded-2xl p-5 mt-4 text-sm text-[color:var(--ink)]/60 max-w-2xl">
          <div className="text-[color:var(--ink)]/80 font-semibold mb-2">{pick(UI.activitiesTitle, locale)}</div>
          <div className="text-[color:var(--ink)]/55 text-xs">
            {pick(UI.activitiesLabel, locale)} {activityText.join(" · ")}
          </div>
          <Link href="/licence" className="mt-3 inline-block text-xs font-semibold text-[color:var(--accent-text)] hover:underline">
            {pick(UI.activitiesMore, locale)} →
          </Link>
        </div>
      </Section>

      <Section eyebrow={pick(SECTIONS.practiceEyebrow, locale)} title={pick(UI.valuesTitle, locale)} subtitle={pick(UI.valuesSubtitle, locale)}>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {VALUES.map((v) => {
            const Icon = VALUE_ICON[v.key];
            return (
              <div key={v.key} className="panel rounded-2xl p-6">
                {Icon && <Icon className="size-7 text-[color:var(--accent)]" />}
                <h3 className="font-semibold mt-3">{pick(v.title, locale)}</h3>
                <p className="text-[color:var(--ink)]/55 text-sm mt-2">{pick(v.body, locale)}</p>
              </div>
            );
          })}
        </div>
      </Section>

      <Section eyebrow={pick(SECTIONS.reachTitle, locale)} title={pick(UI.reachTitle, locale)} subtitle={pick(UI.reachSubtitle, locale)}>
        <div className="grid gap-6 md:grid-cols-3">
          {REGIONS.map((r) => (
            <div key={r.name} className="panel rounded-2xl p-6">
              <span className="text-3xl" aria-hidden="true">{r.flag}</span>
              <h3 className="font-semibold mt-3">{pick(r.nameLoc, locale)}</h3>
              <p className="text-[color:var(--ink)]/55 text-sm mt-1">{pick(r.detailLoc, locale)}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow={pick(SECTIONS.leadership, locale)} title={pick(UI.leadershipTitle, locale)} subtitle={pick(UI.leadershipSubtitle, locale)}>
        <div className="grid gap-6 md:grid-cols-2">
          {LEADERSHIP.map((p) => (
            <div key={p.name} className="panel rounded-2xl p-7">
              {/* Initials, not a portrait: no photograph has been supplied and
                  a stand-in face would be the one invention nobody can spot. */}
              <div className="app-gradient text-[color:var(--on-accent)] font-extrabold rounded-2xl h-14 w-14 flex items-center justify-center text-xl shrink-0">
                {isAr ? initials(p.nameAr) : initials(p.name)}
              </div>
              <h3 className="font-bold text-lg mt-4">
                {`${pick(p.titleLoc, locale)} ${isAr ? p.nameAr : p.name}`}
              </h3>
              <p className="app-gradient-text text-sm font-semibold">{pick(p.roleLoc, locale)}</p>
              <p className="text-[color:var(--ink)]/55 text-xs mt-1">{COMPANY.foundedCity}, {pick(REGISTRATION.countryLoc, locale)}</p>
              {p.publicProfile && (
                <a
                  href={p.publicProfile}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-xs font-semibold text-[color:var(--accent-text)] hover:underline"
                >
                  {pick(UI.profile, locale)} ↗
                </a>
              )}
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
