/**
 * Single source of truth for the association's content, structured for reuse
 * across pages, SEO metadata and i18n.
 *
 * ── Sourcing contract ───────────────────────────────────────────────────────
 * Every value below comes from the association's own published site. Where the
 * association has not published something, the field is `null` and the pages
 * render an explicit "not on file" state rather than inventing a
 * plausible-looking number. Filling one in is a one-line change here once the
 * documentary evidence is in hand.
 *
 * Two deliberate omissions, both for the same reason — publishing a real claim
 * about real people that nobody actually made:
 *
 *   1. The live contact page lists eight personal names in bare <div>s under no
 *      heading, with no role attached to any of them. They are most likely the
 *      board, but "most likely" is an inference about named private
 *      individuals, so `LEADERSHIP` carries the association's own contact
 *      identity instead of those names with roles invented for them.
 *   2. Only one mailbox, info@gmquran.com, is published. The per-desk addresses
 *      below all resolve to it rather than inventing four more that would
 *      bounce.
 *
 * Rebranding the site means editing this file and `brand-content.ts`, and
 * nothing else.
 */

import type { Bi } from "./brand-content";

/**
 * Localised prose used by both the rendering layer and the plain-string
 * consumers (branch rows in the database, vCard fields) that can only hold one
 * language. Each is declared once here and projected two ways below — `x` is
 * the English string those consumers need, `xLoc` is all five locales for the
 * pages. One source, two views, so they cannot drift.
 */
const LEGAL_FORM: Bi = {
  en: "Registered community association",
  ar: "جمعية أهلية مشهرة",
  es: "Asociación comunitaria inscrita",
  pt: "Associação comunitária registada",
  fr: "Association communautaire enregistrée",
};
/**
 * Egyptian community associations are registered with the competent
 * administrative authority for social solidarity. The association publishes its
 * registration number but never names the registering body, so this stays a
 * description of the body rather than a specific ministry it did not claim.
 */
const AUTHORITY: Bi = {
  en: "the competent administrative authority",
  ar: "الجهة الإدارية المختصة",
  es: "la autoridad administrativa competente",
  pt: "a autoridade administrativa competente",
  fr: "l'autorité administrative compétente",
};
const REGISTERED_OFFICE: Bi = {
  en: "Sahel Selim, Assiut Governorate",
  ar: "ساحل سليم، محافظة أسيوط",
  es: "Sahel Selim, gobernación de Asiut",
  pt: "Sahel Selim, governorado de Assiut",
  fr: "Sahel Selim, gouvernorat d'Assiout",
};
const PENDING: Bi = {
  en: "Not published",
  ar: "غير منشور",
  es: "No publicado",
  pt: "Não publicado",
  fr: "Non publié",
};
const EGYPT: Bi = { en: "Egypt", ar: "مصر", es: "Egipto", pt: "Egito", fr: "Égypte" };

/** The full published street address of the main office. */
const STREET: Bi = {
  en: "Behind the second police station, Fahmy Emara Khaled Ismail St no. 17, main office, Sahel Selim, East Tanagha",
  ar: "خلف قسم ثانٍ، ش/ فهمى عمارة خالد إسماعيل رقم ١٧، المقر الرئيسي، ساحل سليم، التناغة الشرقية",
  es: "Detrás de la segunda comisaría, c/ Fahmy Emara Khaled Ismail n.º 17, oficina principal, Sahel Selim, Tanagha Este",
  pt: "Atrás da segunda esquadra, rua Fahmy Emara Khaled Ismail n.º 17, escritório principal, Sahel Selim, Tanagha Este",
  fr: "Derrière le deuxième commissariat, rue Fahmy Emara Khaled Ismail n° 17, bureau principal, Sahel Selim, Tanagha-Est",
};

