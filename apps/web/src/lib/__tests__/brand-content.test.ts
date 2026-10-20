import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LOCALES, type Locale } from "../i18n";
import { HERO, PRACTICE_AREAS, SECTIONS, SERVICE_ITEMS, SITE_NAV, VALUES, STEWARDSHIP, PAGE_META, type Bi } from "../brand-content";
import { DIFFERENTIATORS, NAV, OPERATING_MODEL, SERVICES } from "../content";
import { getMessages } from "../messages";
import { ALL_MEDIA, MEDIA_CLIPS, MEDIA_COLLECTIONS } from "../gallery";

const PUBLIC = join(process.cwd(), "public");

/** Every Bi object reachable from the brand copy, flattened for the sweep. */
function collectBi(node: unknown, out: Bi[] = []): Bi[] {
  if (!node || typeof node !== "object") return out;
  const rec = node as Record<string, unknown>;
  if (typeof rec.en === "string" && typeof rec.ar === "string") {
    out.push(rec as unknown as Bi);
    return out;
  }
  for (const v of Object.values(rec)) collectBi(v, out);
  return out;
}

describe("every string is translated into all five locales", () => {
  const all = collectBi([HERO, VALUES, PRACTICE_AREAS, STEWARDSHIP, SECTIONS, SITE_NAV, PAGE_META]);

  it("finds the copy to check", () => {
    expect(all.length).toBeGreaterThan(50);
  });

  it("has no empty or missing locale on any string", () => {
    for (const b of all) {
      for (const loc of LOCALES) {
        expect(b[loc as Locale], `${loc}: ${b.en}`).toBeTruthy();
      }
    }
  });
});

describe("the practice areas line up with the service inventory", () => {
  it("shares slugs with SERVICES, in the same order", () => {
    // /services renders PRACTICE_AREAS and indexes SERVICES[i].items beside it.
    // Reorder one without the other and a card gets another group's line items.
    expect(PRACTICE_AREAS.map((a) => a.slug)).toEqual(SERVICES.map((s) => s.slug));
  });

  it("points every card at an image that is actually installed", () => {
    for (const a of PRACTICE_AREAS) {
      expect(existsSync(join(PUBLIC, a.image)), a.image).toBe(true);
    }
  });
});

describe("the site navigation matches the canonical NAV", () => {
  it("links the same routes, in the same order", () => {
    expect(SITE_NAV.map((n) => n.href)).toEqual(NAV.map((n) => n.href));
  });
});

describe("the editable site-content sections stay index-aligned", () => {
  // defaultCards() in site-cards.ts pairs row i of each content array with
  // entry i of the matching messages array, in every locale.
  for (const loc of LOCALES) {
    it(`${loc}: counts match SERVICES / DIFFERENTIATORS / OPERATING_MODEL`, () => {
      const m = getMessages(loc as Locale);
      expect(m.services).toHaveLength(SERVICES.length);
      expect(m.why.items).toHaveLength(DIFFERENTIATORS.length);
      expect(m.operating.items).toHaveLength(OPERATING_MODEL.length);
    });
  }
});

