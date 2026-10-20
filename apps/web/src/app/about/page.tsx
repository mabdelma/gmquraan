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
    ar: "أن يجد أهل ساحل سليم في جمعيتهم مكاناً يحفظ أبناؤهم فيه كتاب الله، ويجد اليتيم فيه كافلاً، والأم حضانة، والمرأة عملاً، والأسرة عوناً يبدأ به عملاً تعيش منه — من جهة واحدة يعرفونها ويثقون بها.",
    en: "That the people of Sahel Selim find in their association a place where their children memorise the Qur'an, where an orphan finds a sponsor, a mother a nursery, a woman work, and a household the means to start something it can live from — from one body they know and trust.", es: "Que la gente de Sahel Selim encuentre en su asociación un lugar donde sus hijos memoricen el Corán, donde el huérfano halle un padrino, la madre una guardería, la mujer un trabajo y la familia el medio de iniciar algo de lo que vivir, desde una sola entidad que conocen y en la que confían.", pt: "Que o povo de Sahel Selim encontre na sua associação um lugar onde os filhos memorizem o Alcorão, onde o órfão encontre um padrinho, a mãe uma creche, a mulher trabalho e a família os meios de iniciar algo de que possa viver — a partir de uma só entidade que conhecem e em que confiam.", fr: "Que les habitants de Sahel Selim trouvent dans leur association un lieu où leurs enfants mémorisent le Coran, où l'orphelin trouve un parrain, la mère une crèche, la femme un travail et le foyer de quoi lancer une activité dont il puisse vivre — auprès d'une seule entité qu'ils connaissent et en qui ils ont confiance.",
  } as Bi,
  whatTitle: { ar: "ماذا نفعل", en: "What we do", es: "Qué hacemos", pt: "O que fazemos", fr: "Ce que nous faisons" } as Bi,
  whatItems: [
    { ar: "حلقات تحفيظ القرآن الكريم وتعليم التلاوة والتجويد", en: "Qur'an memorisation circles and the teaching of recitation", es: "Círculos de memorización del Corán y enseñanza de la recitación", pt: "Círculos de memorização do Alcorão e ensino da recitação", fr: "Cercles de mémorisation du Coran et enseignement de la récitation" },
    { ar: "كفالة الأيتام ومتابعة أسرهم", en: "Orphan sponsorship, with follow-up for their families", es: "Apadrinamiento de huérfanos y seguimiento de sus familias", pt: "Apadrinhamento de órfãos e acompanhamento das suas famílias", fr: "Parrainage d'orphelins et suivi de leurs familles" },
    { ar: "حضانة لأطفال المجتمع المحلي", en: "A nursery for the children of the local community", es: "Una guardería para los niños de la comunidad local", pt: "Uma creche para as crianças da comunidade local", fr: "Une crèche pour les enfants de la communauté locale" },
    { ar: "مشغل يتيح التدريب والعمل، وبخاصة للمرأة", en: "A workshop offering training and work, for women in particular", es: "Un taller que ofrece formación y trabajo, en especial a las mujeres", pt: "Uma oficina que oferece formação e trabalho, em especial às mulheres", fr: "Un atelier offrant formation et travail, en particulier aux femmes" },
    { ar: "مشروعات خدمية وتوعية صحية، وإقراض للأسر والمشروعات الصغيرة", en: "Service projects, health awareness, and lending to households and small projects", es: "Proyectos de servicio, concienciación sanitaria y préstamos a familias y pequeños proyectos", pt: "Projetos de serviço, sensibilização para a saúde e crédito a famílias e pequenos projetos", fr: "Projets de service, sensibilisation à la santé et prêts aux ménages et petits projets" },
  ] as Bi[],
  valuesTitle: { ar: "قيمنا", en: "Our values", es: "Nuestros valores", pt: "Os nossos valores", fr: "Nos valeurs" } as Bi,
  valuesSubtitle: {
    ar: "القيم التي أعلنتها الجمعية، ويُقاس بها كل ما تعمله.",
    en: "The values the association has published, and the measure of everything it does.", es: "Los valores que la asociación ha publicado y la medida de todo lo que hace.", pt: "Os valores que a associação publicou e a medida de tudo o que faz.", fr: "Les valeurs publiées par l'association et la mesure de tout ce qu'elle fait.",
  } as Bi,
  reachTitle: { ar: "أين نعمل", en: "Where we work", es: "Dónde trabajamos", pt: "Onde trabalhamos", fr: "Où nous intervenons" } as Bi,
  reachSubtitle: {
    ar: "المقر الرئيسي بساحل سليم، التناغة الشرقية، محافظة أسيوط.",
    en: "The main office in Sahel Selim, East Tanagha, Assiut Governorate.", es: "La oficina principal en Sahel Selim, Tanagha Este, gobernación de Asiut.", pt: "O escritório principal em Sahel Selim, Tanagha Este, governorado de Assiut.", fr: "Le bureau principal à Sahel Selim, Tanagha-Est, gouvernorat d'Assiout.",
  } as Bi,
  leadershipTitle: { ar: "التواصل", en: "Contact", es: "Contacto", pt: "Contacto", fr: "Contact" } as Bi,
  leadershipSubtitle: {
    ar: "الجمعية لا تنشر أسماء شاغلي المناصب، فالبطاقة تحمل المقر الرئيسي نفسه.",
    en: "The association publishes no officer names, so the card carries the main office itself.", es: "La asociación no publica los nombres de sus cargos, por lo que la tarjeta lleva la propia oficina principal.", pt: "A associação não publica os nomes dos seus dirigentes, pelo que o cartão leva o próprio escritório principal.", fr: "L'association ne publie pas le nom de ses responsables : la carte porte donc le bureau principal lui-même.",
  } as Bi,
  profile: { ar: "الملف التعريفي", en: "Profile", es: "Perfil", pt: "Perfil", fr: "Profil" } as Bi,
  activitiesTitle: { ar: "الأنشطة", en: "Our activities", es: "Nuestras actividades", pt: "As nossas atividades", fr: "Nos activités" } as Bi,
  activitiesLabel: {
    ar: "الأنشطة التي تزاولها الجمعية:",
    en: "The activities the association carries out:", es: "Las actividades que realiza la asociación:", pt: "As atividades que a associação realiza:", fr: "Les activités menées par l'association :",
  } as Bi,
  activitiesMore: { ar: "تفاصيل الأنشطة والإشهار", en: "Activity and registration detail", es: "Detalle de actividades y registro", pt: "Detalhe das atividades e do registo", fr: "Détail des activités et de l'enregistrement" } as Bi,
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