export const COMPANY = {
  /** The working name, as the association writes it. */
  name: "Association for the Preservation of the Holy Qur'an",
  nameAr: "جمعية المحافظة على القرآن الكريم",
  shortName: "Qur'an Association",
  /**
   * The wordmark, split for the two-tone lockup. Explicit rather than sliced
   * off `name`: deriving the tail from a length silently renders the wrong tail
   * the moment the name changes.
   */
  wordmarkLead: "Association",
  wordmarkRest: "for the Preservation of the Holy Qur'an",
  /** The same lockup in Arabic. */
  wordmarkLeadAr: "جمعية",
  wordmarkRestAr: "المحافظة على القرآن الكريم",
  tagline: "Qur'an Memorisation & Community Care",
  positioning:
    "A community association in Sahel Selim, Assiut, registered as no. 224 of 1977, working in Qur'an memorisation, orphan sponsorship, a nursery, a workshop, service projects and lending.",
  /** The year of registration, printed on the association's own emblem. */
  foundedYear: 1977,
  foundedCity: "Sahel Selim",
  country: "Egypt",
  /** The one published mailbox. */
  email: "info@gmquran.com",
  /**
   * The association publishes a single address. Every key below resolves to it
   * on purpose: routing a visitor's intent is worth nothing if three of the
   * four destinations bounce. Split them once real mailboxes exist.
   */
  emails: {
    info: "info@gmquran.com",
    contact: "info@gmquran.com",
    engineering: "info@gmquran.com",
    projects: "info@gmquran.com",
    admin: "info@gmquran.com",
  } as const,
  /**
   * The three published lines, stored in full international form. The site is
   * read from outside Egypt as well, and a local-form number is undiallable
   * from abroad — so +20 is carried here rather than being prepended at each
   * call site, which is how `tel:+20+20…` happens.
   *
   * The first is the mobile line the contact page labels as the board
   * chairman's; the other two are Assiut landlines (area code 88).
   */
  phones: ["+201020048168", "+20882138958", "+20882941100"],
  primaryPhone: "+201020048168",
  /**
   * The mobile line. Named separately because WhatsApp is its own CTA — and it
   * has to be the mobile: the two landlines cannot carry WhatsApp at all.
   */
  whatsapp: "+201020048168",
  domain: "gmquran.com",
  /**
   * No superseded address exists — the association has only ever published
   * one. Kept pointing at it so nothing downstream has to handle a null.
   */
  legacyEmail: "info@gmquran.com",
} as const;

/**
 * The brand lockup and full name for a locale. Arabic mode renders the Arabic
 * name, every other locale the English one, so the header and the footer share
 * one selector and cannot drift apart.
 */
export function brandFor(locale: string) {
  const ar = locale === "ar";
  return {
    name: ar ? COMPANY.nameAr : COMPANY.name,
    lead: ar ? COMPANY.wordmarkLeadAr : COMPANY.wordmarkLead,
    rest: ar ? COMPANY.wordmarkRestAr : COMPANY.wordmarkRest,
  };
}

/**
 * Registration and standing.
 *
 * The association states one identifier and states it prominently — it is
 * lettered onto the emblem itself: المشهرة برقم ٢٢٤ لسنة ١٩٧٧. That is
 * published, so it is carried. Nothing else is: no tax number, no licence
 * number, no professional-body registration has ever appeared on the site, so
 * each stays `null` and the pages show `REGISTRATION.pending` in its place.
 */
export const REGISTRATION = {
  legalName: COMPANY.name,
  legalNameAr: COMPANY.nameAr,
  tradeName: COMPANY.name,
  /** English for DB seeds and vCards; `legalFormLoc` for anything rendered. */
  legalForm: LEGAL_FORM.en,
  legalFormAr: LEGAL_FORM.ar,
  legalFormLoc: LEGAL_FORM,
  /** No professional-body registration applies to a community association. */
  syndicateNo: null as string | null,
  /** The association's registration (رقم الإشهار), from its own emblem. */
  registerNo: "224 / 1977" as string | null,
  /** Tax registration (رقم التسجيل الضريبي). Not published. */
  taxNo: null as string | null,
  /** Licence number. Not published. */
  licenceNo: null as string | null,
  authority: AUTHORITY.en,
  authorityAr: AUTHORITY.ar,
  authorityLoc: AUTHORITY,
  /**
   * The registration year is known (1977) but no exact issue date and no
   * expiry is published, so the licence page renders no status badge.
   */
  issued: null as string | null,
  expires: null as string | null,
  registeredOffice: REGISTERED_OFFICE.en,
  registeredOfficeAr: REGISTERED_OFFICE.ar,
  registeredOfficeLoc: REGISTERED_OFFICE,
  country: EGYPT.en,
  countryLoc: EGYPT,
  phone: COMPANY.primaryPhone,
  mobile: COMPANY.phones[0],
  email: COMPANY.email,
  /**
   * Rendered in place of an identifier that has not been published. Keeping it
   * in one place stops "not on file" drifting into three different wordings.
   */
  pending: PENDING.en,
  pendingAr: PENDING.ar,
  pendingLoc: PENDING,
} as const;

