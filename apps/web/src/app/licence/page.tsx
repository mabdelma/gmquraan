import type { Metadata } from "next";
import Link from "next/link";
import { LICENCE_ACTIVITIES, LICENCE_ENTITIES } from "@/lib/licence-activities";
import { getLocale } from "@/lib/i18n.server";
import { PAGE_META, localeMeta, t as pick, type Bi } from "@/lib/brand-content";
import { COMPANY, REGISTRATION } from "@/lib/content";
import { translateBatch } from "@/lib/translate";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return localeMeta("licence", await getLocale());
}

const UI = {
  eyebrow: { ar: "التسجيل", en: "Registration", es: "Registro", pt: "Registo", fr: "Enregistrement" } as Bi,
  title: { ar: "التسجيل والأنشطة", en: "Registration and activities", es: "Registro y actividades", pt: "Registo e atividades", fr: "Enregistrement et activités" } as Bi,
  intro: {
    ar: "النشاطان اللذان يزاولهما المكتب، وما يشمله كل منهما، إلى جانب حالة بيانات التسجيل المهني والضريبي.",
    en: "The two activities the office practises and what each covers, alongside the status of its professional and tax registration details.", es: "Las dos actividades que ejerce la oficina y lo que abarca cada una, junto al estado de sus datos de registro profesional y fiscal.", pt: "As duas atividades que o gabinete exerce e o que cada uma abrange, a par do estado dos seus dados de registo profissional e fiscal.", fr: "Les deux activités exercées par le bureau et ce que chacune couvre, ainsi que l'état de ses données d'enregistrement professionnel et fiscal.",
  } as Bi,
  activities: { ar: "أنشطة", en: "activities", es: "actividades", pt: "atividades", fr: "activités" } as Bi,
  scope: { ar: "بنود النطاق", en: "scope items", es: "elementos del alcance", pt: "elementos do âmbito", fr: "éléments du périmètre" } as Bi,
  detailsTitle: { ar: "بيانات التسجيل", en: "Registration details", es: "Datos de registro", pt: "Dados de registo", fr: "Données d'enregistrement" } as Bi,
  detailsIntro: {
    ar: "يحمل المكتب قيداً هندسياً وختماً هندسياً وتسجيلاً ضريبياً. لم تُسلَّم أرقام هذه المستندات بعد، ولن يُنشر هنا رقم لم يُستخرج من المستند نفسه — المساحات أدناه تُملأ عند تسليم الصور.",
    en: "The office holds an engineering registration, an engineering stamp and a tax registration. The numbers on those documents have not been supplied, and no number will be published here that has not been read off the document itself — the fields below fill in when copies arrive.", es: "La oficina cuenta con registro de ingeniería, sello de ingeniería y registro fiscal. Los números de esos documentos no se han facilitado, y aquí no se publicará ningún número que no se haya leído del propio documento: los campos de abajo se completarán cuando lleguen las copias.", pt: "O gabinete possui registo de engenharia, selo de engenharia e registo fiscal. Os números desses documentos não foram fornecidos e aqui não será publicado qualquer número que não tenha sido lido do próprio documento — os campos abaixo preenchem-se quando chegarem as cópias.", fr: "Le bureau détient une inscription professionnelle, un cachet d'ingénieur et une immatriculation fiscale. Les numéros de ces documents n'ont pas été communiqués, et aucun numéro ne sera publié ici sans avoir été relevé sur le document lui-même — les champs ci-dessous se rempliront à réception des copies.",
  } as Bi,
  legalName: { ar: "الاسم", en: "Name", es: "Nombre", pt: "Nome", fr: "Nom" } as Bi,
  form: { ar: "الصفة", en: "Form", es: "Forma", pt: "Forma", fr: "Forme" } as Bi,
  syndicate: { ar: "قيد النقابة", en: "Syndicate registration", es: "Registro del colegio", pt: "Registo na ordem", fr: "Inscription à l'ordre" } as Bi,
  register: { ar: "السجل التجاري", en: "Commercial register", es: "Registro mercantil", pt: "Registo comercial", fr: "Registre du commerce" } as Bi,
  tax: { ar: "التسجيل الضريبي", en: "Tax registration", es: "Registro fiscal", pt: "Registo fiscal", fr: "Immatriculation fiscale" } as Bi,
  authority: { ar: "الجهة", en: "Authority", es: "Autoridad", pt: "Autoridade", fr: "Autorité" } as Bi,
  office: { ar: "المقر", en: "Office", es: "Oficina", pt: "Escritório", fr: "Bureau" } as Bi,
  since: { ar: "نعمل منذ", en: "Working since", es: "En activo desde", pt: "Em atividade desde", fr: "En activité depuis" } as Bi,
  ask: { ar: "اطلب نسخة من المستندات", en: "Request copies of the documents", es: "Solicitar copias de los documentos", pt: "Solicitar cópias dos documentos", fr: "Demander copie des documents" } as Bi,
};

