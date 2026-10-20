import { describe, expect, it } from "vitest";
import {
  approvalSatisfied,
  canApprove,
  canAssignTo,
  canRead,
  canWrite,
  clears,
  decide,
  docTransitionProblem,
  documentId,
  fileName,
  gateFor,
  isCardField,
  isSelfEditable,
  isSelfEditableHrField,
  meetsLevel,
  missingControls,
  normaliseShortTitle,
  parseDocumentId,
  shortTitleProblem,
  taskRef,
  taskTransitionProblem,
  type Viewer,
  companyScopeFor,
} from "../index.js";

describe("naming standard", () => {
  it("builds the worked example from the standard", () => {
    // ORG-ES-OPS-SOP-2026-0007-ClientOnboarding-v1.0-APPROVED.pdf
    expect(
      fileName({
        entityId: "ORG-ES",
        departmentId: "OPS",
        docType: "SOP",
        year: 2026,
        sequence: 7,
        shortTitle: "Client Onboarding",
        versionMajor: 1,
        versionMinor: 0,
        status: "APPROVED",
        ext: "pdf",
      })
    ).toBe("ORG-ES-OPS-SOP-2026-0007-ClientOnboarding-v1.0-APPROVED.pdf");
  });

  it("document ids match the schema pattern and round-trip", () => {
    const parts = { entityId: "ORG-CA", departmentId: "LRC", docType: "CTR", year: 2026, sequence: 42 } as const;
    const id = documentId(parts);
    expect(id).toBe("ORG-CA-LRC-CTR-2026-0042");
    expect(id).toMatch(/^ORG-[A-Z0-9-]+$/);
    expect(parseDocumentId(id)).toEqual(parts);
  });

  it("rejects ids that are not ours", () => {
    expect(parseDocumentId("ORG-XX-OPS-SOP-2026-0007")).toBeNull(); // unknown entity
    expect(parseDocumentId("ORG-ES-ZZZ-SOP-2026-0007")).toBeNull(); // unknown department
    expect(parseDocumentId("ORG-ES-OPS-XXX-2026-0007")).toBeNull(); // unknown type
    expect(parseDocumentId("not-an-id")).toBeNull();
  });

  it("normalises short titles and folds accents", () => {
    expect(normaliseShortTitle("Client onboarding (ES)")).toBe("ClientOnboardingES");
    expect(normaliseShortTitle("Contrato de colaboración")).toBe("ContratoDeColaboracion");
  });

  it("refuses the names the standard bans", () => {
    for (const bad of ["final", "Final", "report final", "copy", "new"]) {
      expect(shortTitleProblem(bad), bad).toBeTruthy();
    }
    expect(shortTitleProblem("Client Onboarding")).toBeNull();
    // "Finance" ends in no banned word and must survive — the check is on the
    // whole normalised title, not a substring search.
    expect(shortTitleProblem("Finance")).toBeNull();
  });

  it("task refs share the shape of document ids", () => {
    expect(taskRef({ entityId: "ORG-UAE", departmentId: "DEL", year: 2026, sequence: 3 })).toBe(
      "ORG-UAE-DEL-TSK-2026-0003"
    );
  });
});

describe("task lifecycle", () => {
  const complete = {
    ownerId: "m1",
    dueAt: new Date(),
    priority: "P2",
    inputs: [{ kind: "email" }],
    expectedOutputs: ["signed PDF"],
    acceptanceCriteria: "Signed by both parties",
    destination: "05_LEGAL_RISK_COMPLIANCE/02_CONTRACTS_AND_LEGAL_RECORDS",
  };

  it("follows the declared transitions", () => {
    expect(taskTransitionProblem("NEW", "TRIAGED", complete)).toBeNull();
    expect(taskTransitionProblem("TRIAGED", "ASSIGNED", complete)).toBeNull();
    expect(taskTransitionProblem("APPROVED", "COMPLETED", complete)).toBeNull();
  });

  it("refuses transitions that are not declared", () => {
    expect(taskTransitionProblem("NEW", "COMPLETED", complete)).toMatch(/can only move/);
    expect(taskTransitionProblem("REVIEW", "COMPLETED", complete)).toMatch(/can only move/);
  });

  it("treats archived and cancelled as terminal", () => {
    expect(taskTransitionProblem("ARCHIVED", "NEW", complete)).toMatch(/terminal/);
    expect(taskTransitionProblem("CANCELLED", "NEW", complete)).toMatch(/terminal/);
  });

  it("lets a blocked task resume — the file leaves it stranded", () => {
    expect(taskTransitionProblem("BLOCKED", "IN_PROGRESS", complete)).toBeNull();
  });

  it("holds a task in triage until the required controls are filled in", () => {
    const bare = { ownerId: "m1", priority: "P2" };
    expect(missingControls(bare)).toEqual([
      "dueAt",
      "inputs",
      "expectedOutputs",
      "acceptanceCriteria",
      "destination",
    ]);
    // Capture and triage are reachable without them; nothing after is.
    expect(taskTransitionProblem("NEW", "TRIAGED", bare)).toBeNull();
    expect(taskTransitionProblem("TRIAGED", "ASSIGNED", bare)).toMatch(/Missing required controls/);
  });

  it("always allows cancelling, controls or not", () => {
    expect(taskTransitionProblem("TRIAGED", "CANCELLED", {})).toBeNull();
  });
});