/**
 * Offices. The association publishes one: the main office in Sahel Selim, at a
 * full street address — unlike the template this was built from, where only a
 * district was known. `addressIsComplete` is therefore true, and the contact
 * page renders the street line rather than just a city.
 */
export type Office = {
  slug: string;
  position: number;
  flag: string;
  /** Short label shown on the contact page. */
  role: string;
  roleAr: string;
  /** The same label in all five locales, for anything rendered. */
  roleLoc: Bi;
  city: string;
  cityAr: string;
  /** Street-level locality, as published. */
  area: string | null;
  areaAr: string | null;
  /** Localised `area`; null wherever `area` is null. */
  areaLoc: Bi | null;
  countryName: string;
  country: string;
  phone: string;
  email: string;
  /** True when `area` is the whole published address rather than part of it. */
  addressIsComplete: boolean;
};

export const OFFICES: Office[] = [
  {
    slug: "sahel-selim",
    position: 0,
    flag: "🇪🇬",
    role: "Main office",
    roleAr: "المقر الرئيسي",
    roleLoc: { en: "Main office", ar: "المقر الرئيسي", es: "Oficina principal", pt: "Escritório principal", fr: "Bureau principal" },
    city: "Sahel Selim",
    cityAr: "ساحل سليم",
    area: STREET.en,
    areaAr: STREET.ar,
    areaLoc: STREET,
    countryName: "Egypt",
    country: "EG",
    phone: COMPANY.primaryPhone,
    email: COMPANY.email,
    addressIsComplete: true,
  },
];

/**
 * Geographic scope. The association is a local one and says so — it works in
 * Sahel Selim and East Tanagha, in Assiut Governorate. No wider reach is
 * claimed anywhere on its site, so none is claimed here.
 */
export const REGIONS = [
  {
    flag: "🇪🇬",
    name: "Egypt",
    nameAr: "مصر",
    nameLoc: EGYPT,
    detail: "Sahel Selim and East Tanagha, Assiut Governorate",
    detailAr: "ساحل سليم والتناغة الشرقية، محافظة أسيوط",
    detailLoc: {
      en: "Sahel Selim and East Tanagha, Assiut Governorate",
      ar: "ساحل سليم والتناغة الشرقية، محافظة أسيوط",
      es: "Sahel Selim y Tanagha Este, gobernación de Asiut",
      pt: "Sahel Selim e Tanagha Este, governorado de Assiut",
      fr: "Sahel Selim et Tanagha-Est, gouvernorat d'Assiout",
    } as Bi,
    primary: true,
  },
] as const;

/**
 * The entity as it appears on public legal surfaces, rendered from one list so
 * it cannot be added to the licence pages and quietly forgotten on /about and
 * the policy documents.
 *
 * `refs` labels are keys resolved against the UI strings.
 */
export type LegalEntity = {
  flag: string;
  name: string;
  /** Abbreviation gloss shown after the name. */
  short?: string;
  form: string;
  authority?: string;
  refs: { label: "licence" | "syndicate" | "register" | "tax"; value: string | null }[];
  validTo?: string | null;
  office: string;
  /** Whether `office` is a full street address or just a city. */
  officeIsRegistered: boolean;
};

export const LEGAL_ENTITIES: LegalEntity[] = [
  {
    flag: "🇪🇬",
    name: REGISTRATION.legalName,
    form: REGISTRATION.legalForm,
    authority: REGISTRATION.authority,
    refs: [
      { label: "register", value: REGISTRATION.registerNo },
      { label: "tax", value: REGISTRATION.taxNo },
      { label: "licence", value: REGISTRATION.licenceNo },
    ],
    validTo: REGISTRATION.expires,
    office: REGISTRATION.registeredOffice,
    officeIsRegistered: true,
  },
];

/**
 * The association's fields of activity, exactly as its homepage lists them:
 * تحفيظ قرآن، كفالة يتيم، حضانة، مشغل، مشروعات خدمية، إقراض.
 */