export default async function LicenceIndexPage() {
  const locale = await getLocale();
  const isAr = locale === "ar";
  const meta = LICENCE_ENTITIES.eg;
  const pending = pick(REGISTRATION.pendingLoc, locale);

  // The activity descriptions and the entity subtitle are authored in English
  // (Arabic carries only the activity titles, which come off the profile).
  // Every other locale is machine-translated at render time — the same
  // treatment /services gives its inventory, rather than silently serving
  // English on a page that is otherwise fully localised.
  const [descriptions, [entitySub]] =
    locale === "en"
      ? [LICENCE_ACTIVITIES.map((a) => a.description), [meta.sub]]
      : await Promise.all([
          translateBatch(LICENCE_ACTIVITIES.map((a) => a.description), locale),
          translateBatch([meta.sub], locale),
        ]);

  /** A value, or the honest stand-in. One helper so the three rows cannot drift. */
  const value = (v: string | null) =>
    v ? (
      <dd className="font-semibold" dir="ltr">{v}</dd>
    ) : (
      <dd className="italic text-[color:var(--ink)]/45">{pending}</dd>
    );

  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="text-xs font-bold tracking-widest uppercase app-gradient-text mb-3">{pick(UI.eyebrow, locale)}</div>
      <h1 className="text-3xl md:text-4xl font-extrabold">{pick(UI.title, locale)}</h1>
      <p className="text-[color:var(--ink)]/65 mt-3 max-w-3xl leading-relaxed">{pick(UI.intro, locale)}</p>

      <div className="mt-10 panel rounded-2xl p-6">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h2 className="text-2xl font-extrabold">
            <span className="mr-2">{meta.flag}</span>
            {isAr ? COMPANY.nameAr : meta.label}
          </h2>
          <span className="text-[color:var(--ink)]/55 text-sm">
            {LICENCE_ACTIVITIES.length} {pick(UI.activities, locale)}
          </span>
        </div>
        <p className="text-[color:var(--ink)]/55 text-sm mt-1">{entitySub}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mt-6">
        {LICENCE_ACTIVITIES.map((a, i) => (
          <Link
            key={a.slug}
            href={`/licence/${a.slug}`}
            className="panel rounded-2xl p-5 hover:bg-[color:var(--overlay)] transition group flex flex-col"
          >
            <h3 className="font-bold mt-1 group-hover:text-[color:var(--accent-text)]">
              {isAr ? a.titleAr : a.title}
            </h3>
            <p className="text-[color:var(--ink)]/55 text-sm mt-2 line-clamp-3 flex-1">{descriptions[i]}</p>
            <span className="text-xs text-[color:var(--accent-text)] mt-3">
              {a.items.length} {pick(UI.scope, locale)} →
            </span>
          </Link>
        ))}
      </div>

      {/* The registration block. It renders the "awaiting the certificate"
          state rather than being hidden: a counterparty asking for these
          numbers deserves to see that we know which ones are outstanding,
          not an absence they have to interpret. */}
      <div className="mt-20">
        <h2 className="text-2xl font-extrabold md:text-3xl">{pick(UI.detailsTitle, locale)}</h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-[color:var(--ink)]/65">{pick(UI.detailsIntro, locale)}</p>

        <article className="panel app-reveal mt-8 rounded-2xl p-6 lg:max-w-2xl">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
            <dt className="text-[color:var(--ink)]/55">{pick(UI.legalName, locale)}</dt>
            <dd className="font-semibold">{isAr ? REGISTRATION.legalNameAr : REGISTRATION.legalName}</dd>
            <dt className="text-[color:var(--ink)]/55">{pick(UI.form, locale)}</dt>
            <dd>{pick(REGISTRATION.legalFormLoc, locale)}</dd>
            <dt className="text-[color:var(--ink)]/55">{pick(UI.syndicate, locale)}</dt>
            {value(REGISTRATION.syndicateNo)}
            <dt className="text-[color:var(--ink)]/55">{pick(UI.register, locale)}</dt>
            {value(REGISTRATION.registerNo)}
            <dt className="text-[color:var(--ink)]/55">{pick(UI.tax, locale)}</dt>
            {value(REGISTRATION.taxNo)}
            <dt className="text-[color:var(--ink)]/55">{pick(UI.authority, locale)}</dt>
            <dd>{pick(REGISTRATION.authorityLoc, locale)}</dd>
            <dt className="text-[color:var(--ink)]/55">{pick(UI.office, locale)}</dt>
            <dd>{pick(REGISTRATION.registeredOfficeLoc, locale)}</dd>
            <dt className="text-[color:var(--ink)]/55">{pick(UI.since, locale)}</dt>
            <dd dir="ltr">{COMPANY.foundedYear}</dd>
          </dl>

          <Link
            href="/contact"
            className="app-gradient mt-6 inline-block rounded-xl px-5 py-2.5 text-sm font-bold text-[color:var(--on-accent)]"
          >
            {pick(UI.ask, locale)}
          </Link>
        </article>
      </div>
    </section>
  );
}