describe("document lifecycle controls", () => {
  it("approval needs an approver and a locked version", () => {
    expect(docTransitionProblem("IN_REVIEW", "APPROVED", {})).toMatch(/named approver/);
    expect(docTransitionProblem("IN_REVIEW", "APPROVED", { approverId: "m1" })).toMatch(/version to be locked/);
    expect(docTransitionProblem("IN_REVIEW", "APPROVED", { approverId: "m1", versionLocked: true })).toBeNull();
  });

  it("executed needs evidence, superseded needs a replacement", () => {
    expect(docTransitionProblem("APPROVED", "EXECUTED", {})).toMatch(/evidence/);
    expect(docTransitionProblem("APPROVED", "EXECUTED", { evidence: ["signature.pdf"] })).toBeNull();
    expect(docTransitionProblem("APPROVED", "SUPERSEDED", {})).toMatch(/replacement/);
  });

  it("disposal is blocked by an unexpired retention date", () => {
    const future = new Date(Date.now() + 86_400_000);
    expect(docTransitionProblem("ARCHIVED", "DELETION_PENDING", { retainUntil: future })).toMatch(/Retention runs until/);
    const past = new Date(Date.now() - 86_400_000);
    expect(docTransitionProblem("ARCHIVED", "DELETION_PENDING", { retainUntil: past })).toBeNull();
  });

  it("a legal hold beats the retention schedule", () => {
    const past = new Date(Date.now() - 86_400_000);
    expect(docTransitionProblem("ARCHIVED", "DELETION_PENDING", { retainUntil: past, legalHold: true })).toMatch(
      /legal hold/
    );
  });

  it("deletion needs two distinct people", () => {
    expect(docTransitionProblem("DELETION_PENDING", "DELETED", { deletionAuthorisers: ["m1"] })).toMatch(
      /two-person/
    );
    // The same person twice is still one person.
    expect(docTransitionProblem("DELETION_PENDING", "DELETED", { deletionAuthorisers: ["m1", "m1"] })).toMatch(
      /two-person/
    );
    expect(docTransitionProblem("DELETION_PENDING", "DELETED", { deletionAuthorisers: ["m1", "m2"] })).toBeNull();
  });
});

