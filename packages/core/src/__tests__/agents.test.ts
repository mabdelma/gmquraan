import { describe, expect, it } from "vitest";
import {
  GROUP_CONFIG,
  assessPhases,
  buildReport,
  comparableTitle,
  complianceFlags,
  documentMetadataIssues,
  findDuplicates,
  proposeConfidentiality,
  proposeDepartment,
  qualityIssues,
  routeDocument,
} from "../index.js";

describe("AI-ORCH — triage", () => {
  it("proposes a department from the words actually used", () => {
    const p = proposeDepartment({ title: "Renew the supplier contract and file the NDA" });
    expect(p.value).toBe("LRC");
    expect(p.reason).toMatch(/contract|nda/);
  });

  it("never clears the auto-file threshold on a keyword alone", () => {
    // A keyword match is a suggestion. If it could file itself, a task titled
    // "invoice discussion with a candidate" would land in Finance unreviewed.
    const p = proposeDepartment({ title: "Draft the deployment runbook" });
    expect(p.value).toBe("TEC");
    expect(p.confidence).toBeLessThan(GROUP_CONFIG.aiConfidenceAutoFile);
  });

  it("picks the department with the most evidence, not the first one seen", () => {
    // Finance matches "invoice"; Legal matches "legal" and "contract". Two
    // beats one, so this is a decision rather than a tie.
    const p = proposeDepartment({ title: "Invoice dispute — legal review of the contract" });
    expect(p.value).toBe("LRC");
  });

  it("refuses to guess when the evidence is genuinely level", () => {
    // One keyword each: "invoice" for Finance, "contract" for Legal.
    const p = proposeDepartment({ title: "Invoice against the contract" });
    expect(p.value).toBeNull();
    expect(p.reason).toMatch(/Ambiguous between/);
    expect(p.reason).toMatch(/FIN/);
    expect(p.reason).toMatch(/LRC/);
  });

  it("returns nothing when nothing matches", () => {
    const p = proposeDepartment({ title: "Order more coffee" });
    expect(p.value).toBeNull();
    expect(p.confidence).toBe(0);
  });
});

describe("AI-ORCH — classification errs upward", () => {
  it("treats anything resembling personal data as restricted, confidently", () => {
    for (const t of ["Upload passport scan", "Salary review for Q3", "Candidate CV shortlist"]) {
      const p = proposeConfidentiality({ title: t });
      expect(p.value, t).toBe("RESTRICTED");
      // Confident on purpose: under-classifying leaks personal data, while
      // over-classifying only costs somebody an access request.
      expect(p.confidence, t).toBe(1);
    }
  });

  it("marks commercial material confidential and ordinary work internal", () => {
    expect(proposeConfidentiality({ title: "Partner contract renewal" }).value).toBe("CONFIDENTIAL");
    expect(proposeConfidentiality({ title: "Update the team page" }).value).toBe("INTERNAL");
  });
});

describe("AI-DOC — routing rules", () => {
  it("sends contracts to legal with A3", () => {
    const r = routeDocument({ docType: "contract", aiConfidence: 0.99 });
    expect(r.ruleId).toBe("legal-contract");
    expect(r.destination).toContain("05_LEGAL_RISK_COMPLIANCE");
    expect(r.approval).toBe("A3");
  });

  it("sends employment personal data to restricted HR records", () => {
    const r = routeDocument({ containsPersonalData: true, context: "employment", aiConfidence: 0.99 });
    expect(r.ruleId).toBe("employee-record");
    expect(r.confidentiality).toBe("RESTRICTED");
  });

  it("sends invoices to finance", () => {
    expect(routeDocument({ docType: "invoice", aiConfidence: 0.99 }).ruleId).toBe("invoice");
  });

  it("quarantines low confidence ahead of every other rule", () => {
    // The rule is last in the file, but routing something we are unsure about
    // to a real destination defeats the point of a quarantine.
    const r = routeDocument({ docType: "contract", aiConfidence: 0.5 });
    expect(r.ruleId).toBe("low-confidence");
    expect(r.requiresHumanClassification).toBe(true);
  });

  it("quarantines anything no rule claims, rather than inventing a folder", () => {
    const r = routeDocument({ docType: "mystery", aiConfidence: 0.99 });
    expect(r.destination).toContain("12_INBOX_AND_QUARANTINE");
    expect(r.requiresHumanClassification).toBe(true);
  });
});

