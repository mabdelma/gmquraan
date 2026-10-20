import { describe, it, expect, vi, afterEach } from "vitest";
import { defaultPeople, telHref, waHref } from "../cards-store";
import { CARD_PEOPLE } from "../cards";
import { readPersonBody, validatePerson, phoneProblem, PHONE_SLOTS } from "../central-people";
import { buildVCard } from "../vcard";

afterEach(() => vi.resetModules());

describe("workforce defaults", () => {
  it("mirrors the people already on /cards", () => {
    const d = defaultPeople();
    expect(d).toHaveLength(CARD_PEOPLE.length);
    expect(d.map((p) => p.slug)).toEqual(CARD_PEOPLE.map((p) => p.slug));
    // Hand-made QR and vCard assets must be carried over, not regenerated.
    expect(d[0].qrPath).toBe(CARD_PEOPLE[0].qr);
    expect(d[0].vcfPath).toBe(CARD_PEOPLE[0].vcf);
    expect(d[0].roleKey).toBe(CARD_PEOPLE[0].role);
  });
});

describe("phone link derivation", () => {
  it("strips formatting into dialable hrefs", () => {
    expect(telHref("(+1) 555 555 0103")).toBe("tel:+15555550103");
    expect(waHref("+1 555 555 0105")).toBe("https://wa.me/15555550105");
  });
});

describe("person input handling", () => {
  const base = {
    name: "Director Name",
    email: "director@gmquran.com",
    location: "Example Village",
    roleCopy: { en: "Director" },
    phones: [{ key: "company", value: "+1 555 555 0102" }],
  };

  it("derives slug and phone hrefs, never trusting client hrefs", () => {
    const d = readPersonBody({ ...base, phones: [{ key: "company", value: "+1 555 555 0102", href: "javascript:evil" }] });
    expect(d.slug).toBe("director-name");
    expect(d.phones[0].href).toBe("tel:+15555550102");
  });

  it("drops unknown locales and tolerates unknown phone keys", () => {
    const d = readPersonBody({
      ...base,
      phones: [{ key: "martian", value: "+9 999 9999", label: "Mars mobile" }],
      roleCopy: { en: "Director", klingon: "nope" },
    });
    // An unrecognised key falls back to a valid one; the custom label carries meaning.
    expect(d.phones[0].key).toBe("company");
    expect(d.phones[0].label).toBe("Mars mobile");
    expect(d.roleCopy).toEqual({ en: "Director" });
  });

  it("accepts a preset role key or free text, but requires one", () => {
    expect(validatePerson(readPersonBody(base))).toBeNull();
    expect(validatePerson(readPersonBody({ ...base, roleCopy: {}, roleKey: "ops" }))).toBeNull();
    expect(validatePerson(readPersonBody({ ...base, roleCopy: {} }))).toMatch(/role is required/i);
  });

  it("requires the first phone and leaves the rest optional", () => {
    expect(validatePerson(readPersonBody({ ...base, phones: [] }))).toMatch(/first phone number is required/i);
    // One is enough.
    expect(validatePerson(readPersonBody(base))).toBeNull();
    // Three is fine too.
    const three = readPersonBody({
      ...base,
      phones: [
        { key: "company", value: "+1 555 555 0102" },
        { key: "custom", label: "Canada mobile", value: "+1 416 555 0142" },
        { key: "secondaryMobile", value: "+1 555 555 0106" },
      ],
    });
    expect(three.phones).toHaveLength(3);
    expect(validatePerson(three)).toBeNull();
  });

  it("keeps phone order, so slot one is the primary", () => {
    const d = readPersonBody({
      ...base,
      phones: [
        { key: "secondaryMobile", value: "+1 555 555 0106" },
        { key: "company", value: "+1 555 555 0102" },
      ],
    });
    expect(d.phones.map((p) => p.value)).toEqual(["+1 555 555 0106", "+1 555 555 0102"]);
  });

  it("drops blank slots rather than storing them", () => {
    const d = readPersonBody({
      ...base,
      phones: [{ key: "company", value: "+1 555 555 0102" }, { key: "company", value: "" }, { key: "company", value: "  " }],
    });
    expect(d.phones).toHaveLength(1);
  });

  it("never stores more than the available slots", () => {
    const many = Array.from({ length: 6 }, () => ({ key: "company", value: "+1 555 555 0102" }));
    expect(readPersonBody({ ...base, phones: many }).phones).toHaveLength(PHONE_SLOTS);
  });

  it("validates WhatsApp with the same any-country rule", () => {
    expect(validatePerson(readPersonBody({ ...base, whatsappDisplay: "0555 555 0102" }))).toMatch(/country code/i);
    expect(validatePerson(readPersonBody({ ...base, whatsappDisplay: "+1 555 555 0102" }))).toBeNull();
  });

  it("rejects malformed contact details", () => {
    expect(validatePerson(readPersonBody({ ...base, email: "nope" }))).toMatch(/email/i);
    expect(validatePerson(readPersonBody({ ...base, linkedin: "linkedin.com/x" }))).toMatch(/https/i);
    expect(validatePerson(readPersonBody({ ...base, photo: "javascript:alert(1)" }))).toMatch(/Photo/);
  });

  it("derives the WhatsApp link from the number", () => {
    const d = readPersonBody({ ...base, whatsappDisplay: "+1 555 555 0102" });
    expect(d.whatsappHref).toBe("https://wa.me/15555550102");
  });
});

