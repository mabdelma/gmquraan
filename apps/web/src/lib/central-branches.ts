import type { BranchRow } from "./branches";

export type BranchInput = Omit<BranchRow, "id">;

const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Normalise a request body into branch fields. */
export function readBranchBody(b: Record<string, unknown>): BranchInput {
  const str = (v: unknown) => String(v ?? "").trim();
  const orNull = (v: unknown) => str(v) || null;
  const country = str(b.country);
  return {
    slug: slugify(str(b.slug) || country),
    position: Number.isFinite(Number(b.position)) ? Number(b.position) : 0,
    published: b.published !== false,
    country,
    flag: orNull(b.flag),
    legalName: str(b.legalName),
    legalForm: orNull(b.legalForm),
    registrationLabel: orNull(b.registrationLabel),
    registrationNo: orNull(b.registrationNo),
    taxLabel: orNull(b.taxLabel),
    taxNo: orNull(b.taxNo),
    authority: orNull(b.authority),
    addressLine1: str(b.addressLine1),
    addressLine2: orNull(b.addressLine2),
    city: str(b.city),
    region: orNull(b.region),
    postalCode: orNull(b.postalCode),
    countryName: str(b.countryName) || country,
    phone: orNull(b.phone),
    email: orNull(b.email),
  };
}

/** First validation failure, or null when the branch is usable. */
export function validateBranch(d: BranchInput): string | null {
  if (!d.country) return "Branch name is required (e.g. Spain)";
  if (!d.slug) return "Could not derive a slug — add one manually";
  if (!d.legalName) return "Legal name is required — it appears on every card and vCard";
  if (!d.addressLine1) return "Address line 1 is required";
  if (!d.city) return "City is required";
  if (!d.countryName) return "Country is required";
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return "That email address is not valid";
  // A registration number without its label would render as a bare string.
  if (d.registrationNo && !d.registrationLabel) return "Give the registration number a label (CIF, Licence, …)";
  if (d.taxNo && !d.taxLabel) return "Give the tax number a label";
  return null;
}