describe("AI-DOC — metadata", () => {
  it("names every required field that is missing", () => {
    const issues = documentMetadataIssues({ title: "Something" });
    expect(issues.join(" ")).toMatch(/owner/i);
    expect(issues.join(" ")).toMatch(/classification/i);
    expect(issues.join(" ")).toMatch(/retention/i);
  });

  it("catches an identifier that does not follow the standard", () => {
    const issues = documentMetadataIssues({
      docId: "ORG-ES-OPS-SOP-2026-0001",
      title: "T",
      entityId: "ORG-ES",
      departmentId: "OPS",
      docType: "SOP",
      year: 2026,
      sequence: 7,
      ownerId: "m1",
      retentionClass: "ACTIVE+7Y",
      confidentiality: "INTERNAL",
    });
    expect(issues.join(" ")).toContain("ORG-ES-OPS-SOP-2026-0007");
  });

  it("rejects a document type outside the controlled list", () => {
    const issues = documentMetadataIssues({ title: "T", docType: "RANDOM", ownerId: "m", confidentiality: "INTERNAL", retentionClass: "PERM", entityId: "ORG-ES", departmentId: "OPS" });
    expect(issues.join(" ")).toMatch(/not in the controlled document-type list/);
  });

  it("is silent on a complete record", () => {
    expect(
      documentMetadataIssues({
        docId: "ORG-ES-OPS-SOP-2026-0007",
        title: "Client onboarding",
        shortTitle: "ClientOnboarding",
        entityId: "ORG-ES",
        departmentId: "OPS",
        docType: "SOP",
        year: 2026,
        sequence: 7,
        ownerId: "m1",
        retentionClass: "ACTIVE+7Y",
        confidentiality: "INTERNAL",
      })
    ).toEqual([]);
  });
});

describe("AI-QA", () => {
  it("says nothing about work in progress", () => {
    // Nagging early trains people to ignore the agent.
    expect(qualityIssues({ state: "IN_PROGRESS" })).toEqual([]);
    expect(qualityIssues({ state: "ASSIGNED" })).toEqual([]);
  });

  it("checks work that claims to be finished", () => {
    const issues = qualityIssues({ state: "REVIEW" });
    expect(issues).toHaveLength(3);
    expect(issues.join(" ")).toMatch(/acceptance criteria/);
    expect(issues.join(" ")).toMatch(/evidence/);
  });

  it("passes a properly evidenced task", () => {
    expect(
      qualityIssues({
        state: "REVIEW",
        acceptanceCriteria: "Signed by both parties",
        expectedOutputs: ["signed.pdf"],
        evidence: [{ kind: "file", ref: "signed.pdf" }],
      })
    ).toEqual([]);
  });
});

describe("AI-COMP", () => {
  it("flags personal data classified too low", () => {
    const flags = complianceFlags({ title: "Payroll change for June", confidentiality: "INTERNAL" });
    expect(flags.join(" ")).toMatch(/personal data but is classified INTERNAL/);
  });

  it("flags a restricted record nobody can open", () => {
    // The access rules require an explicit group, so restricted with an empty
    // list is unreachable by design.
    const flags = complianceFlags({ title: "Board pack", confidentiality: "RESTRICTED", accessListSize: 0 });
    expect(flags.join(" ")).toMatch(/nobody named on it/);
  });

  it("flags contractual work outside Legal", () => {
    const flags = complianceFlags({ title: "Sign the partner agreement", departmentId: "COM" });
    expect(flags.join(" ")).toMatch(/rather than with Legal/);
  });

  it("is quiet on ordinary internal work", () => {
    expect(complianceFlags({ title: "Update the team page", confidentiality: "INTERNAL", departmentId: "MKT" })).toEqual([]);
  });
});

