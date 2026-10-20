import { prisma } from "@app/db";
import { OFFICES, REGISTRATION } from "./content";

/**
 * Branches — the legal entities / offices, configured at /central/branches.
 *
 * A branch is the single source of a contact address: each person on /cards
 * selects the branch(es) they belong to, and the card's Location block and the
 * vCard ADR follow from that instead of being hardcoded. Before this existed
 * every generated vCard carried the Spanish address regardless of where the
 * person actually sits.
 *
 * An empty table falls back to the built-in list below, so nothing depends on
 * anyone having opened the editor.
 */

export type BranchRow = {
  id: string;
  slug: string;
  position: number;
  published: boolean;
  country: string;
  flag: string | null;
  legalName: string;
  legalForm: string | null;
  registrationLabel: string | null;
  registrationNo: string | null;
  taxLabel: string | null;
  taxNo: string | null;
  authority: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  countryName: string;
  phone: string | null;
  email: string | null;
};

/** One-line postal address, skipping the parts a branch does not have. */
export function formatAddress(b: Pick<BranchRow, "addressLine1" | "addressLine2" | "city" | "region" | "postalCode" | "countryName">): string {
  return [b.addressLine1, b.addressLine2, b.postalCode ? `${b.postalCode} ${b.city}` : b.city, b.region, b.countryName]
    .filter(Boolean)
    .join(", ");
}

/** Short "City, Country" used for the card's Location line. */
export const shortLocation = (b: Pick<BranchRow, "city" | "countryName">) => `${b.city}, ${b.countryName}`;

/**
 * The offices already described in content.ts.
 *
 * Neither address is known below district level — the research pack flags the
 * exact street addresses as needing confirmation — so `addressLine1` carries
 * the locality where there is one and the city where there is not, rather than
 * a plausible-looking street that nobody has checked. Fill the street in at
 * /central/branches once it is confirmed and every card and vCard follows.
 *
 * The registration fields are `null` for the same reason: `REGISTRATION` has
 * no numbers yet, so the footer renders the entity without a licence number
 * rather than printing an empty label.
 */
export function defaultBranches(): Omit<BranchRow, "id">[] {
  return OFFICES.map((o) => ({
    slug: o.slug,
    position: o.position,
    published: true,
    country: o.country,
    flag: o.flag,
    legalName: REGISTRATION.legalName,
    legalForm: REGISTRATION.legalForm,
    registrationLabel: REGISTRATION.licenceNo ? "Licence" : null,
    registrationNo: REGISTRATION.licenceNo,
    taxLabel: REGISTRATION.taxNo ? "Tax No." : null,
    taxNo: REGISTRATION.taxNo,
    authority: REGISTRATION.authority,
    // Falls back to the city so `formatAddress` never renders ", , Egypt".
    addressLine1: o.area ?? o.city,
    addressLine2: null,
    city: o.city,
    region: null,
    postalCode: null,
    countryName: o.countryName,
    phone: o.phone,
    email: o.email,
  }));
}

const clean = (r: Record<string, unknown>): BranchRow => ({
  id: String(r.id ?? ""),
  slug: String(r.slug),
  position: Number(r.position ?? 0),
  published: r.published !== false,
  country: String(r.country),
  flag: (r.flag as string) ?? null,
  legalName: String(r.legalName),
  legalForm: (r.legalForm as string) ?? null,
  registrationLabel: (r.registrationLabel as string) ?? null,
  registrationNo: (r.registrationNo as string) ?? null,
  taxLabel: (r.taxLabel as string) ?? null,
  taxNo: (r.taxNo as string) ?? null,
  authority: (r.authority as string) ?? null,
  addressLine1: String(r.addressLine1),
  addressLine2: (r.addressLine2 as string) ?? null,
  city: String(r.city),
  region: (r.region as string) ?? null,
  postalCode: (r.postalCode as string) ?? null,
  countryName: String(r.countryName),
  phone: (r.phone as string) ?? null,
  email: (r.email as string) ?? null,
});

/** Stored branches, ordered. Empty until someone opens the editor. */
export async function getStoredBranches(): Promise<BranchRow[]> {
  const rows = await prisma.branch.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
  return rows.map((r) => clean(r as unknown as Record<string, unknown>));
}

/** Published branches for rendering — stored rows win over the built-in list. */
export async function resolveBranches(): Promise<BranchRow[]> {
  const stored = await getStoredBranches();
  const rows = stored.length ? stored : defaultBranches().map((b, i) => ({ ...b, id: `default-${i}` }));
  return rows.filter((b) => b.published);
}

/** Look up the branches a person belongs to, in the branches' own order. */
export function pickBranches(all: BranchRow[], slugs: string[]): BranchRow[] {
  const wanted = new Set(slugs);
  return all.filter((b) => wanted.has(b.slug));
}
