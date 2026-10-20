import { describe, it, expect, vi, afterEach } from "vitest";
import { defaultBranches, formatAddress, shortLocation, pickBranches, type BranchRow } from "../branches";
import { readBranchBody, validateBranch } from "../central-branches";
import { COMPANY, OFFICES, REGISTRATION } from "../content";
import { buildVCard } from "../vcard";

afterEach(() => vi.resetModules());

const branch = (over: Partial<BranchRow> = {}): BranchRow => ({
  id: "b1",
  slug: "spain",
  position: 0,
  published: true,
  country: "Spain",
  flag: "🇪🇸",
  legalName: "Unskinned, S.L.",
  legalForm: "Sociedad Limitada",
  registrationLabel: "CIF",
  registrationNo: "B88990122",
  taxLabel: null,
  taxNo: null,
  authority: null,
  addressLine1: "Calle Atlántico 28",
  addressLine2: null,
  city: "Tudela de Duero",
  region: "Example Town",
  postalCode: "47320",
  countryName: "Spain",
  phone: null,
  email: null,
  ...over
});

describe("branch defaults", () => {
  it("seeds one branch per office in content.ts", () => {
    const d = defaultBranches();
    expect(d.map((b) => b.slug)).toEqual(OFFICES.map((o) => o.slug));
    expect(d.every((b) => b.legalName === REGISTRATION.legalName)).toBe(true);
  });

  it("leaves the registration fields empty rather than inventing one", () => {
    // REGISTRATION has no numbers yet. A label with no value renders as a
    // broken line in the footer, so both have to be null together.
    for (const b of defaultBranches()) {
      expect(b.registrationNo).toBeNull();
      expect(b.registrationLabel).toBeNull();
      expect(b.taxNo).toBeNull();
      expect(b.taxLabel).toBeNull();
    }
  });

  it("never emits an empty address segment", () => {
    // The association publishes a full street line, so addressLine1 is filled
    // from it rather than falling back to the city. The guard stays because the
    // fallback still has to hold for any office added later with only a city —
    // without it formatAddress produces ", , Egypt".
    for (const b of defaultBranches()) {
      expect(b.addressLine1).toBeTruthy();
      expect(formatAddress(b)).not.toMatch(/,\s*,/);
      expect(formatAddress(b)).toContain("Egypt");
    }
  });

  it("gives every office a reachable phone and mailbox", () => {
    for (const b of defaultBranches()) {
      expect(b.phone).toBeTruthy();
      expect(b.email).toContain(`@${COMPANY.domain}`);
    }
  });
});

describe("address formatting", () => {
  it("joins only the parts a branch has", () => {
    expect(formatAddress(branch())).toBe("Calle Atlántico 28, 47320 Tudela de Duero, Example Town, Spain");
    expect(formatAddress(branch({ postalCode: null, region: null, addressLine2: null }))).toBe(
      "Calle Atlántico 28, Tudela de Duero, Spain"
    );
  });

  it("gives a short City, Country line for the card", () => {
    expect(shortLocation(branch())).toBe("Tudela de Duero, Spain");
  });
});

describe("picking a person's branches", () => {
  const all = [branch(), branch({ id: "b2", slug: "uae", country: "UAE", city: "Example City", countryName: "United Arab Emirates" })];

  it("returns them in the branches' own order, not the person's", () => {
    expect(pickBranches(all, ["uae", "spain"]).map((b) => b.slug)).toEqual(["spain", "uae"]);
  });

  it("silently skips slugs that no longer exist", () => {
    expect(pickBranches(all, ["spain", "atlantis"]).map((b) => b.slug)).toEqual(["spain"]);
  });
});

