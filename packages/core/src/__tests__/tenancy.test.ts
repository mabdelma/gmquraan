import { describe, expect, it } from "vitest";
import {
  PLAN_LIMITS,
  RESERVED_SLUGS,
  isGeneratedSchemaName,
  schemaNameFor,
  seatProblem,
  slugFromHostname,
  tenantHostname,
  tenantIsReachable,
  tenantSlugProblem,
  tenantTransitionProblem,
  tenantWriteProblem,
  trialExpired,
} from "../index.js";

describe("the workspace address", () => {
  it("accepts an ordinary one", () => {
    expect(tenantSlugProblem("acme")).toBeNull();
    expect(tenantSlugProblem("acme-holdings")).toBeNull();
    expect(tenantSlugProblem("acme2026")).toBeNull();
  });

  it("refuses anything that is not a hostname label", () => {
    expect(tenantSlugProblem("Acme")).toMatch(/lowercase/i);
    expect(tenantSlugProblem("acme corp")).toMatch(/lowercase letters, numbers/i);
    expect(tenantSlugProblem("acme.corp")).toMatch(/lowercase letters, numbers/i);
    expect(tenantSlugProblem("acme_corp")).toMatch(/lowercase letters, numbers/i);
    expect(tenantSlugProblem("-acme")).toMatch(/hyphen/i);
    expect(tenantSlugProblem("acme-")).toMatch(/hyphen/i);
  });

  it("refuses characters that would need escaping downstream", () => {
    // The slug is checked this narrowly so the generated schema name is
    // identifier-safe by construction rather than by quoting it later.
    expect(tenantSlugProblem("acme;drop")).toBeTruthy();
    expect(tenantSlugProblem('acme"corp')).toBeTruthy();
    expect(tenantSlugProblem("acme'or'1")).toBeTruthy();
    expect(tenantSlugProblem("../etc")).toBeTruthy();
  });

  it("refuses the punycode prefix", () => {
    // Otherwise a slug can render in the address bar as something entirely
    // different from what was registered.
    expect(tenantSlugProblem("xn--80ak6aa92e")).toMatch(/reserved/i);
  });

  it("refuses our own subdomains and the ones that read as official", () => {
    for (const s of ["www", "api", "central", "workforce", "core", "admin", "security", "billing"]) {
      expect(tenantSlugProblem(s)).toMatch(/reserved/i);
    }
  });

  it("refuses lengths outside the range", () => {
    expect(tenantSlugProblem("ab")).toMatch(/at least/i);
    expect(tenantSlugProblem("a".repeat(41))).toMatch(/at most/i);
  });

  it("refuses a double hyphen and an all-numeric label", () => {
    expect(tenantSlugProblem("ac--me")).toMatch(/two hyphens/i);
    expect(tenantSlugProblem("12345")).toMatch(/only numbers/i);
  });
});

describe("the schema name", () => {
  it("comes from the tenant id, not the slug", () => {
    // A customer can rebrand. If the schema tracked the slug, a rename would
    // mean renaming a live schema — or two tenants disagreeing about which
    // schema is theirs.
    const id = "clx1234abcd";
    expect(schemaNameFor(id)).toBe("t_clx1234abcd");
  });

  it("is always a bare identifier", () => {
    for (const id of ["clx-123_ABC", "cl!x@1#2", "CLX999"]) {
      const name = schemaNameFor(id);
      expect(name).toMatch(/^t_[a-z0-9]+$/);
      expect(isGeneratedSchemaName(name)).toBe(true);
    }
  });

  it("stays inside the Postgres identifier limit", () => {
    expect(schemaNameFor("a".repeat(200)).length).toBeLessThanOrEqual(63);
  });

  it("refuses to derive one from nothing", () => {
    expect(() => schemaNameFor("!!!")).toThrow();
  });

  it("rejects anything it did not generate", () => {
    // The last line of defence before a schema name reaches SQL.
    expect(isGeneratedSchemaName("public")).toBe(false);
    expect(isGeneratedSchemaName("t_acme; drop schema public")).toBe(false);
    expect(isGeneratedSchemaName('t_acme"')).toBe(false);
    expect(isGeneratedSchemaName("T_ACME")).toBe(false);
    expect(isGeneratedSchemaName("t_")).toBe(false);
  });
});

describe("resolving a hostname", () => {
  it("finds the tenant label", () => {
    expect(slugFromHostname("acme.example.com")).toBe("acme");
    expect(slugFromHostname("ACME.example.com")).toBe("acme");
    expect(slugFromHostname("acme.example.com:443")).toBe("acme");
  });

  it("never mistakes one of our own subdomains for a tenant", () => {
    for (const h of ["central", "workforce", "ai", "api", "www", "core"]) {
      expect(slugFromHostname(`${h}.example.com`)).toBeNull();
    }
  });

  it("returns null for the root and for anything off-domain", () => {
    expect(slugFromHostname("example.com")).toBeNull();
    expect(slugFromHostname("example.com.evil.test")).toBeNull();
    expect(slugFromHostname("evil.test")).toBeNull();
  });

  it("does not accept a nested label", () => {
    expect(slugFromHostname("a.b.example.com")).toBeNull();
  });

  it("round-trips with tenantHostname", () => {
    expect(slugFromHostname(tenantHostname("acme"))).toBe("acme");
  });
});

