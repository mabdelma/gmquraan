import { describe, expect, it } from "vitest";
import {
  annualisedMinor,
  canSeeCompensation,
  canSetCompensation,
  compensationProblem,
  currentCompensation,
} from "../index.js";

const subject = { memberId: "emp" };

describe("who may see pay", () => {
  it("always lets somebody see their own", () => {
    expect(canSeeCompensation({ id: "emp", role: "EMPLOYEE" }, subject)).toBe(true);
  });

  it("lets Finance and the two officers who answer for the total", () => {
    expect(canSeeCompensation({ id: "x", role: "CEO" }, subject)).toBe(true);
    expect(canSeeCompensation({ id: "x", role: "CFO" }, subject)).toBe(true);
    expect(canSeeCompensation({ id: "x", role: "EMPLOYEE", departmentId: "FIN" }, subject)).toBe(true);
  });

  it("does not let the line manager see it", () => {
    // A manager needs a budget and a band, not the individual figure — this is
    // the assumption that makes pay leak sideways through an organisation.
    expect(canSeeCompensation({ id: "boss", role: "MANAGER" }, subject)).toBe(false);
    expect(canSeeCompensation({ id: "boss", role: "ENTITY_GM" }, subject)).toBe(false);
  });

  it("does not extend it to group-wide roles as a class", () => {
    // Being technical does not come with reading everybody's salary. If that
    // is wanted it is a separate decision, made in the policy file.
    expect(canSeeCompensation({ id: "x", role: "CTO" }, subject)).toBe(false);
    expect(canSeeCompensation({ id: "x", role: "COO" }, subject)).toBe(false);
    expect(canSeeCompensation({ id: "x", role: "DOC_CONTROLLER" }, subject)).toBe(false);
  });

  it("shows a stranger nothing", () => {
    expect(canSeeCompensation({ id: "x", role: "EMPLOYEE" }, subject)).toBe(false);
  });
});

describe("who may change pay", () => {
  it("is narrower than reading — nobody sets their own", () => {
    expect(canSeeCompensation({ id: "emp", role: "CEO" }, { memberId: "emp" })).toBe(true);
    expect(canSetCompensation({ id: "emp", role: "CEO" }, { memberId: "emp" })).toBe(false);
  });

  it("lets Finance and the officers set somebody else's", () => {
    expect(canSetCompensation({ id: "x", role: "CFO" }, subject)).toBe(true);
    expect(canSetCompensation({ id: "x", role: "EMPLOYEE", departmentId: "FIN" }, subject)).toBe(true);
  });

  it("refuses everybody else", () => {
    expect(canSetCompensation({ id: "x", role: "MANAGER" }, subject)).toBe(false);
    expect(canSetCompensation({ id: "x", role: "COO" }, subject)).toBe(false);
  });
});

describe("validation", () => {
  const ok = { currency: "EUR", amountMinor: 4_500_000, period: "ANNUAL", effectiveFrom: "2026-01-01" };

  it("accepts a complete record", () => {
    expect(compensationProblem(ok)).toBeNull();
  });

  it("insists on a currency, an amount, a period and a date", () => {
    expect(compensationProblem({ ...ok, currency: null })).toMatch(/currency/);
    expect(compensationProblem({ ...ok, amountMinor: null })).toMatch(/amount/);
    expect(compensationProblem({ ...ok, period: null })).toMatch(/annual, monthly/);
    expect(compensationProblem({ ...ok, effectiveFrom: null })).toMatch(/takes effect/);
  });

  it("refuses zero, negative and fractional minor units", () => {
    expect(compensationProblem({ ...ok, amountMinor: 0 })).toMatch(/not a salary/);
    expect(compensationProblem({ ...ok, amountMinor: -100 })).toMatch(/not a salary/);
    // A fractional minor unit is a typo, not a salary.
    expect(compensationProblem({ ...ok, amountMinor: 1000.5 })).toMatch(/whole minor units/);
  });

  it("refuses a currency that is not a three-letter code", () => {
    expect(compensationProblem({ ...ok, currency: "euro" })).toMatch(/currency/);
  });
});

describe("annualisation", () => {
  it("scales by the stated convention", () => {
    expect(annualisedMinor(100, "ANNUAL")).toBe(100);
    expect(annualisedMinor(100, "MONTHLY")).toBe(1200);
    // 220 working days and 1,760 hours — written down because an
    // annualisation nobody records gets quoted as though it were a fact.
    expect(annualisedMinor(100, "DAILY")).toBe(22_000);
    expect(annualisedMinor(100, "HOURLY")).toBe(176_000);
  });
});

describe("which record is in force", () => {
  const a = { effectiveFrom: "2025-01-01", effectiveTo: "2026-01-01", tag: "old" };
  const b = { effectiveFrom: "2026-01-01", effectiveTo: null, tag: "current" };

  it("picks the one covering the date", () => {
    expect(currentCompensation([a, b], new Date("2026-06-01"))?.tag).toBe("current");
    expect(currentCompensation([a, b], new Date("2025-06-01"))?.tag).toBe("old");
  });

  it("returns nothing before the first record starts", () => {
    expect(currentCompensation([a, b], new Date("2024-01-01"))).toBeNull();
  });

  it("treats the end date as exclusive, so two records never both apply", () => {
    expect(currentCompensation([a, b], new Date("2026-01-01"))?.tag).toBe("current");
  });

  it("prefers the most recently effective when records overlap", () => {
    // Overlap is a data error somebody should fix; picking arbitrarily would
    // hide it and produce a different answer on different days.
    const overlapping = [
      { effectiveFrom: "2026-01-01", effectiveTo: null, tag: "first" },
      { effectiveFrom: "2026-03-01", effectiveTo: null, tag: "second" },
    ];
    expect(currentCompensation(overlapping, new Date("2026-06-01"))?.tag).toBe("second");
  });

  it("copes with an empty history", () => {
    expect(currentCompensation([], new Date())).toBeNull();
  });
});
