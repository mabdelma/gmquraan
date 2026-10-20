import { describe, expect, it } from "vitest";
import {
  DEFAULT_JURISDICTION_FOR_COMPANY,
  REQUIRED_POLICIES,
  computeStatutoryDeductions,
  jurisdictionFor,
  missingPolicies,
  payrollBlocked,
  type JurisdictionConfig,
} from "../index.js";

const empty = (code: "ES" | "CA" | "EG" | "AE"): JurisdictionConfig => ({
  code,
  policies: {},
  enabled: false,
});

const complete = (code: "ES" | "CA" | "EG" | "AE", over: Partial<JurisdictionConfig> = {}): JurisdictionConfig => ({
  code,
  policies: Object.fromEntries(
    REQUIRED_POLICIES.map((k) => [k, { authority: "supplied by owner", suppliedAt: "2026-08-12" }])
  ) as JurisdictionConfig["policies"],
  enabled: true,
  ...over,
});

describe("who falls under which jurisdiction", () => {
  it("follows the company by default", () => {
    // Neveen is ORG-EG, Mohamed ORG-ES, Amira ORG-CA — the assignment the owner
    // confirmed, expressed as the default rather than hard-coded per person.
    expect(jurisdictionFor({ entityId: "ORG-EG" })).toBe("EG");
    expect(jurisdictionFor({ entityId: "ORG-ES" })).toBe("ES");
    expect(jurisdictionFor({ entityId: "ORG-CA" })).toBe("CA");
    expect(jurisdictionFor({ entityId: "ORG-UAE" })).toBe("AE");
  });

  it("lets the person's own assignment win over the company default", () => {
    // A secondment or cross-border contract: employed by one entity, taxed
    // under another regime.
    expect(jurisdictionFor({ entityId: "ORG-ES", jurisdiction: "EG" })).toBe("EG");
  });

  it("ignores an unrecognised jurisdiction rather than trusting it", () => {
    expect(jurisdictionFor({ entityId: "ORG-ES", jurisdiction: "XX" })).toBe("ES");
  });

  it("returns null when there is nothing to go on", () => {
    expect(jurisdictionFor({})).toBeNull();
    expect(jurisdictionFor({ entityId: "UNKNOWN-CO" })).toBeNull();
  });

  it("has a default for every company that exists", () => {
    for (const code of ["ORG-ES", "ORG-CA", "ORG-EG", "ORG-UAE"]) {
      expect(DEFAULT_JURISDICTION_FOR_COMPANY[code]).toBeTruthy();
    }
  });
});

describe("payroll is refused until the rules are supplied", () => {
  it("refuses every jurisdiction that has no policies", () => {
    // D-003. Spain, Canada and Example Country are named and assigned; none of their
    // statutory content has been supplied, so none may run.
    for (const code of ["ES", "CA", "EG"] as const) {
      const why = payrollBlocked(empty(code));
      expect(why).toBeTruthy();
      expect(why).toMatch(/statutory policies have not been supplied/i);
    }
  });

  it("names how many are missing so the gap is visible", () => {
    expect(missingPolicies(empty("ES"))).toHaveLength(REQUIRED_POLICIES.length);
    expect(payrollBlocked(empty("ES"))).toContain(`of ${REQUIRED_POLICIES.length}`);
  });

  it("still refuses a fully configured jurisdiction that nobody has signed off", () => {
    // A complete configuration is not the same as somebody accepting
    // responsibility for it.
    const c = complete("ES", { enabled: false });
    expect(payrollBlocked(c)).toMatch(/has not been signed off/i);
  });

  it("holds a jurisdiction whose policy has passed its review date", () => {
    const c = complete("CA");
    c.policies.income_tax_withholding = {
      authority: "advisor note",
      suppliedAt: "2025-01-01",
      reviewBy: "2026-01-01",
    };
    expect(payrollBlocked(c, new Date("2026-08-12"))).toMatch(/passed the review date/i);
  });

  it("allows a complete, signed-off, in-date jurisdiction through the gate", () => {
    expect(payrollBlocked(complete("EG"), new Date("2026-08-12"))).toBeNull();
  });
});

describe("the calculator", () => {
  it("refuses to produce a figure for an unsupplied jurisdiction", () => {
    const r = computeStatutoryDeductions(empty("ES"), { grossMinorOrDecimal: 100000, period: "2026-08" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/have not been supplied/i);
  });

  it("still refuses once configured, because no calculator exists", () => {
    // The gate opens and there is deliberately nothing behind it. A placeholder
    // returning zero would be a payroll engine that pays nobody their
    // deductions and looks like it worked.
    const r = computeStatutoryDeductions(complete("ES"), { grossMinorOrDecimal: 100000, period: "2026-08" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/no calculator is registered/i);
  });

  it("never returns a computed figure anywhere in this build", () => {
    for (const code of ["ES", "CA", "EG", "AE"] as const) {
      for (const c of [empty(code), complete(code)]) {
        expect(computeStatutoryDeductions(c, { grossMinorOrDecimal: 1, period: "2026-08" }).ok).toBe(false);
      }
    }
  });
});
