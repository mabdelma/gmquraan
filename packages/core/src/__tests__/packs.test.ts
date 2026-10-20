import { describe, expect, it } from "vitest";
import {
  BASE_PACK,
  canAssignTo,
  packComplete,
  packGaps,
  requiredDocuments,
  requiredDocumentsForRole,
  type Viewer,
} from "../index.js";

const codes = (list: { code: string }[]) => list.map((d) => d.code).sort();

describe("document packs", () => {
  it("gives every employee the base pack", () => {
    const d = requiredDocuments({ tier: "EMPLOYEE", employmentType: "FULL_TIME" });
    expect(codes(d)).toEqual(codes([...BASE_PACK]));
  });

  it("does not ask a contractor for employment paperwork", () => {
    // Asking a supplier for a right-to-work document is both wrong and a data
    // protection problem.
    const d = requiredDocuments({ tier: "CONTRACTOR", employmentType: "CONTRACTOR" });
    expect(codes(d)).not.toContain("RIGHT_TO_WORK");
    expect(codes(d)).not.toContain("CONTRACT");
    expect(codes(d)).toContain("SERVICES_AGREEMENT");
    expect(codes(d)).toContain("TAX_REGISTRATION");
  });

  it("still binds a contractor to confidentiality and the policies", () => {
    // Those are about access, not employment.
    const d = codes(requiredDocuments({ tier: "CONTRACTOR", employmentType: "CONTRACTOR" }));
    expect(d).toContain("NDA");
    expect(d).toContain("POLICY_ACK");
  });

  it("adds a delegation of authority for anybody who can approve", () => {
    for (const tier of ["DEPARTMENT_MANAGER", "FUNCTIONAL_DIRECTOR", "ENTITY_GM", "EXCO"] as const) {
      expect(codes(requiredDocuments({ tier, employmentType: "FULL_TIME" })), tier).toContain("DELEGATION");
    }
    expect(codes(requiredDocuments({ tier: "EMPLOYEE", employmentType: "FULL_TIME" }))).not.toContain("DELEGATION");
  });

  it("adds conflict-of-interest at executive level", () => {
    expect(codes(requiredDocuments({ tier: "EXCO", employmentType: "FULL_TIME" }))).toContain(
      "CONFLICT_OF_INTEREST"
    );
    expect(codes(requiredDocuments({ tier: "DEPARTMENT_MANAGER", employmentType: "FULL_TIME" }))).not.toContain(
      "CONFLICT_OF_INTEREST"
    );
  });

  it("makes an infrastructure administrator acknowledge they hold no business authority", () => {
    const d = requiredDocuments({ tier: "INFRA_ADMIN", employmentType: "FULL_TIME" });
    expect(codes(d)).toContain("PRIVILEGED_ACCESS");
  });

  it("resolves a pack from a role as well as a tier", () => {
    expect(codes(requiredDocumentsForRole("CEO", "FULL_TIME"))).toContain("CONFLICT_OF_INTEREST");
    expect(codes(requiredDocumentsForRole("EMPLOYEE", "FULL_TIME"))).not.toContain("DELEGATION");
  });

  it("never produces the same requirement twice", () => {
    const d = requiredDocuments({ tier: "GROUP_CEO", employmentType: "FULL_TIME" });
    expect(new Set(d.map((x) => x.code)).size).toBe(d.length);
  });
});

describe("accessibility per document", () => {
  const find = (tier: Parameters<typeof requiredDocuments>[0]["tier"], code: string) =>
    requiredDocuments({ tier, employmentType: "FULL_TIME" }).find((d) => d.code === code)!;

  it("keeps identity and payment details restricted to HR", () => {
    for (const code of ["IDENTITY", "PAYMENT_DETAILS", "CONTRACT"]) {
      const d = find("EMPLOYEE", code);
      expect(d.classification, code).toBe("RESTRICTED");
      expect(d.audience, code).toBe("hr");
    }
  });

  it("makes a delegation of authority visible to the group", () => {
    // What somebody may approve is not a private matter — hiding it would make
    // the approval trail unauditable.
    const d = find("DEPARTMENT_MANAGER", "DELEGATION");
    expect(d.audience).toBe("group");
    expect(d.classification).toBe("INTERNAL");
  });

  it("lets a line manager see the policy acknowledgement and nothing more sensitive", () => {
    expect(find("EMPLOYEE", "POLICY_ACK").audience).toBe("line");
    expect(find("EMPLOYEE", "NDA").audience).toBe("hr");
  });
});

