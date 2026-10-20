import { prisma } from "@app/db";
import type { Locale } from "./i18n";
import { LOCALES } from "./i18n";
import { SERVICES, DIFFERENTIATORS, OPERATING_MODEL, STATS } from "./content";
import { LICENCE_ACTIVITIES, type LicenceActivity } from "./licence-activities";
import { getMessages } from "./messages";
import { translateBatch } from "./translate";

/**
 * Editable website cards.
 *
 * Every section has a hardcoded default (content.ts / licence-activities.ts).
 * The SiteCard table *overrides* those defaults; when a section has no rows the
 * constants are used verbatim, so an empty table renders exactly as the site did
 * before this feature existed. That keeps the marketing pages working whether or
 * not anyone has opened the editor.
 *
 * Copy is stored per locale. A locale the editor left blank falls back to the
 * English text run through translateBatch — the same runtime machine
 * translation the licence pages already use.
 */

export const SITE_SECTIONS = ["services", "differentiators", "operating", "stats", "licence"] as const;
export type SiteSection = (typeof SITE_SECTIONS)[number];

export const SECTION_LABEL: Record<SiteSection, string> = {
  services: "Services",
  differentiators: "Why Unskinned",
  operating: "Operating model",
  stats: "Stats",
  licence: "Licence activities",
};

/** Which fields each section's copy carries, for the editor to render. */
export const SECTION_FIELDS: Record<SiteSection, { key: string; label: string; multiline?: boolean }[]> = {
  services: [
    { key: "title", label: "Title" },
    { key: "blurb", label: "Blurb", multiline: true },
  ],
  differentiators: [
    { key: "title", label: "Title" },
    { key: "blurb", label: "Blurb", multiline: true },
  ],
  operating: [
    { key: "title", label: "Title" },
    { key: "blurb", label: "Blurb", multiline: true },
  ],
  stats: [{ key: "label", label: "Label" }],
  licence: [
    { key: "title", label: "Title" },
    { key: "description", label: "Description", multiline: true },
  ],
};

/** Untranslated extras per section, edited as plain fields. */
export const SECTION_META: Record<SiteSection, { key: string; label: string }[]> = {
  services: [{ key: "key", label: "Category key (drives /marketplace?category=)" }],
  differentiators: [],
  operating: [],
  stats: [{ key: "value", label: "Value (e.g. 150+)" }],
  licence: [
    { key: "code", label: "Code" },
    { key: "entity", label: "Entity (uae)" },
  ],
};

export type SiteCardRow = {
  id: string;
  section: string;
  slug: string;
  position: number;
  published: boolean;
  copy: Record<string, Record<string, string>>;
  meta: Record<string, string> | null;
};

type Copy = Record<string, Record<string, string>>;

const asCopy = (v: unknown): Copy => (v && typeof v === "object" ? (v as Copy) : {});
const asMeta = (v: unknown): Record<string, string> =>
  v && typeof v === "object" ? (v as Record<string, string>) : {};

/** Build the per-locale copy object for a card whose English text is known. */
export function copyFromLocales(
  fields: string[],
  perLocale: Partial<Record<Locale, Record<string, string>>>
): Copy {
  const out: Copy = {};
  for (const loc of LOCALES) {
    const v = perLocale[loc];
    if (!v) continue;
    const picked: Record<string, string> = {};
    for (const f of fields) if (v[f]) picked[f] = v[f];
    if (Object.keys(picked).length) out[loc] = picked;
  }
  return out;
}

// ─────────────────────────── defaults from the repo ───────────────────────────

/**
 * The current site content as SiteCard-shaped rows, in every locale we already
 * hand-wrote. Used both as the render-time fallback and as the seed payload.
 */
export function defaultCards(section: SiteSection): Omit<SiteCardRow, "id">[] {
  const perLocale = <T>(pick: (m: ReturnType<typeof getMessages>) => T) =>
    Object.fromEntries(LOCALES.map((l) => [l, pick(getMessages(l))])) as Record<Locale, T>;

  if (section === "services") {
    const m = perLocale((x) => x.services);
    return SERVICES.map((s, i) => ({
      section,
      slug: s.key,
      position: i,
      published: true,
      meta: { key: s.key },
      copy: copyFromLocales(
        ["title", "blurb"],
        Object.fromEntries(LOCALES.map((l) => [l, m[l][i]])) as Partial<Record<Locale, Record<string, string>>>
      ),
    }));
  }

  if (section === "differentiators") {
    const m = perLocale((x) => x.why.items);
    return DIFFERENTIATORS.map((d, i) => ({
      section,
      slug: `diff-${i + 1}`,
      position: i,
      published: true,
      meta: {},
      copy: copyFromLocales(
        ["title", "blurb"],
        Object.fromEntries(LOCALES.map((l) => [l, m[l][i]])) as Partial<Record<Locale, Record<string, string>>>
      ),
    }));
  }

  if (section === "operating") {
    const m = perLocale((x) => x.operating.items);
    return OPERATING_MODEL.map((o, i) => ({
      section,
      slug: `op-${i + 1}`,
      position: i,
      published: true,
      meta: {},
      copy: copyFromLocales(
        ["title", "blurb"],
        Object.fromEntries(LOCALES.map((l) => [l, m[l][i]])) as Partial<Record<Locale, Record<string, string>>>
      ),
    }));
  }

  if (section === "stats") {
    // Honest, document-backed numbers. English only — the editor's other
    // locales fall back to the runtime translator, exactly like the licence
    // activities section.
    return STATS.map((s, i) => ({
      section,
      slug: `stat-${i + 1}`,
      position: i,
      published: true,
      meta: { value: s.value },
      copy: { en: { label: s.label } },
    }));
  }

  // Licence activities are only authored in English; the other locales are
  // machine-translated at render time, as they already were.
  return LICENCE_ACTIVITIES.map((a, i) => ({
    section,
    slug: a.slug,
    position: i,
    published: true,
    meta: { code: a.code ?? "", entity: a.entity },
    copy: { en: { title: a.title, description: a.description } },
  }));
}

