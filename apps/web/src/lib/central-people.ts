import { LOCALES, type Locale } from "./i18n";
import type { PhoneKey } from "./cards";
import { telHref, waHref } from "./cards-store";

export const PHONE_KEYS: PhoneKey[] = ["primaryMobile", "secondaryMobile", "company"];

/** Three ordered phone slots; the first is required, the rest optional. */
export const PHONE_SLOTS = 3;

/**
 * Numbers may be from any country, so the only structural requirements are an
 * explicit country code and a plausible length. E.164 allows up to 15 digits;
 * 7 is about the shortest a real international number gets.
 */
export function phoneProblem(value: string): string | null {
  if (!value.includes("+")) return "include the country code, e.g. +1 555 555 0102";
  if (/[^0-9+()\-.\s]/.test(value)) return "only digits, spaces and + ( ) - . are allowed";
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7) return "too short to be an international number";
  if (digits.length > 15) return "too long — E.164 allows at most 15 digits";
  return null;
}

export type PersonInput = {
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
  phones: { key: PhoneKey; label?: string; value: string; href: string }[];
  whatsappDisplay: string | null;
  whatsappHref: string | null;
  qrPath: string | null;
  vcfPath: string | null;
  branchSlugs: string[];
};

const isLocale = (v: string): v is Locale => (LOCALES as readonly string[]).includes(v);
const isPhoneKey = (v: string): v is PhoneKey => (PHONE_KEYS as string[]).includes(v);

const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Normalise a request body; unknown locales/phone keys are dropped, not stored. */
export function readPersonBody(b: Record<string, unknown>): PersonInput {
  const str = (v: unknown) => String(v ?? "").trim();
  const orNull = (v: unknown) => str(v) || null;

  // Ordered slots: position 0 is the primary. Blank rows are dropped, so the
  // second and third being empty is simply "not provided".
  const rawPhones = Array.isArray(b.phones) ? (b.phones as Record<string, unknown>[]) : [];
  const phones = rawPhones
    .slice(0, PHONE_SLOTS)
    .map((p) => ({ key: str(p.key), label: str(p.label), value: str(p.value) }))
    .filter((p) => p.value)
    .map((p) => ({
      // key only drives the icon and the translated preset label now.
      key: (isPhoneKey(p.key) ? p.key : "company") as PhoneKey,
      ...(p.label ? { label: p.label } : {}),
      value: p.value,
      // href is always derived, never trusted from the client.
      href: telHref(p.value),
    }));

  const rawRole = (b.roleCopy ?? {}) as Record<string, unknown>;
  const roleCopy: Record<string, string> = {};
  for (const [loc, v] of Object.entries(rawRole)) {
    if (!isLocale(loc)) continue;
    const s = str(v);
    if (s) roleCopy[loc] = s;
  }

  const name = str(b.name);
  const wa = str(b.whatsappDisplay);
  const roleKey = str(b.roleKey);

  return {
    slug: slugify(str(b.slug) || name),
    position: Number.isFinite(Number(b.position)) ? Number(b.position) : 0,
    published: b.published !== false,
    name,
    roleKey: roleKey === "founder" || roleKey === "ops" ? roleKey : null,
    roleCopy: Object.keys(roleCopy).length ? roleCopy : null,
    email: str(b.email),
    location: str(b.location),
    linkedin: orNull(b.linkedin),
    photo: orNull(b.photo),
    phones,
    whatsappDisplay: wa || null,
    whatsappHref: wa ? waHref(wa) : null,
    qrPath: orNull(b.qrPath),
    vcfPath: orNull(b.vcfPath),
    // Slugs are validated against the real branches at the route, not here.
    branchSlugs: Array.isArray(b.branchSlugs)
      ? Array.from(new Set((b.branchSlugs as unknown[]).map((x) => str(x)).filter(Boolean)))
      : [],
  };
}

/** First validation failure, or null when the person is publishable. */
export function validatePerson(d: PersonInput): string | null {
  if (!d.name) return "Name is required";
  if (!d.slug) return "Could not derive a slug from that name — add one manually";
  if (!d.email) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return "That email address is not valid";
  // The card's location line comes from the branches; a free-text location is
  // only needed when no branch is selected.
  if (!d.location && !d.branchSlugs.length) {
    return "Pick at least one branch, or type a location";
  }
  if (!d.phones.length) return "The first phone number is required";
  for (const [i, ph] of d.phones.entries()) {
    const problem = phoneProblem(ph.value);
    if (problem) return `Phone ${i + 1} (${ph.value}): ${problem}`;
  }
  // WhatsApp is optional, but when given it is a phone number like any other.
  if (d.whatsappDisplay) {
    const problem = phoneProblem(d.whatsappDisplay);
    if (problem) return `WhatsApp (${d.whatsappDisplay}): ${problem}`;
  }
  // Either a legacy translated role key, or an English free-text role.
  if (!d.roleKey && !d.roleCopy?.en) return "A role is required (English, or pick a preset role)";
  if (d.linkedin && !/^https?:\/\//i.test(d.linkedin)) return "LinkedIn must be a full https:// URL";
  if (d.photo && !/^(https?:|\/|data:image\/)/.test(d.photo)) {
    return "Photo must be an https URL, an uploaded path, or a data:image/… URI";
  }
  return null;
}

/**
 * Prisma-safe shape for create/update. A nullable Json column rejects a bare
 * `null`, so `roleCopy` is omitted rather than nulled when there is none.
 */
export function toPrismaData(d: PersonInput) {
  const { roleCopy, ...rest } = d;
  return roleCopy ? { ...rest, roleCopy } : rest;
}