describe("vCard generation", () => {
  const person = {
    slug: "director-name",
    name: "Director Name",
    role: "founder" as const,
    photo: "",
    qr: "",
    vcf: "",
    email: "director@gmquran.com",
    phones: [{ key: "company" as const, value: "+1 555 555 0102", href: "tel:+15555550102" }],
    whatsapp: { display: "+1 555 555 0102", href: "https://wa.me/15555550102" },
    location: "Example Village",
    branches: [],
  };

  it("produces a well-formed vCard 3.0", () => {
    const v = buildVCard(person, "Director");
    expect(v.startsWith("BEGIN:VCARD\r\nVERSION:3.0")).toBe(true);
    expect(v.trimEnd().endsWith("END:VCARD")).toBe(true);
    expect(v).toContain("FN:Director Name");
    expect(v).toContain("TITLE:Director");
    expect(v).toContain("TEL;TYPE=WORK,VOICE:+15555550102");
    expect(v).toContain("EMAIL;TYPE=WORK,PREF:director@gmquran.com");
  });

  it("folds long lines to the 75-octet limit", () => {
    const v = buildVCard({ ...person, location: "x".repeat(200) }, "Director");
    for (const line of v.split("\r\n")) expect(line.length).toBeLessThanOrEqual(75);
  });

  it("escapes structural characters in values", () => {
    const v = buildVCard({ ...person, name: "Doe; Jane, PhD" }, "Director");
    expect(v).toContain("FN:Doe\\; Jane\\, PhD");
  });
});

describe("resolvePeople", () => {
  async function withDb(rows: unknown[]) {
    vi.resetModules();
    // resolvePeople also reads branches now; stub both tables.
    vi.doMock("@app/db", () => ({
      prisma: { workforcePerson: { findMany: async () => rows }, branch: { findMany: async () => [] } },
    }));
    return (await import("../cards-store")).resolvePeople;
  }

  it("falls back to the built-in list when the table is empty", async () => {
    const resolve = await withDb([]);
    const people = await resolve("en");
    expect(people.map((p) => p.slug)).toEqual(CARD_PEOPLE.map((p) => p.slug));
    expect(people[0].qr).toBe(CARD_PEOPLE[0].qr); // hand-made asset preserved
  });

  it("uses stored rows, hides unpublished, and generates missing assets", async () => {
    const resolve = await withDb([
      { id: "1", slug: "amira", position: 0, published: true, name: "Amira", roleKey: null, roleCopy: { en: "Director" }, email: "a@b.com", location: "Toronto", linkedin: null, photo: null, phones: [], whatsappDisplay: null, whatsappHref: null, qrPath: null, vcfPath: null, branchSlugs: [] },
      { id: "2", slug: "hidden", position: 1, published: false, name: "Hidden", roleKey: "ops", roleCopy: null, email: "h@b.com", location: "X", linkedin: null, photo: null, phones: [], whatsappDisplay: null, whatsappHref: null, qrPath: null, vcfPath: null, branchSlugs: [] },
    ]);
    const people = await resolve("en");
    expect(people.map((p) => p.name)).toEqual(["Amira"]);
    expect(people[0].roleLabel).toBe("Director");
    // No hand-made files, so the generated endpoints are used.
    expect(people[0].qr).toBe("/api/cards/amira/qr");
    expect(people[0].vcf).toBe("/api/cards/amira/vcf");
  });

  it("prefers the locale's role text, falling back to English", async () => {
    const resolve = await withDb([
      { id: "1", slug: "a", position: 0, published: true, name: "A", roleKey: null, roleCopy: { en: "Director", es: "Directora" }, email: "a@b.com", location: "X", linkedin: null, photo: null, phones: [], whatsappDisplay: null, whatsappHref: null, qrPath: null, vcfPath: null, branchSlugs: [] },
    ]);
    expect((await resolve("es"))[0].roleLabel).toBe("Directora");
    expect((await resolve("fr"))[0].roleLabel).toBe("Director");
  });
});

describe("any-country phone validation", () => {
  it("accepts numbers from anywhere, in the formats already in use", () => {
    for (const n of [
      "+1 555 555 0102",      // Canada
      "(+1) 555 555 0103",    // bracketed dial code, as stored today
      "+1 555 555 0106",     // Spain
      "+81-3-1234-5678",      // Japan
      "+27 21 555 0199",      // South Africa
      "+91.98765.43210",      // India
    ]) {
      expect(phoneProblem(n), n).toBeNull();
    }
  });

  it("rejects a missing country code", () => {
    expect(phoneProblem("555 555 0102")).toMatch(/country code/);
  });

  it("rejects letters and stray punctuation", () => {
    expect(phoneProblem("+1 647 CALL NOW")).toMatch(/only digits/);
  });

  it("rejects implausible lengths", () => {
    expect(phoneProblem("+1 234")).toMatch(/too short/);
    expect(phoneProblem("+1 234567890123456")).toMatch(/too long/);
  });
});
