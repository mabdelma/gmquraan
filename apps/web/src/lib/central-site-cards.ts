import { LOCALES, type Locale } from "./i18n";
import { SITE_SECTIONS, SECTION_FIELDS, type SiteSection } from "./site-cards";

export type SiteCardInput = {
  section: SiteSection;
  slug: string;
  position: number;
  published: boolean;
  copy: Record<string, Record<string, string>>;
  meta: Record<string, string>;
};

const isSection = (v: string): v is SiteSection => (SITE_SECTIONS as readonly string[]).includes(v);
const isLocale = (v: string): v is Locale => (LOCALES as readonly string[]).includes(v);

/**
 * Normalise a request body. Unknown locales and unknown fields are dropped
 * rather than stored, so the editor can't wedge junk into the JSON columns.
 */
export function readSiteCardBody(b: Record<string, unknown>): SiteCardInput | null {
  const section = String(b.section ?? "");
  if (!isSection(section)) return null;

  const allowed = new Set(SECTION_FIELDS[section].map((f) => f.key));
  const rawCopy = (b.copy ?? {}) as Record<string, unknown>;
  const copy: Record<string, Record<string, string>> = {};
  for (const [loc, val] of Object.entries(rawCopy)) {
    if (!isLocale(loc) || !val || typeof val !== "object") continue;
    const picked: Record<string, string> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (!allowed.has(k)) continue;
      const s = String(v ?? "").trim();
      if (s) picked[k] = s;
    }
    if (Object.keys(picked).length) copy[loc] = picked;
  }

  const rawMeta = (b.meta ?? {}) as Record<string, unknown>;
  const meta: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawMeta)) {
    const s = String(v ?? "").trim();
    if (s) meta[k] = s;
  }

  return {
    section,
    slug: String(b.slug ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, ""),
    position: Number.isFinite(Number(b.position)) ? Number(b.position) : 0,
    published: b.published !== false,
    copy,
    meta,
  };
}

/** First validation failure, or null when the card is publishable. */
export function validateSiteCard(d: SiteCardInput): string | null {
  if (!d.slug) return "A slug is required";
  const required = SECTION_FIELDS[d.section].map((f) => f.key);
  const en = d.copy.en ?? {};
  for (const f of required) {
    if (!en[f]) return `English ${f} is required — it is the source every other locale falls back to`;
  }
  return null;
}