export const ACTIVITIES = [
  {
    en: "Qur'an memorisation — circles, recitation and tajweed",
    es: "Memorización del Corán: círculos, recitación y taywid",
    pt: "Memorização do Alcorão — círculos, recitação e tajwid",
    fr: "Mémorisation du Coran — cercles, récitation et tajwid",
    ar: "تحفيظ القرآن الكريم — الحلقات والتلاوة والتجويد",
  },
  {
    en: "Orphan sponsorship and family support",
    es: "Apadrinamiento de huérfanos y apoyo a las familias",
    pt: "Apadrinhamento de órfãos e apoio às famílias",
    fr: "Parrainage d'orphelins et soutien aux familles",
    ar: "كفالة الأيتام ودعم الأسر",
  },
  {
    en: "Nursery, and maternal and child welfare",
    es: "Guardería y bienestar de madres e hijos",
    pt: "Creche e bem-estar de mães e crianças",
    fr: "Crèche et bien-être des mères et des enfants",
    ar: "الحضانة والارتقاء بمستوى الأم والطفل",
  },
  {
    en: "The workshop — training and employment",
    es: "El taller: formación y empleo",
    pt: "A oficina — formação e emprego",
    fr: "L'atelier — formation et emploi",
    ar: "المشغل — التدريب والتشغيل",
  },
  {
    en: "Community service projects and health awareness",
    es: "Proyectos de servicio comunitario y concienciación sanitaria",
    pt: "Projetos de serviço comunitário e sensibilização para a saúde",
    fr: "Projets de service communautaire et sensibilisation à la santé",
    ar: "المشروعات الخدمية والتوعية الصحية",
  },
  {
    en: "Lending to households and small projects",
    es: "Préstamos a familias y pequeños proyectos",
    pt: "Crédito a famílias e pequenos projetos",
    fr: "Prêts aux ménages et aux petits projets",
    ar: "الإقراض للأسر والمشروعات الصغيرة",
  },
] as const;

/**
 * Source-backed numbers only — no invented figures. The association publishes
 * no counts of students, orphans or loans, so none appear here; all three of
 * these are things it has actually stated. These pair with `STAT_LABELS` in
 * app/about/page.tsx, a fixed three-slot tuple, so the count here and the label
 * count there must stay at three.
 */
export const STATS = [
  { value: "1977", label: "Registered since" },
  { value: "6", label: "Fields of work" },
  { value: "224", label: "Registration number" },
] as const;

/**
 * The catalog categories, mirroring the `SolutionCategory` enum in the Prisma
 * schema. Kept here so a service group can only be given a category that the
 * schema actually has — assigning a new one is a deliberate two-file change
 * rather than a typo that silently 404s the marketplace filter.
 */
export const CATALOG_KEYS = [
  "SAAS_PLATFORM",
  "LAUNCH_KIT",
  "AI_AUTOMATION",
  "PRODUCTIZED_SERVICE",
  "MARKETPLACE_SOLUTION",
  "MARKET_ENABLEMENT",
] as const;

/**
 * The six fields of work the site navigates by.
 *
 * `key` is a catalog category from the shared enum — an internal routing
 * identifier (it drives /marketplace?category=) that is never shown to a
 * visitor, which is why these read as SaaS categories and not as charity work.
 * `slug` is the human-facing one and is shared with PRACTICE_AREAS in
 * brand-content.ts. `items` keys into SERVICE_ITEMS there for translation.
 */
export type ServiceGroup = {
  key: (typeof CATALOG_KEYS)[number];
  slug: string;
  title: string;
  blurb: string;
  items: readonly string[];
};

