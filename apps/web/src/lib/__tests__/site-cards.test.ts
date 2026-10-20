import { describe, it, expect, vi } from "vitest";
import { SITE_SECTIONS, SECTION_FIELDS, defaultCards, copyFromLocales } from "../site-cards";
import { SERVICES, DIFFERENTIATORS, OPERATING_MODEL, STATS } from "../content";
import { LICENCE_ACTIVITIES } from "../licence-activities";
import { LOCALES } from "../i18n";
import { readSiteCardBody, validateSiteCard } from "../central-site-cards";

describe("site-cards defaults", () => {
  it("mirrors the built-in content one-for-one", () => {
    expect(defaultCards("services")).toHaveLength(SERVICES.length);
    expect(defaultCards("differentiators")).toHaveLength(DIFFERENTIATORS.length);
    expect(defaultCards("operating")).toHaveLength(OPERATING_MODEL.length);
    expect(defaultCards("stats")).toHaveLength(STATS.length);
    expect(defaultCards("licence")).toHaveLength(LICENCE_ACTIVITIES.length);
  });

  it("carries the hand-written translations, not just English", () => {
    const services = defaultCards("services");
    // Every locale we already authored should survive the import.
    for (const loc of LOCALES) {
      expect(services[0].copy[loc]?.title, `missing ${loc}`).toBeTruthy();
    }
    expect(services[0].copy.en.title).toBe(SERVICES[0].title);
  });

  it("keeps the category key that drives the marketplace link", () => {
    const services = defaultCards("services");
    expect(services.map((s) => s.meta?.key)).toEqual(SERVICES.map((s) => s.key));
  });

  it("keeps stat values and licence codes as untranslated meta", () => {
    expect(defaultCards("stats").map((s) => s.meta?.value)).toEqual(STATS.map((s) => s.value));
    const lic = defaultCards("licence");
    expect(lic[0].meta?.code).toBe(LICENCE_ACTIVITIES[0].code ?? "");
    expect(lic[0].meta?.entity).toBe(LICENCE_ACTIVITIES[0].entity);
  });

  it("gives every section a stable unique slug", () => {
    for (const section of SITE_SECTIONS) {
      const slugs = defaultCards(section).map((c) => c.slug);
      expect(new Set(slugs).size, `${section} has duplicate slugs`).toBe(slugs.length);
      expect(slugs.every(Boolean)).toBe(true);
    }
  });

  it("drops locales with no copy", () => {
    const copy = copyFromLocales(["title"], { en: { title: "Hi" }, es: { title: "" } });
    expect(copy.en).toEqual({ title: "Hi" });
    expect(copy.es).toBeUndefined();
  });
});

describe("site-card input handling", () => {
  const base = { section: "services", slug: "My Card!", copy: { en: { title: "T", blurb: "B" } } };

  it("slugifies and keeps only known locales and fields", () => {
    const d = readSiteCardBody({
      ...base,
      copy: {
        en: { title: "T", blurb: "B", bogus: "drop me" },
        klingon: { title: "nope" },
        es: { title: "Título" },
      },
    })!;
    expect(d.slug).toBe("my-card");
    expect(d.copy.en).toEqual({ title: "T", blurb: "B" });
    expect(d.copy.es).toEqual({ title: "Título" });
    expect(d.copy).not.toHaveProperty("klingon");
  });

  it("rejects an unknown section", () => {
    expect(readSiteCardBody({ ...base, section: "nope" })).toBeNull();
  });

  it("requires the English source copy", () => {
    const missingBlurb = readSiteCardBody({ ...base, copy: { en: { title: "T" } } })!;
    expect(validateSiteCard(missingBlurb)).toMatch(/English blurb/);

    const onlySpanish = readSiteCardBody({ ...base, copy: { es: { title: "T", blurb: "B" } } })!;
    expect(validateSiteCard(onlySpanish)).toMatch(/English/);

    expect(validateSiteCard(readSiteCardBody(base)!)).toBeNull();
  });

  it("requires a slug", () => {
    const d = readSiteCardBody({ ...base, slug: "!!!" })!;
    expect(validateSiteCard(d)).toMatch(/slug/i);
  });

  it("declares editable fields for every section", () => {
    for (const s of SITE_SECTIONS) expect(SECTION_FIELDS[s].length).toBeGreaterThan(0);
  });
});

// The whole design rests on "no rows → the site renders exactly as before",
// so exercise resolveSection against a stubbed database rather than trusting it.
describe("resolveSection fallback", () => {
  it("uses the built-in defaults when the table is empty", async () => {
    vi.resetModules();
    vi.doMock("@app/db", () => ({ prisma: { siteCard: { findMany: async () => [] } } }));
    const { resolveSection } = await import("../site-cards");

    const services = await resolveSection("services", "en");
    expect(services.map((s) => s.text.title)).toEqual(SERVICES.map((s) => s.title));
    expect(services.map((s) => s.meta.key)).toEqual(SERVICES.map((s) => s.key));
  });

  it("prefers stored rows over the defaults, and hides unpublished ones", async () => {
    vi.resetModules();
    vi.doMock("@app/db", () => ({
      prisma: {
        siteCard: {
          findMany: async () => [
            { id: "1", section: "services", slug: "a", position: 0, published: true, copy: { en: { title: "Edited", blurb: "B" } }, meta: { key: "SAAS_PLATFORM" } },
            { id: "2", section: "services", slug: "b", position: 1, published: false, copy: { en: { title: "Hidden", blurb: "B" } }, meta: {} },
          ],
        },
      },
    }));
    const { resolveSection } = await import("../site-cards");

    const services = await resolveSection("services", "en");
    expect(services).toHaveLength(1);
    expect(services[0].text.title).toBe("Edited");
  });

  it("falls back to the English text for a locale left blank", async () => {
    vi.resetModules();
    vi.doMock("@app/db", () => ({
      prisma: {
        siteCard: {
          findMany: async () => [
            { id: "1", section: "stats", slug: "s1", position: 0, published: true, copy: { en: { label: "Clients" }, es: { label: "Clientes" } }, meta: { value: "150+" } },
            { id: "2", section: "stats", slug: "s2", position: 1, published: true, copy: { en: { label: "Stories" } }, meta: { value: "15" } },
          ],
        },
      },
    }));
    // Stub the translator so the test never reaches the network.
    vi.doMock("../translate", () => ({ translateBatch: async (t: string[]) => t.map((s) => `[es]${s}`) }));
    const { resolveSection } = await import("../site-cards");

    const stats = await resolveSection("stats", "es");
    expect(stats[0].text.label).toBe("Clientes"); // authored — used verbatim
    expect(stats[1].text.label).toBe("[es]Stories"); // blank — machine-translated
  });
});
