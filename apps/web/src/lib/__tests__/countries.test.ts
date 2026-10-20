import { describe, it, expect } from "vitest";
import {
  COUNTRIES,
  COUNTRIES_BY_NAME,
  flagOf,
  countryLabel,
  splitPhone,
  joinPhone,
  countryOfPhone,
  splitLocation,
  joinLocation,
} from "../countries";

describe("country data", () => {
  it("has unique ISO codes and plausible dial codes", () => {
    const iso = COUNTRIES.map((c) => c.iso2);
    expect(new Set(iso).size).toBe(iso.length);
    for (const c of COUNTRIES) {
      expect(c.iso2, c.name).toMatch(/^[A-Z]{2}$/);
      expect(c.dial, c.name).toMatch(/^[1-9]\d{0,3}$/);
      expect(c.name.length, c.iso2).toBeGreaterThan(1);
    }
  });

  it("carries the dial codes this business actually uses", () => {
    const dial = (iso: string) => COUNTRIES.find((c) => c.iso2 === iso)?.dial;
    expect(dial("ES")).toBe("34");
    expect(dial("AE")).toBe("971");
    expect(dial("CA")).toBe("1");
    expect(dial("EG")).toBe("20");
  });

  it("derives flags from the ISO code", () => {
    expect(flagOf("CA")).toBe("🇨🇦");
    expect(flagOf("ES")).toBe("🇪🇸");
    expect(flagOf("AE")).toBe("🇦🇪");
    expect(flagOf("zz9")).toBe("");
  });

  it("labels an option readably", () => {
    expect(countryLabel({ iso2: "CA", name: "Canada", dial: "1" })).toBe("🇨🇦 Canada +1");
  });

  it("sorts by name for the picker", () => {
    const names = COUNTRIES_BY_NAME.map((c) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});

describe("splitting a stored phone number", () => {
  it("preserves the national part's original spacing", () => {
    // These are the formats already stored in production; editing someone must
    // not silently rewrite their number.
    expect(splitPhone("(+971) 50 000 0000")).toEqual({ dial: "971", national: "50 000 0000" });
    expect(splitPhone("+34 600 00 00 00")).toEqual({ dial: "34", national: "600 00 00 00" });
    expect(splitPhone("+1 (555) 555-0102")).toEqual({ dial: "1", national: "(555) 555-0102" });
    expect(splitPhone("+20 100 000 0000")).toEqual({ dial: "20", national: "100 000 0000" });
  });

  it("prefers the longest matching dial code", () => {
    // +1868 (Trinidad) must win over +1, or the national part loses digits.
    expect(splitPhone("+1868 555 0100").dial).toBe("1868");
  });

  it("leaves an unrecognised number in the national part", () => {
    expect(splitPhone("555 0100")).toEqual({ dial: "", national: "555 0100" });
    expect(splitPhone("")).toEqual({ dial: "", national: "" });
  });

  it("round-trips without mangling", () => {
    for (const n of ["+1 555 555 0106", "+1 555 555 0102", "+1 555 555 0103", "+20 102 249 4516"]) {
      const { dial, national } = splitPhone(n);
      expect(joinPhone(dial, national)).toBe(n);
    }
  });

  it("joins sensibly when a part is missing", () => {
    expect(joinPhone("1", "")).toBe("+1");
    expect(joinPhone("", "555 555 0102")).toBe("555 555 0102");
    expect(joinPhone("34", " 600 00 00 00 ")).toBe("+34 600 00 00 00");
  });

  it("disambiguates shared dial codes with a hint", () => {
    expect(countryOfPhone("+1 555 555 0102", "CA")?.iso2).toBe("CA");
    expect(countryOfPhone("+1 212 555 0100", "US")?.iso2).toBe("US");
    expect(countryOfPhone("+34 600 00 00 00")?.iso2).toBe("ES");
  });
});

describe("splitting a stored location", () => {
  it("separates city from a known country", () => {
    expect(splitLocation("Example Village, Canada")).toEqual({ city: "Example Village", country: "Canada" });
    expect(splitLocation("Tudela de Duero, Spain")).toEqual({ city: "Tudela de Duero", country: "Spain" });
  });

  it("only splits when the trailing segment is a real country", () => {
    // "UAE" is not the country's name in the list, so nothing is taken off.
    expect(splitLocation("Example City, UAE")).toEqual({ city: "Example City, UAE", country: "" });
    // A recognised trailing country is split off, keeping the rest as the city.
    expect(splitLocation("Example Town, Castilla y León, Spain")).toEqual({
      city: "Example Town, Castilla y León",
      country: "Spain",
    });
    expect(splitLocation("Example City, UAE · Example Town, Spain")).toEqual({
      city: "Example City, UAE · Example Town",
      country: "Spain",
    });
  });

  it("handles a bare country and a bare city", () => {
    expect(splitLocation("Spain")).toEqual({ city: "", country: "Spain" });
    expect(splitLocation("North City")).toEqual({ city: "North City", country: "" });
    expect(splitLocation("")).toEqual({ city: "", country: "" });
  });

  it("round-trips", () => {
    for (const l of ["Example Village, Canada", "North City, Example Country", "Spain"]) {
      const { city, country } = splitLocation(l);
      expect(joinLocation(city, country)).toBe(l);
    }
  });
});