// ──────────────────────────────── reading ─────────────────────────────────────

/** Stored rows for a section, ordered. Empty when nobody has edited it yet. */
export async function getStoredCards(section: SiteSection): Promise<SiteCardRow[]> {
  const rows = await prisma.siteCard.findMany({
    where: { section },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    section: r.section,
    slug: r.slug,
    position: r.position,
    published: r.published,
    copy: asCopy(r.copy),
    meta: asMeta(r.meta),
  }));
}

/** Every section's rows at once, for the editor. */
export async function getAllStoredCards(): Promise<Record<SiteSection, SiteCardRow[]>> {
  const all = await prisma.siteCard.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
  const out = Object.fromEntries(SITE_SECTIONS.map((s) => [s, [] as SiteCardRow[]])) as Record<
    SiteSection,
    SiteCardRow[]
  >;
  for (const r of all) {
    if (!SITE_SECTIONS.includes(r.section as SiteSection)) continue;
    out[r.section as SiteSection].push({
      id: r.id,
      section: r.section,
      slug: r.slug,
      position: r.position,
      published: r.published,
      copy: asCopy(r.copy),
      meta: asMeta(r.meta),
    });
  }
  return out;
}

/**
 * Resolve a section for rendering: stored rows if any, else the constants —
 * then fill each requested field for `locale`, machine-translating from English
 * wherever the editor left a locale blank.
 */
export async function resolveSection(
  section: SiteSection,
  locale: Locale
): Promise<{ slug: string; meta: Record<string, string>; text: Record<string, string> }[]> {
  const stored = await getStoredCards(section);
  const rows = (stored.length ? stored : defaultCards(section)).filter((r) => r.published);
  const fields = SECTION_FIELDS[section].map((f) => f.key);

  // Collect the English strings that need translating (locale missing a value).
  const missing: string[] = [];
  const plan = rows.map((r) =>
    fields.map((f) => {
      const direct = r.copy?.[locale]?.[f];
      if (direct) return { field: f, value: direct, translateIdx: -1 };
      const en = r.copy?.en?.[f] ?? "";
      if (!en || locale === "en") return { field: f, value: en, translateIdx: -1 };
      missing.push(en);
      return { field: f, value: en, translateIdx: missing.length - 1 };
    })
  );

  const translated = missing.length ? await translateBatch(missing, locale) : [];

  return rows.map((r, i) => ({
    slug: r.slug,
    meta: asMeta(r.meta),
    text: Object.fromEntries(
      plan[i].map((p) => [p.field, p.translateIdx >= 0 ? translated[p.translateIdx] : p.value])
    ),
  }));
}

/**
 * Licence activities for rendering. Titles/descriptions come from the editor
 * when present; the long `items`/`opportunities` bodies stay in code, since
 * those are far too large to hand-maintain in a form.
 */
export async function resolveLicenceActivities(): Promise<LicenceActivity[]> {
  const stored = await getStoredCards("licence");
  if (!stored.length) return LICENCE_ACTIVITIES;

  const bySlug = new Map(stored.map((r) => [r.slug, r]));
  const merged = LICENCE_ACTIVITIES.filter((a) => bySlug.get(a.slug)?.published !== false).map((a) => {
    const row = bySlug.get(a.slug);
    if (!row) return a;
    return {
      ...a,
      title: row.copy?.en?.title || a.title,
      description: row.copy?.en?.description || a.description,
      code: row.meta?.code || a.code,
    };  });

  // Keep the editor's ordering for anything it knows about.
  const order = new Map(stored.map((r, i) => [r.slug, r.position ?? i]));
  return merged.sort((x, y) => (order.get(x.slug) ?? 1e6) - (order.get(y.slug) ?? 1e6));
}