export const SERVICES: readonly ServiceGroup[] = [
  {
    key: "SAAS_PLATFORM",
    slug: "quran-memorisation",
    title: "Qur'an Memorisation",
    blurb:
      "Circles for memorising the Qur'an and learning recitation — the work the association was founded on when it was registered in 1977.",
    items: ["Qur'an memorisation circles", "Recitation and tajweed teaching"],
  },
  {
    key: "LAUNCH_KIT",
    slug: "orphan-sponsorship",
    title: "Orphan Sponsorship",
    blurb:
      "Sponsoring orphans and staying with their families, in a way that protects their dignity rather than making help a favour.",
    items: ["Orphan sponsorship", "Family follow-up and support"],
  },
  {
    key: "AI_AUTOMATION",
    slug: "nursery",
    title: "Nursery",
    blurb:
      "A nursery for the children of the local community, under the association's aim of improving the lot of mothers and children.",
    items: ["Nursery and early childcare", "Mother and child welfare"],
  },
  {
    key: "PRODUCTIZED_SERVICE",
    slug: "workshop",
    title: "The Workshop",
    blurb:
      "A workshop offering work and training, for women in particular — the association's stated value of active participation put into practice.",
    items: ["Workshop training and employment", "Women's participation programmes"],
  },
  {
    key: "MARKETPLACE_SOLUTION",
    slug: "service-projects",
    title: "Service Projects",
    blurb:
      "Service projects for the local community, disease-awareness work among them, as part of lifting the community.",
    items: ["Community service projects", "Health awareness campaigns"],
  },
  {
    key: "MARKET_ENABLEMENT",
    slug: "microlending",
    title: "Lending",
    blurb:
      "Lending that helps a household start something it can live from, rather than aid that ends when the aid ends.",
    items: ["Household lending", "Small-project support"],
  },
] as const;

/** What distinguishes the association — drawn from its published values. */
export const DIFFERENTIATORS = [
  {
    title: "Registered Since 1977",
    blurb:
      "A community association registered as no. 224 of 1977 — nearly fifty years of standing in the same place, for the same people.",
  },
  {
    title: "Transparent Decisions",
    blurb:
      "Decisions taken transparently, without favouring one party over another, in the common interest — the association's own first stated value.",
  },
  {
    title: "Decided By Consultation",
    blurb:
      "Consultation so that responsibility is genuinely shared, rather than decisions handed down and carried out by someone else.",
  },
  {
    title: "Women's Participation",
    blurb:
      "Active participation by the local community, women's participation named explicitly among the association's values and carried into the workshop.",
  },
  {
    title: "Dignity First",
    blurb:
      "Raising people up and preserving their dignity, treated as the thing a community's life depends on rather than a courtesy.",
  },
  {
    title: "Six Fields, One Association",
    blurb:
      "Memorisation, orphan care, the nursery, the workshop, service projects and lending — held together rather than split across bodies that never meet.",
  },
] as const;

/** How a request moves through the association — five stages. */
export const OPERATING_MODEL = [
  { title: "Reach Out", blurb: "A visit or a call to the main office in Sahel Selim." },
  { title: "Understand The Need", blurb: "Listening to the household and to the local community around it." },
  { title: "Consult", blurb: "The decision taken by consultation, transparently and without favour." },
  { title: "Deliver", blurb: "Memorisation, sponsorship, nursery place, training, a project or a loan." },
  { title: "Stay With It", blurb: "Follow-up with the family, because the need rarely ends with the first answer." },
] as const;

/** Public navigation — only routes that exist are linked. */
export const NAV = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/services", label: "What We Do" },
  { href: "/projects", label: "Projects" },
  { href: "/media", label: "Media Centre" },
  { href: "/careers", label: "Volunteer" },
  { href: "/contact", label: "Contact" },
] as const;

/**
 * The association's public contact identity.
 *
 * This is deliberately the office and not a person. The live contact page does
 * list eight personal names, but under no heading and with no role against any
 * of them — so naming one here as chairman, or assigning titles to the rest,
 * would attach invented roles to real private individuals. The contact card
 * therefore carries the association itself, which is what the published phone
 * numbers and mailbox actually reach. Replace this with named officers once the
 * association confirms who holds which office.
 */
export const LEADERSHIP = [
  {
    name: COMPANY.name,
    nameAr: COMPANY.nameAr,
    /** No honorific: the holder is an organisation, not a person. */
    title: "",
    titleAr: "",
    titleLoc: { en: "", ar: "", es: "", pt: "", fr: "" } as Bi,
    role: "Main office — Sahel Selim, Assiut",
    roleAr: "المقر الرئيسي — ساحل سليم، أسيوط",
    roleLoc: {
      en: "Main office — Sahel Selim, Assiut",
      ar: "المقر الرئيسي — ساحل سليم، أسيوط",
      es: "Oficina principal — Sahel Selim, Asiut",
      pt: "Escritório principal — Sahel Selim, Assiut",
      fr: "Bureau principal — Sahel Selim, Assiout",
    } as Bi,
    /** The association's own site is the public record that the card points at. */
    publicProfile: "https://gmquran.com/",
  },
] as const;