describe("what a tenant may do", () => {
  it("serves an active workspace", () => {
    expect(tenantIsReachable({ status: "ACTIVE" })).toBe(true);
    expect(tenantWriteProblem({ status: "ACTIVE" })).toBeNull();
  });

  it("keeps a suspended workspace readable", () => {
    // A customer who has not paid still has records they may be legally
    // required to produce. Locking them out to chase an invoice is not a lever
    // this should have.
    expect(tenantIsReachable({ status: "SUSPENDED" })).toBe(true);
    expect(tenantWriteProblem({ status: "SUSPENDED" })).toMatch(/read-only/i);
    expect(tenantWriteProblem({ status: "SUSPENDED" })).toMatch(/export/i);
  });

  it("does not serve one that is not provisioned yet", () => {
    expect(tenantIsReachable({ status: "PENDING" })).toBe(false);
    expect(tenantWriteProblem({ status: "PROVISIONING" })).toMatch(/being set up/i);
  });

  it("does not serve a closed one", () => {
    expect(tenantIsReachable({ status: "CLOSED" })).toBe(false);
  });
});

describe("trials", () => {
  it("has not expired without a date", () => {
    expect(trialExpired({ status: "ACTIVE" })).toBe(false);
  });

  it("expires on the date", () => {
    const now = new Date("2026-08-11T12:00:00Z");
    expect(trialExpired({ status: "ACTIVE", trialEndsAt: "2026-08-10T12:00:00Z" }, now)).toBe(true);
    expect(trialExpired({ status: "ACTIVE", trialEndsAt: "2026-08-12T12:00:00Z" }, now)).toBe(false);
  });
});

describe("seats", () => {
  it("allows another person below the limit", () => {
    expect(seatProblem({ plan: "TEAM", seats: 25, activeMembers: 24 })).toBeNull();
  });

  it("stops at the limit", () => {
    expect(seatProblem({ plan: "TEAM", seats: 25, activeMembers: 25 })).toMatch(/25 people/);
  });

  it("takes the lower of the plan ceiling and the seats bought", () => {
    // Buying 500 seats on a plan that caps at 25 does not raise the cap.
    expect(seatProblem({ plan: "TEAM", seats: 500, activeMembers: 25 })).toMatch(/25 people/);
    expect(seatProblem({ plan: "TRIAL", seats: 5, activeMembers: 5 })).toMatch(/5 people/);
  });

  it("reads as a sentence for one seat", () => {
    expect(seatProblem({ plan: "TRIAL", seats: 1, activeMembers: 1 })).toMatch(/1 person/);
  });

  it("only offers a dedicated database on enterprise", () => {
    expect(PLAN_LIMITS.ENTERPRISE.ownDatabase).toBe(true);
    expect(PLAN_LIMITS.BUSINESS.ownDatabase).toBe(false);
  });
});

describe("tenant lifecycle", () => {
  it("walks the ordinary path", () => {
    expect(tenantTransitionProblem("PENDING", "PROVISIONING")).toBeNull();
    expect(tenantTransitionProblem("PROVISIONING", "ACTIVE")).toBeNull();
    expect(tenantTransitionProblem("ACTIVE", "SUSPENDED")).toBeNull();
    expect(tenantTransitionProblem("SUSPENDED", "ACTIVE")).toBeNull();
  });

  it("will not delete a customer's records in one step", () => {
    // CLOSED is what drops the schema. Reaching it takes two deliberate moves,
    // the same as disposing of a single controlled document.
    expect(tenantTransitionProblem("ACTIVE", "CLOSED")).toMatch(/can only move to/i);
    expect(tenantTransitionProblem("CLOSING", "CLOSED")).toBeNull();
  });

  it("treats CLOSED as terminal", () => {
    expect(tenantTransitionProblem("CLOSED", "ACTIVE")).toMatch(/terminal/i);
  });

  it("lets a closing workspace be brought back", () => {
    expect(tenantTransitionProblem("CLOSING", "ACTIVE")).toBeNull();
  });

  it("refuses a move to the state it is already in", () => {
    expect(tenantTransitionProblem("ACTIVE", "ACTIVE")).toMatch(/already/i);
  });
});

describe("the reserved list", () => {
  it("covers every subdomain we actually serve", () => {
    for (const s of ["www", "api", "mail", "central", "workforce", "ai", "core", "passive", "ntfy"]) {
      expect(RESERVED_SLUGS).toContain(s);
    }
  });
});
