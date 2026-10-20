import { describe, expect, it } from "vitest";
import {
  auditActionProblem,
  auditEntryProblem,
  canReadAudit,
  changedFields,
  redactForAudit,
} from "../index.js";

describe("redaction", () => {
  it("omits secrets entirely — the key does not survive", () => {
    // Presence in a long-lived log is itself the problem.
    const out = redactForAudit({
      email: "a@b.c",
      password: "hunter2",
      totpSecret: "JBSWY3DP",
      recoveryCodes: ["a", "b"],
      portalPasswordHash: "$2a$...",
    }) as Record<string, unknown>;

    expect(out.email).toBe("a@b.c");
    for (const k of ["password", "totpSecret", "recoveryCodes", "portalPasswordHash"]) {
      expect(k in out).toBe(false);
    }
  });

  it("redacts money but keeps the key, because the change is the point", () => {
    // A payroll approver may be entitled to know a salary was amended without
    // being entitled to the figure.
    const out = redactForAudit({ baseSalary: 54000, name: "A" }) as Record<string, unknown>;
    expect(out.baseSalary).toBe("[redacted]");
    expect(out.name).toBe("A");
  });

  it("reaches into nested objects and arrays", () => {
    const out = redactForAudit({
      user: { name: "A", password: "x", pay: { baseSalary: 1 } },
      list: [{ apiKey: "k", id: 1 }],
    }) as Record<string, Record<string, unknown>>;

    expect("password" in (out.user as Record<string, unknown>)).toBe(false);
    expect((out.user.pay as Record<string, unknown>).baseSalary).toBe("[redacted]");
    expect("apiKey" in ((out.list as unknown as Record<string, unknown>[])[0] ?? {})).toBe(false);
  });

  it("matches on a suffix, so tokenHash and sessionId are caught", () => {
    const out = redactForAudit({ tokenHash: "x", sessionId: "y", refreshToken: "z" }) as Record<string, unknown>;
    expect(Object.keys(out)).toHaveLength(0);
  });

  it("stops at a depth limit rather than recursing forever", () => {
    const deep: Record<string, unknown> = {};
    let cur = deep;
    for (let i = 0; i < 30; i++) {
      cur.next = {};
      cur = cur.next as Record<string, unknown>;
    }
    expect(() => redactForAudit(deep)).not.toThrow();
  });

  it("leaves primitives alone", () => {
    expect(redactForAudit("x")).toBe("x");
    expect(redactForAudit(3)).toBe(3);
    expect(redactForAudit(null)).toBeNull();
  });
});

describe("what changed", () => {
  it("keeps only the fields that differ, on both sides", () => {
    const d = changedFields(
      { name: "A", country: "Spain", status: "ACTIVE" },
      { name: "B", country: "Spain", status: "ACTIVE" }
    );
    expect(d.keys).toEqual(["name"]);
    expect(d.before).toEqual({ name: "A" });
    expect(d.after).toEqual({ name: "B" });
  });

  it("reports an added and a removed field", () => {
    const d = changedFields({ a: 1 }, { b: 2 });
    expect(d.keys.sort()).toEqual(["a", "b"]);
    expect(d.before).toEqual({ a: 1 });
    expect(d.after).toEqual({ b: 2 });
  });

  it("records that a salary changed without recording either figure", () => {
    // The reason the diff runs on raw values and redacts afterwards. Redacting
    // first makes two different salaries compare equal, and the audit then says
    // nothing changed — which defeats the only reason the entry exists.
    const d = changedFields({ baseSalary: 50000 }, { baseSalary: 60000 });
    expect(d.keys).toEqual(["baseSalary"]);
    expect(d.before).toEqual({ baseSalary: "[redacted]" });
    expect(d.after).toEqual({ baseSalary: "[redacted]" });
  });

  it("notices a secret rotated, and still does not write either value", () => {
    const d = changedFields({ totpSecret: "AAA", name: "A" }, { totpSecret: "BBB", name: "A" });
    expect(d.keys).toEqual(["totpSecret"]);
    // Omitted entirely — the key does not survive into the stored payload.
    expect(d.before).toEqual({});
    expect(d.after).toEqual({});
  });

  it("does not report a change when a redacted field is untouched", () => {
    expect(changedFields({ baseSalary: 50000 }, { baseSalary: 50000 }).keys).toEqual([]);
  });

  it("handles null and undefined states", () => {
    expect(changedFields(null, { a: 1 }).keys).toEqual(["a"]);
    expect(changedFields({ a: 1 }, null).keys).toEqual(["a"]);
    expect(changedFields(null, null).keys).toEqual([]);
  });
});

describe("action naming", () => {
  it("accepts domain.thing.verb", () => {
    expect(auditActionProblem("org.company.update")).toBeNull();
    expect(auditActionProblem("hr.leave.approve")).toBeNull();
    expect(auditActionProblem("doc.state.change")).toBeNull();
  });

  it("refuses uppercase and free text", () => {
    expect(auditActionProblem("Org.Company.Update")).toMatch(/lowercase/i);
    expect(auditActionProblem("updated the company")).toMatch(/domain\.thing\.verb/i);
    expect(auditActionProblem("update")).toMatch(/domain\.thing\.verb/i);
    expect(auditActionProblem("")).toMatch(/needs an action/i);
  });
});

describe("entry validation", () => {
  const ok = {
    action: "org.company.update",
    actorKind: "HUMAN" as const,
    actorId: "u1",
    entityType: "Company",
    entityRef: "ORG-ES",
  };

  it("accepts a complete entry", () => {
    expect(auditEntryProblem(ok)).toBeNull();
  });

  it("requires an actor and a subject", () => {
    expect(auditEntryProblem({ ...ok, actorId: " " })).toMatch(/actor/i);
    expect(auditEntryProblem({ ...ok, entityRef: "" })).toMatch(/acted on/i);
  });

  it("refuses an unknown actor kind", () => {
    expect(auditEntryProblem({ ...ok, actorKind: "ROBOT" as never })).toMatch(/actor kind/i);
  });
});

describe("reading audit obeys company scope", () => {
  it("refuses a row from a company the viewer cannot see", () => {
    // Otherwise the log is the way to learn what happens in a company you have
    // no access to. A log is a report, and reports obey the same scope.
    expect(canReadAudit({ companyIds: ["ORG-ES"] }, { companyId: "ORG-CA" })).toBe(false);
  });

  it("allows a row inside scope", () => {
    expect(canReadAudit({ companyIds: ["ORG-ES"] }, { companyId: "ORG-ES" })).toBe(true);
  });

  it("allows a row that belongs to no company", () => {
    expect(canReadAudit({ companyIds: ["ORG-ES"] }, { companyId: null })).toBe(true);
  });

  it("is fail-closed for an unscoped viewer", () => {
    expect(canReadAudit({}, { companyId: "ORG-ES" })).toBe(false);
  });
});