describe("the media gallery", () => {
  it("references only files that are installed", () => {
    for (const m of ALL_MEDIA) {
      expect(existsSync(join(PUBLIC, m.src)), m.src).toBe(true);
    }
    for (const c of MEDIA_CLIPS) {
      expect(existsSync(join(PUBLIC, c.src)), c.src).toBe(true);
      expect(existsSync(join(PUBLIC, c.poster)), c.poster).toBe(true);
    }
  });

  it("uses each still exactly once", () => {
    const ids = ALL_MEDIA.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("describes every item in all five locales", () => {
    for (const m of ALL_MEDIA) {
      for (const loc of LOCALES) expect(m.alt[loc as Locale], `${loc}: ${m.id}`).toBeTruthy();
    }
  });

  it("names no client, project or location in any caption", () => {
    // The research pack rules these out without documentary evidence, and a
    // caption is the easiest place for one to be added later by accident.
    const rendered = JSON.stringify([MEDIA_COLLECTIONS, MEDIA_CLIPS]).toLowerCase();
    for (const banned of ["pulsa", "sasco", "uhcr", "unhcr"]) {
      expect(rendered, banned).not.toContain(banned);
    }
  });

  it("publishes only the association's own graphic material, not photographs of its activities", () => {
    // Everything in the gallery is graphic material the association itself
    // published — cards, an illustration, a banner. No photograph of its
    // circles, nursery or workshop exists in what it published, so none is
    // shown: a `kind: "photograph"` slipped in here would be claiming a
    // documentary image the association never supplied.
    expect(ALL_MEDIA.every((m) => m.kind === "graphic")).toBe(true);
    expect(ALL_MEDIA.some((m) => m.kind === "photograph")).toBe(false);
  });
});

describe("no locale is silently dropped at the render layer", () => {
  const SRC = join(process.cwd(), "src");

  /** Every .ts/.tsx under src, excluding the admin console and tests. */
  function walk(dir: string, out: string[] = []): string[] {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "__tests__" || e.name === "central") continue;
        walk(full, out);
      } else if (/\.tsx?$/.test(e.name)) out.push(full);
    }
    return out;
  }
  const files = walk(SRC);

  it("declares every `as Bi` literal in all five locales", () => {
    // `{ ar, en } as Bi` compiles — the assertion is permitted because Bi is
    // assignable to the narrower literal — so only a scan catches it.
    const lit = /\{(?:[^{}]|\{[^{}]*\})*\}\s*as\s+Bi\b/g;
    const keyOf = /(?:^|[\s{,])(en|ar|es|pt|fr)\s*:/g;
    const bad: string[] = [];
    for (const f of files) {
      const txt = readFileSync(f, "utf8");
      for (const m of txt.match(lit) ?? []) {
        const found = new Set([...m.matchAll(keyOf)].map((x) => x[1]));
        const missing = LOCALES.filter((l) => !found.has(l));
        if (missing.length) bad.push(`${f.replace(SRC, "src")}: missing ${missing.join(",")} — ${m.slice(0, 60)}`);
      }
    }
    expect(bad, bad.join("\n")).toEqual([]);
  });

  it("never picks a locale with a bare ar/en ternary over a Bi value", () => {
    // `locale === "ar" ? v.ar : v.en` throws away es/pt/fr even when the
    // string has them. Exactly three shapes are legitimately ar-or-not, and
    // each is allowed for a stated reason rather than by blanket exemption:
    //   - proper nouns: a person's or the brand's name in Arabic script
    //   - Arabic source copy handed to translateBatch for the other locales
    //   - text direction and the Arabic date locale, which really are binary
    // Anything else must go through t().
    const ternary = /(?:locale === "ar"|isAr)\s*\?[^;\n]{0,120}/g;
    const allowed = new RegExp(
      [
        "nameAr", "legalNameAr", "titleAr", "cityAr", "initials\\(",
        "\\.map\\(\\(x\\) => x\\.ar\\)",
        '"rtl"', '"ar-EG"',
      ].join("|")
    );
    const bad: string[] = [];
    for (const f of files) {
      for (const m of (readFileSync(f, "utf8").match(ternary) ?? [])) {
        if (!allowed.test(m)) bad.push(`${f.replace(SRC, "src")}: ${m.replace(/\s+/g, " ").slice(0, 100)}`);
      }
    }
    expect(bad, bad.join("\n")).toEqual([]);
  });
});

describe("the service inventory is translated, not machine-translated", () => {
  it("has a SERVICE_ITEMS entry for every English line item", () => {
    // translateBatch returns its input unchanged when OPENAI_API_KEY is unset,
    // so a missing entry here shows as an English bullet on the French page
    // rather than as an error. This turns that into a test failure.
    const missing = SERVICES.flatMap((s) => s.items).filter((i) => !SERVICE_ITEMS[i]);
    expect(missing, `untranslated: ${missing.join(", ")}`).toEqual([]);
  });

  it("translates each into all five locales", () => {
    for (const [en, bi] of Object.entries(SERVICE_ITEMS)) {
      for (const loc of LOCALES) expect(bi[loc as Locale], `${loc}: ${en}`).toBeTruthy();
    }
  });

  it("carries no entry that no service actually uses", () => {
    const used = new Set(SERVICES.flatMap((s) => s.items));
    const orphans = Object.keys(SERVICE_ITEMS).filter((k) => !used.has(k));
    expect(orphans, `orphaned: ${orphans.join(", ")}`).toEqual([]);
  });
});
