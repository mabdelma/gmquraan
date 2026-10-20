/**
 * The activities the office practises, broken into their scope — the detail
 * behind the two lines in `ACTIVITIES` (content.ts). Rendered at /licence
 * (index) and /licence/[slug] (detail).
 *
 * ── Why there are no numbers on this page ────────────────────────────────────
 * The supplied company profile states that the office holds an engineering
 * registration, an engineering stamp and a tax registration. It gives none of
 * the numbers, and the research pack lists the syndicate number, commercial
 * register number and tax number under "Information Not Yet Safely
 * Established". So this file carries no identifier at all, and the page shows
 * `REGISTRATION.pending` where a number belongs. `code` exists on the type for
 * the day a certificate supplies one — it is not a field anybody should fill
 * from memory.
 *
 * `opportunities` is what the activity authorises the office to take on. It
 * describes capability, never a commission: no client, project or value
 * appears here, because none has been evidenced.
 */

export type LicenceEntity = "eg";
export type LicenceItem = { name: string; detail: string };
export type LicenceActivity = {
  slug: string;
  entity: LicenceEntity;
  code?: string;
  title: string;
  titleAr: string;
  description: string;
  items: LicenceItem[];
  opportunities: string[];
};

export const LICENCE_ENTITIES: Record<LicenceEntity, { flag: string; label: string; sub: string }> = {
  eg: {
    flag: "🇪🇬",
    label: "Example Company",
    sub: "Engineering consultancy & general contracting office · Capital City and North City, Example Country · working since 2016 · 2 activities",
  },
};

export const LICENCE_ACTIVITIES: LicenceActivity[] = [
  {
    slug: "engineering-consultancy",
    entity: "eg",
    title: "Engineering Consultancy",
    titleAr: "الاستشارات الهندسية",
    description:
      "Design and the technical work that carries it to approval: architectural, structural, mechanical and electrical design, technical-office output, building permits and site supervision — issued through registered engineering offices.",
    items: [
      {
        name: "Architectural & Interior Design",
        detail: "Concept through to permit drawings, with interior design and space planning.",
      },
      {
        name: "Structural Design & Detailing",
        detail: "Analysis, reinforcement detailing, shop drawings and BIM coordination.",
      },
      {
        name: "Mechanical & Electrical Design",
        detail: "Services design coordinated against the architectural and structural set.",
      },
      {
        name: "Technical Office",
        detail: "Quantity takeoffs, payment statements and tender documentation.",
      },
      {
        name: "Permits & Approvals",
        detail: "Building permits and licensing submissions, pursued to approval.",
      },
      {
        name: "Engineering Reports",
        detail: "Stamped engineering reports and 2D/3D output for client and authority review.",
      },
    ],
    opportunities: [
      "The office's primary activity: every design, drawing set and report it issues falls under it.",
      "Covers consultancy before, during and after execution rather than ending at the permit.",
    ],
  },
  {
    slug: "general-contracting",
    entity: "eg",
    title: "General Contracting",
    titleAr: "المقاولات العامة",
    description:
      "Construction execution and resident site supervision — building what the consultancy side designs, or building to another designer's set, from breaking ground to handover.",
    items: [
      {
        name: "Construction Execution",
        detail: "General contracting on residential, commercial and administrative buildings.",
      },
      {
        name: "Site Supervision",
        detail: "Resident supervision, progress reporting and quality control on site.",
      },
      {
        name: "Contractor Tendering",
        detail: "Putting packages out to contractors and assessing the returns against the design.",
      },
      {
        name: "Handover Documentation",
        detail: "As-built records and the handover file at completion.",
      },
    ],
    opportunities: [
      "Lets one office hold both the design and the build, so there is no handover between firms that have never shared a drawing set.",
      "Supports work in Example Country and the office's stated activity in Region Two and Region Three.",
    ],
  },
];

export function getLicenceActivity(slug: string): LicenceActivity | undefined {
  return LICENCE_ACTIVITIES.find((a) => a.slug === slug);
}

export function activitiesByEntity(entity: LicenceEntity): LicenceActivity[] {
  return LICENCE_ACTIVITIES.filter((a) => a.entity === entity);
}