describe("gaps", () => {
  const required = requiredDocuments({ tier: "EMPLOYEE", employmentType: "FULL_TIME" });

  it("reports everything missing when nothing is held", () => {
    const gaps = packGaps(required, []);
    expect(gaps).toHaveLength(required.length);
    expect(gaps.every((g) => g.reason === "missing")).toBe(true);
    expect(packComplete(gaps)).toBe(false);
  });

  it("treats provided-but-unverified as a gap", () => {
    // Somebody uploading a document is not somebody in HR having looked at it,
    // and for a right-to-work check that difference is the whole control.
    const held = required.map((r) => ({ code: r.code, status: "PROVIDED" }));
    const gaps = packGaps(required, held);
    expect(gaps.every((g) => g.reason === "unverified")).toBe(true);
  });

  it("treats an expired document as a gap even when verified", () => {
    const held = required.map((r) => ({
      code: r.code,
      status: "VERIFIED",
      expiresAt: new Date(Date.now() - 86_400_000),
    }));
    expect(packGaps(required, held).every((g) => g.reason === "expired")).toBe(true);
  });

  it("is clear when everything is verified and current", () => {
    const held = required.map((r) => ({ code: r.code, status: "VERIFIED", expiresAt: null }));
    const gaps = packGaps(required, held);
    expect(gaps).toEqual([]);
    expect(packComplete(gaps)).toBe(true);
  });

  it("counts only mandatory gaps against completeness", () => {
    const contractor = requiredDocuments({ tier: "CONTRACTOR", employmentType: "CONTRACTOR" });
    const held = contractor
      .filter((r) => r.mandatory)
      .map((r) => ({ code: r.code, status: "VERIFIED", expiresAt: null }));
    const gaps = packGaps(contractor, held);
    // INSURANCE is optional and still outstanding.
    expect(gaps.map((g) => g.code)).toEqual(["INSURANCE"]);
    expect(packComplete(gaps)).toBe(true);
  });
});

describe("assignment reaches down a branch", () => {
  const director: Viewer = {
    id: "dir",
    role: "FUNCTIONAL_DIRECTOR",
    approvalLevel: "A3",
    clearance: "CONFIDENTIAL",
    entityId: "ORG-ES",
    departmentId: "MKT",
    reportIds: ["mgr"],
  };

  it("reaches direct and indirect reports through the line", () => {
    expect(canAssignTo(director, "mgr")).toBe(true);
  });

  it("reaches their own department in their own branch without a line", () => {
    // A director owns a department across a branch and does not appear in the
    // chain above every individual in it.
    expect(canAssignTo(director, { id: "x", entityId: "ORG-ES", departmentId: "MKT" })).toBe(true);
  });

  it("stops at the department boundary", () => {
    expect(canAssignTo(director, { id: "x", entityId: "ORG-ES", departmentId: "FIN" })).toBe(false);
  });

  it("stops at the branch boundary", () => {
    expect(canAssignTo(director, { id: "x", entityId: "ORG-CA", departmentId: "MKT" })).toBe(false);
  });

  it("lets a general manager reach their whole branch", () => {
    const gm: Viewer = {
      id: "gm",
      role: "ENTITY_GM",
      approvalLevel: "A3",
      clearance: "CONFIDENTIAL",
      entityId: "ORG-EG",
    };
    expect(canAssignTo(gm, { id: "x", entityId: "ORG-EG", departmentId: "FIN" })).toBe(true);
    expect(canAssignTo(gm, { id: "x", entityId: "ORG-ES", departmentId: "FIN" })).toBe(false);
  });

  it("gives an ordinary employee nobody but themselves", () => {
    const emp: Viewer = {
      id: "e",
      role: "EMPLOYEE",
      approvalLevel: "A0",
      clearance: "INTERNAL",
      entityId: "ORG-ES",
      departmentId: "MKT",
    };
    expect(canAssignTo(emp, "e")).toBe(true);
    expect(canAssignTo(emp, { id: "other", entityId: "ORG-ES", departmentId: "MKT" })).toBe(false);
  });
});
