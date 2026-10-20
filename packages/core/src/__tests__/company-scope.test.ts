import { describe, expect, it } from "vitest";
import {
  canRead,
  canWrite,
  companyScopeFor,
  withinCompanyScope,
  type Record_,
  type Viewer,
} from "../index.js";

/**
 * SEC-T001 — "Company A user requests Company B employee by ID → 403/404
 * without data leakage" (`APP_Core_Developer_Exact_V2/tests/test_catalog.csv`,
 * priority Must).
 *
 * Before this suite there was no cross-company test anywhere in the repository,
 * which `scripts/discovery.mjs` reports. Every later domain inherits this axis,
 * so it is the first thing Wave 1 pins down.
 */

const viewer = (over: Partial<Viewer> = {}): Viewer => ({
  id: "u1",
  role: "EMPLOYEE",
  approvalLevel: "NONE" as never,
  clearance: "CONFIDENTIAL",
  ...over,
});

const record = (over: Partial<Record_> = {}): Record_ => ({
  confidentiality: "INTERNAL",
  ...over,
});

describe("SEC-T001 company scope", () => {
  it("refuses a record belonging to a company the viewer is not scoped in", () => {
    const v = viewer({ companyIds: ["ORG-ES"], role: "MANAGER" });
    const r = record({ entityId: "ORG-CA", ownerId: "someone-else" });
    expect(withinCompanyScope(v, r)).toBe(false);
    expect(canRead(v, r)).toBe(false);
    expect(canWrite(v, r)).toBe(false);
  });

  it("allows a record in a company the viewer is scoped in", () => {
    const v = viewer({ companyIds: ["ORG-ES", "ORG-CA"], role: "MANAGER", entityId: "ORG-ES" });
    expect(canRead(v, record({ entityId: "ORG-CA", ownerId: "u1" }))).toBe(true);
  });

  it("does not let a group-wide role cross a company boundary", () => {
    // The whole point. isGroupWide grants reach across the group the viewer is
    // authorised in, not across every company in the database — otherwise one
    // customer's chief executive reads another customer's records.
    for (const role of ["CEO", "COO", "CFO", "CTO", "DOC_CONTROLLER"] as const) {
      const v = viewer({ role, companyIds: ["ORG-ES"], clearance: "PRIVILEGED" });
      expect(canRead(v, record({ entityId: "OTHER-CO" }))).toBe(false);
    }
  });

  it("does not let ownership carry a record across a company boundary", () => {
    // Being named on a record is not authority to hold it in a company you have
    // been scoped out of.
    const v = viewer({ companyIds: ["ORG-ES"] });
    expect(canRead(v, record({ entityId: "ORG-CA", ownerId: "u1" }))).toBe(false);
  });

  it("does not let a reporting line carry a record across a company boundary", () => {
    const v = viewer({ role: "MANAGER", companyIds: ["ORG-ES"], reportIds: ["u2"] });
    expect(canRead(v, record({ entityId: "ORG-CA", ownerId: "u2" }))).toBe(false);
  });

  it("does not let an explicit access list override company scope", () => {
    // RESTRICTED records are granted by naming people. That grant is inside a
    // company, not instead of one.
    const v = viewer({ companyIds: ["ORG-ES"], clearance: "PRIVILEGED" });
    const r = record({ entityId: "ORG-CA", confidentiality: "RESTRICTED", accessList: ["u1"] });
    expect(canRead(v, r)).toBe(false);
  });

  it("still refuses an agent identity regardless of scope", () => {
    const v = viewer({ role: "AI_OPS", companyIds: ["ORG-ES"] });
    expect(canRead(v, record({ entityId: "ORG-ES" }))).toBe(false);
  });
});

describe("company scope, records without a company", () => {
  it("does not gate a record that belongs to no company", () => {
    const v = viewer({ companyIds: ["ORG-ES"] });
    expect(withinCompanyScope(v, record({ entityId: null }))).toBe(true);
    expect(withinCompanyScope(v, record({}))).toBe(true);
  });
});

describe("company scope, fail-closed default", () => {
  it("refuses a company-scoped record when the viewer has no scope at all", () => {
    // This was permissive while the axis was introduced and flipped in Wave 1.2
    // once toViewer populates the scope. A default that silently grants is
    // indistinguishable from a working control until it is the reason one
    // customer read another customer's records.
    const v = viewer({ companyIds: undefined });
    expect(withinCompanyScope(v, record({ entityId: "ANY-CO" }))).toBe(false);
    expect(canRead(v, record({ entityId: "ANY-CO" }))).toBe(false);
  });

  it("treats an empty scope the same as no scope", () => {
    const v = viewer({ companyIds: [] });
    expect(withinCompanyScope(v, record({ entityId: "ORG-ES" }))).toBe(false);
  });

  it("still lets an unscoped viewer see records that belong to no company", () => {
    // The gate is about crossing a company boundary. Where there is no
    // boundary, the ordinary rules decide.
    const v = viewer({ companyIds: undefined });
    expect(withinCompanyScope(v, record({ entityId: null }))).toBe(true);
  });
});

describe("resolving a member's company scope", () => {
  const ALL = ["ORG-ES", "ORG-UAE", "ORG-CA", "ORG-EG"];

  it("gives a group-wide role the whole group", () => {
    for (const role of ["CEO", "COO", "CFO", "CTO", "DOC_CONTROLLER"] as const) {
      expect(companyScopeFor({ role, entityId: "ORG-ES" }, ALL)).toEqual(ALL);
    }
  });

  it("confines everybody else to the company that employs them", () => {
    expect(companyScopeFor({ role: "MANAGER", entityId: "ORG-EG" }, ALL)).toEqual(["ORG-EG"]);
    expect(companyScopeFor({ role: "EMPLOYEE", entityId: "ORG-CA" }, ALL)).toEqual(["ORG-CA"]);
    expect(companyScopeFor({ role: "CONTRACTOR", entityId: "ORG-ES" }, ALL)).toEqual(["ORG-ES"]);
  });

  it("gives a member with no entity an empty scope, not a wildcard", () => {
    // An unassigned person is a data error, and the safe reading of a data
    // error in an authorization path is "less", never "everything".
    expect(companyScopeFor({ role: "EMPLOYEE", entityId: null }, ALL)).toEqual([]);
  });

  it("end to end: an employee of one company cannot read another's record", () => {
    const eg = viewer({ role: "EMPLOYEE", entityId: "ORG-EG" });
    eg.companyIds = companyScopeFor({ role: "EMPLOYEE", entityId: "ORG-EG" }, ALL);
    expect(canRead(eg, record({ entityId: "ORG-ES" }))).toBe(false);
    expect(canRead(eg, record({ entityId: "ORG-EG", ownerId: "u1" }))).toBe(true);
  });
});