describe("autonomy matrix", () => {
  const enabled = { maxGate: "AUTO_WITH_AUDIT" as const, enabled: true };

  it("maps the declared actions", () => {
    expect(gateFor("classify_and_tag")).toBe("AUTO");
    expect(gateFor("bank_payment")).toBe("DUAL_HUMAN_APPROVAL");
  });

  it("treats an undeclared action as human-only", () => {
    // The safety property: a capability nobody has classified cannot run.
    expect(gateFor("wire_funds_to_new_vendor")).toBe("HUMAN_ONLY");
    expect(decide("wire_funds_to_new_vendor", enabled).verdict).toBe("REFUSED");
  });

  it("lets routine work proceed", () => {
    expect(decide("classify_and_tag", { ...enabled, confidence: 0.97 })).toMatchObject({ verdict: "PROCEED" });
    expect(decide("assign_routine_task", enabled)).toMatchObject({ verdict: "PROCEED", audit: true });
  });

  it("refuses signature, payroll and anything else reserved to a person", () => {
    for (const action of ["legal_signature", "payroll_change"]) {
      const d = decide(action, { maxGate: "HUMAN_ONLY", enabled: true });
      expect(d.verdict, action).toBe("REFUSED");
    }
  });

  it("gates payments and deletions even for a maximally trusted agent", () => {
    for (const action of ["bank_payment", "permanent_delete", "access_change_restricted", "external_send"]) {
      const d = decide(action, { maxGate: "HUMAN_ONLY", enabled: true });
      expect(d.verdict, action).toBe("GATED");
    }
  });

  it("sends low confidence to a human even when the action is otherwise automatic", () => {
    const d = decide("classify_and_tag", { ...enabled, confidence: 0.5 });
    expect(d.verdict).toBe("GATED");
    expect(d.verdict === "GATED" && d.reason).toMatch(/human-review threshold/);
  });

  it("gates the band between human-review and auto-file", () => {
    const d = decide("classify_and_tag", { ...enabled, confidence: 0.85 });
    expect(d.verdict).toBe("GATED");
    expect(d.verdict === "GATED" && d.reason).toMatch(/auto-file threshold/);
  });

  it("a disabled agent can only propose", () => {
    expect(decide("classify_and_tag", { maxGate: "AUTO", enabled: false }).verdict).toBe("GATED");
  });

  it("respects the agent's own ceiling", () => {
    expect(decide("assign_routine_task", { maxGate: "AUTO", enabled: true }).verdict).toBe("GATED");
  });
});

describe("approval satisfaction", () => {
  it("one A1 approver clears a single-approver gate", () => {
    expect(approvalSatisfied("HUMAN_APPROVAL", [{ deciderId: "a", vote: "APPROVE", level: "A1" }]).ok).toBe(true);
  });

  it("an under-levelled approver does not count", () => {
    expect(approvalSatisfied("HUMAN_APPROVAL", [{ deciderId: "a", vote: "APPROVE", level: "A0" }]).ok).toBe(false);
  });

  it("dual gates need two different people", () => {
    const one = [{ deciderId: "a", vote: "APPROVE", level: "A3" as const }];
    expect(approvalSatisfied("DUAL_HUMAN_APPROVAL", one).ok).toBe(false);
    expect(
      approvalSatisfied("DUAL_HUMAN_APPROVAL", [...one, { deciderId: "b", vote: "APPROVE", level: "A4" }]).ok
    ).toBe(true);
  });

  it("any rejection stops it", () => {
    expect(
      approvalSatisfied("DUAL_HUMAN_APPROVAL", [
        { deciderId: "a", vote: "APPROVE", level: "A4" },
        { deciderId: "b", vote: "REJECT", level: "A4" },
      ]).ok
    ).toBe(false);
  });

  it("levels compare in order", () => {
    expect(meetsLevel("A3", "A2")).toBe(true);
    expect(meetsLevel("A2", "A3")).toBe(false);
    expect(clears("RESTRICTED", "CONFIDENTIAL")).toBe(true);
    expect(clears("INTERNAL", "CONFIDENTIAL")).toBe(false);
  });
});

