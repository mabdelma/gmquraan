import { prisma } from "@app/db";
import type { Locale } from "./i18n";
import { OFFICES } from "./content";
import { CARD_PEOPLE, type CardPerson, type PhoneKey, type RoleKey } from "./cards";
import { resolveBranches, pickBranches, shortLocation, type BranchRow } from "./branches";

/**
 * Storage behind the public /cards "Our Workforce" page.
 *
 * The WorkforcePerson table overrides the built-in CARD_PEOPLE list; when it is
 * empty the constant is used verbatim, so the page renders exactly as before
 * until someone opens /central/workforce. The resolver returns the same
 * CardPerson shape the pages and <BusinessCard> already consume, with one
 * optional addition — `roleLabel` — so people added later can carry a free-text
 * role while the original two keep their hand-written translations.
 */

export type ResolvedPerson = CardPerson & {
  roleLabel?: string;
  /** Branches this person belongs to; the source of their contact address. */
  branches: BranchRow[];
};

export type WorkforceRow = {
  id: string;
  slug: string;
  position: number;
  published: boolean;
  name: string;
  roleKey: string | null;
  roleCopy: Record<string, string> | null;
  email: string;
  location: string;
  linkedin: string | null;
  photo: string | null;
  phones: { key: PhoneKey; value: string; href: string }[];
  whatsappDisplay: string | null;
  whatsappHref: string | null;
  qrPath: string | null;
  vcfPath: string | null;
  branchSlugs: string[];
};

const asPhones = (v: unknown): { key: PhoneKey; value: string; href: string }[] =>
  Array.isArray(v) ? (v as { key: PhoneKey; value: string; href: string }[]) : [];

const asRoleCopy = (v: unknown): Record<string, string> | null =>
  v && typeof v === "object" ? (v as Record<string, string>) : null;

/** Digits-only form used for tel:/wa.me links. */
export const telHref = (value: string) => `tel:+${value.replace(/\D/g, "")}`;
export const waHref = (value: string) => `https://wa.me/${value.replace(/\D/g, "")}`;

/** Stored rows, ordered. Empty until somebody opens the editor. */
export async function getStoredPeople(): Promise<WorkforceRow[]> {
  const rows = await prisma.workforcePerson.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    position: r.position,
    published: r.published,
    name: r.name,
    roleKey: r.roleKey,
    roleCopy: asRoleCopy(r.roleCopy),
    email: r.email,
    location: r.location,
    linkedin: r.linkedin,
    photo: r.photo,
    phones: asPhones(r.phones),
    whatsappDisplay: r.whatsappDisplay,
    whatsappHref: r.whatsappHref,
    qrPath: r.qrPath,
    vcfPath: r.vcfPath,
    branchSlugs: Array.isArray(r.branchSlugs) ? (r.branchSlugs as string[]).map(String) : [],
  }));
}

/** The built-in list as storable rows — the seed and the fallback. */
export function defaultPeople(): Omit<WorkforceRow, "id">[] {
  return CARD_PEOPLE.map((p, i) => ({
    slug: p.slug,
    position: i,
    published: true,
    name: p.name,
    roleKey: p.role,
    roleCopy: null,
    email: p.email,
    location: p.location,
    linkedin: p.linkedin ?? null,
    photo: p.photo,
    phones: p.phones,
    whatsappDisplay: p.whatsapp.display,
    whatsappHref: p.whatsapp.href,
    qrPath: p.qr,
    vcfPath: p.vcf,
    // Everyone in the built-in list sits at the headquarters. Someone added
    // at /central/workforce picks their own branches there.
    branchSlugs: [OFFICES[0].slug],
  }));
}

const toPerson = (r: Omit<WorkforceRow, "id">, locale: Locale, branches: BranchRow[]): ResolvedPerson => ({
  slug: r.slug,
  name: r.name,
  // Keep a valid RoleKey for the legacy translation lookup; roleLabel wins when set.
  role: (r.roleKey as RoleKey) ?? "founder",
  roleLabel: r.roleKey ? undefined : r.roleCopy?.[locale] || r.roleCopy?.en || undefined,
  photo: r.photo || "",
  // Generated on demand when no hand-made asset exists.
  qr: r.qrPath || `/api/cards/${r.slug}/qr`,
  vcf: r.vcfPath || `/api/cards/${r.slug}/vcf`,
  email: r.email,
  phones: r.phones,
  whatsapp: { display: r.whatsappDisplay || "", href: r.whatsappHref || "" },
  linkedin: r.linkedin || undefined,
  // The stored location is a manual override; otherwise it is derived from the
  // selected branches so the card always agrees with the configured addresses.
  location: r.location || branches.map(shortLocation).join(" · "),
  branches,
});

/** Published workforce for rendering, stored rows winning over the constant. */
export async function resolvePeople(locale: Locale): Promise<ResolvedPerson[]> {
  const [stored, allBranches] = await Promise.all([getStoredPeople(), resolveBranches()]);
  const rows = stored.length ? stored : defaultPeople();
  return rows
    .filter((r) => r.published)
    .map((r) => toPerson(r, locale, pickBranches(allBranches, r.branchSlugs)));
}

/** One person by slug, or null. */
export async function resolvePerson(slug: string, locale: Locale): Promise<ResolvedPerson | null> {
  return (await resolvePeople(locale)).find((p) => p.slug === slug) ?? null;
}