describe("AI-KNOW — duplicates", () => {
  it("reports an identical hash as fact", () => {
    const found = findDuplicates([
      { id: "a", title: "Policy", sha256: "x" },
      { id: "b", title: "Totally different name", sha256: "x" },
    ]);
    expect(found).toHaveLength(1);
    expect(found[0].kind).toBe("identical");
    expect(found[0].confidence).toBe(1);
  });

  it("reports a title match as a suspicion a person must confirm", () => {
    const found = findDuplicates([
      { id: "a", title: "The Client Onboarding SOP" },
      { id: "b", title: "Client onboarding SOP (final copy)" },
    ]);
    expect(found).toHaveLength(1);
    expect(found[0].kind).toBe("similar");
    // Merging records on a title match alone would lose work, so this can
    // never clear the auto-file threshold.
    expect(found[0].confidence).toBeLessThan(GROUP_CONFIG.aiConfidenceAutoFile);
  });

  it("does not report the same pair twice", () => {
    const found = findDuplicates([
      { id: "a", title: "Policy", sha256: "x" },
      { id: "b", title: "Policy", sha256: "x" },
    ]);
    expect(found).toHaveLength(1);
    expect(found[0].kind).toBe("identical");
  });

  it("strips versioning noise when comparing titles", () => {
    expect(comparableTitle("The Client Onboarding SOP v2 (final)")).toBe(comparableTitle("client onboarding sop"));
  });

  it("finds nothing in a clean set", () => {
    expect(findDuplicates([{ id: "a", title: "Alpha" }, { id: "b", title: "Beta" }])).toEqual([]);
  });
});

describe("AI-REP", () => {
  const clean = {
    tasksOpen: 4,
    tasksOverdue: 0,
    tasksBlocked: 0,
    approvalsPending: 0,
    approvalsOverdue: 0,
    docsUnclassified: 0,
    docsMissingRetention: 0,
    agentRuns: [],
    seatsTotal: 10,
    seatsFilled: 10,
  };

  it("says so plainly when there is nothing wrong", () => {
    const r = buildReport(clean);
    expect(r.exceptions).toEqual([]);
    expect(r.headline).toMatch(/nothing overdue/);
  });

  it("leads with exceptions", () => {
    const r = buildReport({ ...clean, tasksOverdue: 3, docsMissingRetention: 2, seatsFilled: 3 });
    expect(r.exceptions.join(" ")).toMatch(/3 task\(s\) past their due date/);
    expect(r.exceptions.join(" ")).toMatch(/retention/);
    expect(r.exceptions.join(" ")).toMatch(/7 of 10 org seats vacant/);
  });

  it("calls out agents that are mostly being overruled", () => {
    const r = buildReport({
      ...clean,
      agentRuns: [{ outcome: "GATED" }, { outcome: "GATED" }, { outcome: "APPLIED" }],
    });
    expect(r.gatedRate).toBeCloseTo(2 / 3);
    expect(r.exceptions.join(" ")).toMatch(/not earning their place/);
  });
});

describe("phases are derived, not declared", () => {
  const base = {
    taxonomyLoaded: true,
    documentsRegistered: 0,
    tasksCreated: 0,
    approvalsUsed: 0,
    agentsRegistered: 8,
    agentsEnabled: 0,
    agentRunsApplied: 0,
    hrRecords: 8,
    reportsGenerated: 0,
  };

  it("counts assistance as done once agents are registered and proposing", () => {
    const p = assessPhases(base);
    expect(p.find((x) => x.id === 4)!.state).toBe("done");
  });

  it("does not count autonomy while every agent only proposes", () => {
    // This is the distinction the whole roadmap turns on, and it is a fact
    // about the database rather than a claim in a status report.
    const p = assessPhases(base);
    const five = p.find((x) => x.id === 5)!;
    expect(five.state).toBe("not_started");
    expect(five.evidence).toMatch(/No agent is enabled/);
  });

  it("counts autonomy only once something has actually been applied", () => {
    expect(assessPhases({ ...base, agentsEnabled: 2 }).find((x) => x.id === 5)!.state).toBe("not_started");
    expect(
      assessPhases({ ...base, agentsEnabled: 2, agentRunsApplied: 5 }).find((x) => x.id === 5)!.state
    ).toBe("in_progress");
  });

  it("covers all seven phases", () => {
    expect(assessPhases(base)).toHaveLength(7);
  });
});