describe("access control", () => {
  const ALL_COMPANIES = ["ORG-ES", "ORG-UAE", "ORG-CA", "ORG-EG"];
  const employee: Viewer = {
    id: "emp",
    role: "EMPLOYEE",
    approvalLevel: "A0",
    clearance: "INTERNAL",
    entityId: "ORG-ES",
    departmentId: "OPS",
    companyIds: companyScopeFor({ role: "EMPLOYEE", entityId: "ORG-ES" }, ALL_COMPANIES),
  };
  const manager: Viewer = {
    id: "mgr",
    role: "MANAGER",
    approvalLevel: "A2",
    clearance: "CONFIDENTIAL",
    entityId: "ORG-ES",
    departmentId: "OPS",
    reportIds: ["emp"],
    // The company scope a MANAGER actually resolves to, rather than a literal.
    // withinCompanyScope is fail-closed, so a fixture without this sees no
    // company-scoped record at all — which is the point of the default, and
    // means the fixture has to be as real as the code path it stands in for.
    companyIds: companyScopeFor({ role: "MANAGER", entityId: "ORG-ES" }, ALL_COMPANIES),
  };
  const ceo: Viewer = {
    id: "ceo",
    role: "CEO",
    approvalLevel: "A4",
    clearance: "PRIVILEGED",
    companyIds: companyScopeFor({ role: "CEO", entityId: "ORG-ES" }, ALL_COMPANIES),
  };

  it("a member sees their own work", () => {
    expect(canRead(employee, { ownerId: "emp" })).toBe(true);
    expect(canWrite(employee, { ownerId: "emp" })).toBe(true);
  });

  it("a member does not see a colleague's work", () => {
    expect(canRead(employee, { ownerId: "someone-else" })).toBe(false);
  });

  it("a manager sees their reports, and the reports do not see back", () => {
    expect(canRead(manager, { ownerId: "emp" })).toBe(true);
    expect(canRead(employee, { ownerId: "mgr" })).toBe(false);
  });

  it("a manager is confined to their own entity", () => {
    expect(canRead(manager, { ownerId: "x", entityId: "ORG-ES" })).toBe(true);
    expect(canRead(manager, { ownerId: "x", entityId: "ORG-CA" })).toBe(false);
  });

  it("treats an unclassified record as confidential for everybody but its participants", () => {
    // A record nobody has classified is one nobody has judged safe to
    // circulate, so a colleague's INTERNAL clearance does not reach it...
    const colleague = { ...employee, id: "other" };
    expect(canRead(colleague, { ownerId: "emp", confidentiality: null })).toBe(false);

    // ...but the owner is the source, not circulation. Locking them out of
    // their own work protects nothing.
    expect(canRead(employee, { ownerId: "emp", confidentiality: null })).toBe(true);
    expect(canRead(employee, { assigneeId: "emp", confidentiality: null })).toBe(true);

    // Somebody cleared for confidential material reaches it anyway.
    expect(canRead(manager, { ownerId: "emp", confidentiality: null })).toBe(true);
  });

  it("clearance caps everything — being the boss is not need-to-know", () => {
    // The manager's clearance stops at CONFIDENTIAL.
    expect(canRead(manager, { ownerId: "emp", confidentiality: "RESTRICTED" })).toBe(false);
  });

  it("restricted records need an explicit group, even for the CEO", () => {
    const hr = { ownerId: "peo-lead", confidentiality: "RESTRICTED" as const, accessList: ["peo-lead"] };
    expect(canRead(ceo, hr)).toBe(false);
    expect(canRead(ceo, { ...hr, accessList: ["peo-lead", "ceo"] })).toBe(true);
  });

  it("the agent identity reads nothing on its own account", () => {
    const agent: Viewer = { id: "AI-DOC", role: "AI_OPS", approvalLevel: "A0", clearance: "PRIVILEGED" };
    expect(canRead(agent, { ownerId: "AI-DOC", confidentiality: "PUBLIC" })).toBe(false);
    expect(canApprove(agent, "A0")).toBe(false);
  });

  it("assignment follows the reporting line", () => {
    expect(canAssignTo(manager, "emp")).toBe(true);
    expect(canAssignTo(employee, "mgr")).toBe(false);
    expect(canAssignTo(employee, "emp")).toBe(true);
    expect(canAssignTo(ceo, "anyone")).toBe(true);
  });

  it("a member cannot edit their own role, level or clearance", () => {
    for (const f of ["role", "approvalLevel", "clearance", "entityId", "managerId", "email"]) {
      expect(isSelfEditable(f), f).toBe(false);
    }
  });

  it("a member cannot edit their own business-card details", () => {
    // These are published on the public site and in a downloadable vCard, so
    // they are company assets maintained by HR, not personal preferences.
    for (const f of ["name", "title", "photo", "location", "linkedin", "phones", "whatsapp", "branches"]) {
      expect(isSelfEditable(f), f).toBe(false);
      expect(isCardField(f), f).toBe(true);
    }
    // The interface language is the one thing left that is genuinely theirs.
    expect(isSelfEditable("locale")).toBe(true);
    expect(isCardField("locale")).toBe(false);
  });

  it("a member maintains the personal details HR needs from them", () => {
    for (const f of ["personalPhone", "emergencyContactName", "emergencyContactPhone"]) {
      expect(isSelfEditableHrField(f), f).toBe(true);
    }
    // But not the employment terms themselves.
    for (const f of ["startDate", "employmentType", "status", "employeeNo"]) {
      expect(isSelfEditableHrField(f), f).toBe(false);
    }
  });
});