describe("branch input handling", () => {
  const base = {
    country: "Canada",
    legalName: "Unskinned Technology Inc.",
    addressLine1: "Example Village",
    city: "Example Village",
    countryName: "Canada"
  };

  it("derives a slug from the branch name", () => {
    expect(readBranchBody(base).slug).toBe("canada");
    expect(readBranchBody({ ...base, slug: "CA Office!" }).slug).toBe("ca-office");
  });

  it("defaults the country field to the branch name", () => {
    expect(readBranchBody({ ...base, countryName: "" }).countryName).toBe("Canada");
  });

  it("requires the fields a card cannot render without", () => {
    expect(validateBranch(readBranchBody(base))).toBeNull();
    expect(validateBranch(readBranchBody({ ...base, legalName: "" }))).toMatch(/Legal name/);
    expect(validateBranch(readBranchBody({ ...base, addressLine1: "" }))).toMatch(/Address line 1/);
    expect(validateBranch(readBranchBody({ ...base, city: "" }))).toMatch(/City/);
  });

  it("refuses a registration number with no label", () => {
    expect(validateBranch(readBranchBody({ ...base, registrationNo: "0000000-0" }))).toMatch(/label/);
    expect(
      validateBranch(readBranchBody({ ...base, registrationNo: "0000000-0", registrationLabel: "Corporation No." }))
    ).toBeNull();
  });
});

/** vCard folds at 75 octets; parsers unfold before reading. Do the same here. */
const unfold = (v: string) => v.split(String.fromCharCode(13, 10) + ' ').join('');

describe("vCard uses the person's own branches", () => {
  const person = {
    slug: "x",
    name: "Test Person",
    role: "founder" as const,
    photo: "",
    qr: "",
    vcf: "",
    email: "t@example.com",
    phones: [{ key: "company" as const, value: "+1 555 555 0102", href: "tel:+15555550102" }],
    whatsapp: { display: "", href: "" },
    location: "",
    branches: [] as BranchRow[]
  };

  it("emits an ADR per branch, not a fixed office", () => {
    const ca = branch({
      slug: "canada",
      country: "Canada",
      legalName: "Unskinned Technology Inc.",
      registrationLabel: "Corporation No.",
      registrationNo: "0000000-0",
      addressLine1: "Example Village",
      city: "Example Village",
      region: "Ontario",
      postalCode: null,
      countryName: "Canada"
    });
    const v = unfold(buildVCard({ ...person, branches: [ca] }, "Director"));
    expect(v).toContain(`ORG:${COMPANY.name};Unskinned Technology Inc.`);
    expect(v).toMatch(/ADR;TYPE=WORK;LABEL=Unskinned Technology Inc\./);
    expect(v).toContain("Ontario");
    // Crucially, the Spanish address must not leak onto a Canadian card.
    expect(v).not.toMatch(/Atl.ntico/);
    expect(v).not.toContain("B88990122");
  });

  it("carries each branch's own registration block", () => {
    const v = unfold(buildVCard({ ...person, branches: [branch()] }, "Founder"));
    expect(v).toContain("X-SPAIN-COMPANY:Unskinned\\, S.L.");
    expect(v).toContain("X-SPAIN-CIF:B88990122");
  });

  it("handles someone who splits two branches", () => {
    const uae = branch({
      slug: "uae",
      country: "UAE",
      legalName: "Unskinned",
      registrationLabel: "Licence",
      registrationNo: "CN-0000000",
      addressLine1: "Example City",
      city: "Example City",
      region: null,
      postalCode: null,
      countryName: "United Arab Emirates"
    });
    const v = unfold(buildVCard({ ...person, branches: [branch(), uae] }, "Founder & CEO"));
    expect((v.match(/ADR;TYPE=WORK/g) ?? [])).toHaveLength(2);
    expect(v).toContain("X-UAE-LICENCE:CN-0000000");
    expect(v).toMatch(/NOTE:.*Tudela de Duero/);
  });

  it("falls back to the free-text location with no branches", () => {
    const v = unfold(buildVCard({ ...person, location: "Somewhere, Earth" }, "Director"));
    expect(v).not.toContain("ADR;TYPE=WORK");
    expect(v).toContain("Somewhere\\, Earth");
  });
});
