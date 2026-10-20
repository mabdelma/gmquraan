import { describe, it, expect } from "vitest";
import { categoryLabel, licenseLabel, formatPrice } from "@/lib/format";

describe("format", () => {
  it("falls back to English category labels", () => {
    expect(categoryLabel("SAAS_PLATFORM")).toBe("White-Label SaaS");
    expect(categoryLabel("UNKNOWN")).toBe("UNKNOWN");
  });

  it("uses a provided localized override", () => {
    expect(categoryLabel("SAAS_PLATFORM", { SAAS_PLATFORM: "SaaS marca blanca" })).toBe("SaaS marca blanca");
  });

  it("labels license models", () => {
    expect(licenseLabel("ONE_TIME")).toBe("One-time");
  });

  it("formats price and shows the contact label for 0", () => {
    expect(formatPrice(0, "EUR", "Contact for pricing")).toBe("Contact for pricing");
    expect(formatPrice(9900, "EUR")).toContain("99");
  });
});
