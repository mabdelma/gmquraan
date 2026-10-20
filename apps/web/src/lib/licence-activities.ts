/**
 * The activities the association carries out, broken into their scope — the
 * detail behind the six lines in `ACTIVITIES` (content.ts), grouped into the
 * three areas they naturally fall into. Rendered at /licence (index) and
 * /licence/[slug] (detail).
 *
 * ── Which numbers appear on this page ───────────────────────────────────────
 * One: the association's registration, no. 224 of 1977, which it letters onto
 * its own emblem. It is carried in `REGISTRATION.registerNo` rather than here.
 * No tax number, licence number or professional-body registration has ever
 * appeared on the association's site, so the page shows `REGISTRATION.pending`
 * where those belong. `code` exists on the type for the day a certificate
 * supplies one — it is not a field anybody should fill from memory.
 *
 * `opportunities` is what the activity area covers. It describes the work,
 * never a particular case: no beneficiary, family or individual appears here,
 * and none should — these are people, not references.
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
    label: "Association for the Preservation of the Holy Qur'an",
    sub: "Registered community association · Sahel Selim, Assiut, Egypt · registered no. 224 of 1977 · 3 activities",
  },
};

export const LICENCE_ACTIVITIES: LicenceActivity[] = [
  {
    slug: "quranic-education",
    entity: "eg",
    title: "Qur'anic Education",
    titleAr: "التعليم القرآني",
    description:
      "The work the association was founded on: circles for memorising the Qur'an, and the teaching of recitation and tajweed that carries the memorisation properly.",
    items: [
      {
        name: "Memorisation Circles",
        detail: "Regular circles for memorising the Qur'an, open to the local community.",
      },
      {
        name: "Recitation & Tajweed",
        detail: "Teaching correct recitation alongside the memorisation rather than after it.",
      },
    ],
    opportunities: [
      "The association's founding activity, and the one its name is built around.",
      "Runs continuously rather than in terms, so a family can begin when it is ready to.",
    ],
  },
  {
    slug: "social-care",
    entity: "eg",
    title: "Social Care",
    titleAr: "الرعاية الاجتماعية",
    description:
      "Care for the people most exposed when a household is under strain: orphans and the families around them, and mothers and young children.",
    items: [
      {
        name: "Orphan Sponsorship",
        detail: "Sponsorship arranged so that it protects dignity rather than making help a favour.",
      },
      {
        name: "Family Follow-up",
        detail: "Staying with the family after the first arrangement, because the need rarely ends there.",
      },
      {
        name: "The Nursery",
        detail: "Early childcare for the children of the local community.",
      },
      {
        name: "Mother & Child Welfare",
        detail: "A stated objective of the association, pursued alongside the nursery.",
      },
    ],
    opportunities: [
      "Covers the association's objective of raising the standard of mother and child.",
      "Pairs sponsorship with follow-up, so support is a relationship and not a transfer.",
    ],
  },
  {
    slug: "community-development",
    entity: "eg",
    title: "Community Development",
    titleAr: "التنمية المجتمعية",
    description:
      "Work aimed at the community's own capacity: training and employment at the workshop, service projects including health awareness, and lending that lets a household start something of its own.",
    items: [
      {
        name: "The Workshop",
        detail: "Training and work, for women in particular, as the association's values name explicitly.",
      },
      {
        name: "Service Projects",
        detail: "Projects for the local community, decided by consultation with it.",
      },
      {
        name: "Health Awareness",
        detail: "Making families aware of the risks of disease — a stated objective of the association.",
      },
      {
        name: "Lending",
        detail: "Loans to households and small projects, so support outlasts the support itself.",
      },
    ],
    opportunities: [
      "Carries the association's value of active participation, women's participation especially, into practical work.",
      "Lending aims at a household living from its own work rather than returning each year for aid.",
    ],
  },
];

export function getLicenceActivity(slug: string): LicenceActivity | undefined {
  return LICENCE_ACTIVITIES.find((a) => a.slug === slug);
}

export function activitiesByEntity(entity: LicenceEntity): LicenceActivity[] {
  return LICENCE_ACTIVITIES.filter((a) => a.entity === entity);
}
