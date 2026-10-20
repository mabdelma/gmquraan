/**
 * What each agent decides.
 *
 * Pure functions, no database and no network. The orchestrator does the IO and
 * the gate enforcement; this module holds the judgement, so every agent's
 * reasoning can be tested directly against a case rather than inferred from
 * what ended up in the database afterwards.
 *
 * Every function returns a confidence with its proposal. That number is not
 * decoration — `decide()` compares it against the auto-file and human-review
 * thresholds from group_config.json, so an agent that is unsure routes to a
 * person instead of acting. Where a rule is an exact match the confidence is 1;
 * where it is a keyword heuristic it is deliberately below the 0.92 auto-file
 * threshold, so a guess is always reviewed.
 */
import {
  DEPARTMENT_IDS,
  DOC_TYPES,
  GROUP_CONFIG,
  LOW_CONFIDENCE_DESTINATION,
  type Confidentiality,
  type DepartmentId,
  type DocType,
} from "./config.js";
import { REQUIRED_CONTROLS, type TaskState } from "./lifecycle.js";
import { documentId, shortTitleProblem } from "./naming.js";

export type Proposal<T> = {
  /** What the agent thinks should happen. */
  value: T;
  /** 0–1. Below GROUP_CONFIG.aiConfidenceAutoFile it must be reviewed. */
  confidence: number;
  /** Plain-language justification, shown to whoever reviews it. */
  reason: string;
};

/** Confidence for an exact rule match versus a keyword guess. */
const EXACT = 1;
const KEYWORD = 0.8; // deliberately under the 0.92 auto-file threshold

// ── AI-ORCH: triage ────────────────────────────────────────────────────────

/**
 * Keyword hints per department. Crude on purpose: a keyword match is scored
 * KEYWORD, which never clears the auto-file threshold, so this only ever
 * *suggests* a department to the person doing triage.
 */
const DEPARTMENT_HINTS: Record<DepartmentId, readonly string[]> = {
  GOV: ["board", "policy", "governance", "charter", "delegation", "minutes"],
  OPS: ["process", "operations", "sop", "workflow", "service"],
  FIN: ["invoice", "payment", "budget", "expense", "tax", "procurement", "supplier", "vat"],
  PEO: ["hire", "hiring", "recruit", "employee", "onboarding", "offboarding", "leave", "payroll", "hr"],
  COM: ["lead", "proposal", "quote", "pricing", "client", "partner", "reseller", "sales"],
  DEL: ["project", "delivery", "milestone", "handover", "acceptance", "sprint"],
  TEC: ["deploy", "bug", "server", "database", "api", "release", "code", "platform", "infrastructure"],
  MKT: ["campaign", "brand", "content", "website", "social", "seo", "marketing"],
  LRC: ["contract", "nda", "legal", "compliance", "gdpr", "privacy", "risk", "licence", "regulator"],
};

export type TriageInput = { title: string; description?: string | null };

export function proposeDepartment(t: TriageInput): Proposal<DepartmentId | null> {
  const text = `${t.title} ${t.description ?? ""}`.toLowerCase();

  const scores = DEPARTMENT_IDS.map((d) => ({
    d,
    hits: DEPARTMENT_HINTS[d].filter((k) => text.includes(k)),
  })).filter((s) => s.hits.length > 0);

  if (scores.length === 0) {
    return { value: null, confidence: 0, reason: "No department keyword matched." };
  }

  scores.sort((a, b) => b.hits.length - a.hits.length);
  const top = scores[0];

  // A tie is not a decision. Two departments with equal evidence means a person
  // should choose, so the confidence drops rather than the first one winning.
  const tied = scores.filter((s) => s.hits.length === top.hits.length);
  if (tied.length > 1) {
    return {
      value: null,
      confidence: 0.4,
      reason: `Ambiguous between ${tied.map((s) => s.d).join(" and ")} — needs a person.`,
    };
  }

  return {
    value: top.d,
    confidence: KEYWORD,
    reason: `Matched ${top.hits.map((h) => `"${h}"`).join(", ")} for ${top.d}.`,
  };
}

/**
 * Anything that looks like personal data is proposed as RESTRICTED.
 *
 * The asymmetry is intentional: over-classifying costs somebody a request for
 * access, under-classifying leaks personal data. So this errs upward and is
 * confident about it.
 */
const PERSONAL_DATA_HINTS = [
  "passport",
  "national id",
  "salary",
  "payroll",
  "medical",
  "sick note",
  "bank detail",
  "iban",
  "home address",
  "date of birth",
  "cv",
  "resume",
  "candidate",
  "employee record",
  "disciplinary",
  "grievance",
];

export function proposeConfidentiality(t: TriageInput): Proposal<Confidentiality> {
  const text = `${t.title} ${t.description ?? ""}`.toLowerCase();
  const hit = PERSONAL_DATA_HINTS.find((k) => text.includes(k));
  if (hit) {
    return {
      value: "RESTRICTED",
      confidence: EXACT,
      reason: `Mentions "${hit}", which is personal data. Restricted needs an explicit access group.`,
    };
  }
  if (/\b(contract|nda|litigation|dispute|legal advice)\b/.test(text)) {
    return { value: "CONFIDENTIAL", confidence: KEYWORD, reason: "Commercial or legal material." };
  }
  return { value: "INTERNAL", confidence: KEYWORD, reason: "Nothing suggests it is sensitive." };
}

// ── AI-DOC: filing and naming ──────────────────────────────────────────────

/** routing_rules.yaml, in order. The first rule that matches wins. */
export type RoutingInput = {
  docType?: string | null;
  containsPersonalData?: boolean;
  context?: string | null;
  aiConfidence?: number;
};

export type Routing = {
  ruleId: string;
  destination: string;
  ownerRole?: string;
  confidentiality?: Confidentiality;
  approval?: string;
  requiresHumanClassification?: boolean;
};

const LEGAL_TYPES = ["contract", "nda", "mou", "legal_notice", "CTR"];
const INVOICE_TYPES = ["invoice", "credit_note", "receipt", "INV"];

export function routeDocument(d: RoutingInput): Routing {
  // The low-confidence rule is last in the file but has to be checked first:
  // routing something we are unsure about to a real destination defeats the
  // purpose of having a quarantine at all.
  if (typeof d.aiConfidence === "number" && d.aiConfidence < GROUP_CONFIG.aiConfidenceAutoFile) {
    return {
      ruleId: "low-confidence",
      destination: LOW_CONFIDENCE_DESTINATION,
      requiresHumanClassification: true,
    };
  }

  const type = (d.docType ?? "").toLowerCase();

  if (LEGAL_TYPES.some((t) => t.toLowerCase() === type)) {
    return {
      ruleId: "legal-contract",
      destination: "05_LEGAL_RISK_COMPLIANCE/02_CONTRACTS_AND_LEGAL_RECORDS",
      ownerRole: "Legal/Compliance",
      approval: "A3",
    };
  }

  if (d.containsPersonalData && d.context === "employment") {
    return {
      ruleId: "employee-record",
      destination: "04_PEOPLE_AND_ORGANIZATION/04_EMPLOYEE_RECORDS",
      ownerRole: "People Manager",
      confidentiality: "RESTRICTED",
    };
  }

  if (INVOICE_TYPES.some((t) => t.toLowerCase() === type)) {
    return {
      ruleId: "invoice",
      destination: "08_FINANCE_AND_PROCUREMENT/02_REVENUE_AND_INVOICING",
      ownerRole: "Finance",
    };
  }

  // No rule claimed it. Quarantine rather than a catch-all folder — the
  // improvements table is explicit that "Extra" and "Others" are the problem.
  return {
    ruleId: "unmatched",
    destination: LOW_CONFIDENCE_DESTINATION,
    requiresHumanClassification: true,
  };
}

export type DocMetadataInput = {
  docId?: string | null;
  title?: string | null;
  entityId?: string | null;
  departmentId?: string | null;
  docType?: string | null;
  year?: number | null;
  sequence?: number | null;
  shortTitle?: string | null;
  ownerId?: string | null;
  retentionClass?: string | null;
  confidentiality?: string | null;
};

/**
 * What is wrong with this record's metadata, in the order a person would fix
 * it. document_metadata.schema.json marks these required, and Appendix B says
 * no controlled record without an owner and a classification.
 */
export function documentMetadataIssues(d: DocMetadataInput): string[] {
  const issues: string[] = [];

  if (!d.title?.trim()) issues.push("No title.");
  if (!d.ownerId) issues.push("No owner — every controlled record needs one.");
  if (!d.confidentiality) issues.push("No classification.");
  if (!d.retentionClass) issues.push("No retention class, so disposal can never be assessed.");
  if (!d.entityId) issues.push("No entity.");
  if (!d.departmentId) issues.push("No department.");
  if (!d.docType) issues.push("No document type.");
  else if (!(DOC_TYPES as readonly string[]).includes(d.docType)) {
    issues.push(`"${d.docType}" is not in the controlled document-type list.`);
  }

  if (d.shortTitle) {
    const problem = shortTitleProblem(d.shortTitle);
    if (problem) issues.push(problem);
  }

  // Only worth checking once the parts exist.
  if (d.entityId && d.departmentId && d.docType && d.year && d.sequence) {
    const expected = documentId({
      entityId: d.entityId as never,
      departmentId: d.departmentId as never,
      docType: d.docType as DocType,
      year: d.year,
      sequence: d.sequence,
    });
    if (d.docId && d.docId !== expected) {
      issues.push(`Identifier is "${d.docId}" but the standard gives "${expected}".`);
    }
  }

  return issues;
}

// ── AI-QA: quality ─────────────────────────────────────────────────────────

export type QualityInput = {
  state: TaskState;
  acceptanceCriteria?: string | null;
  expectedOutputs?: unknown;
  evidence?: unknown;
  outputSpec?: string | null;
};

const nonEmpty = (v: unknown) =>
  v !== null && v !== undefined && (Array.isArray(v) ? v.length > 0 : String(v).trim().length > 0);

/**
 * Whether a task is actually ready for the state it is trying to reach.
 *
 * Deliberately only complains about work claiming to be finished. Nagging about
 * missing evidence on a task somebody started an hour ago trains people to
 * ignore the agent.
 */
export function qualityIssues(t: QualityInput): string[] {
  if (t.state !== "REVIEW" && t.state !== "APPROVED") return [];

  const issues: string[] = [];
  if (!nonEmpty(t.acceptanceCriteria)) {
    issues.push("No acceptance criteria, so there is nothing to check the work against.");
  }
  if (!nonEmpty(t.expectedOutputs)) issues.push("No expected outputs recorded.");
  if (!nonEmpty(t.evidence)) issues.push("No evidence attached for a task in review.");
  return issues;
}

// ── AI-COMP: compliance ────────────────────────────────────────────────────

export type ComplianceInput = TriageInput & {
  confidentiality?: string | null;
  departmentId?: string | null;
  accessListSize?: number;
};

/**
 * Policy problems, as distinct from quality problems.
 *
 * The one that matters most: a RESTRICTED record with nobody named on it is
 * unreachable by design — the access rules require an explicit group — so it is
 * both a compliance failure and a practical dead end.
 */
export function complianceFlags(c: ComplianceInput): string[] {
  const flags: string[] = [];
  const proposed = proposeConfidentiality(c);

  if (proposed.value === "RESTRICTED" && c.confidentiality && c.confidentiality !== "RESTRICTED" && c.confidentiality !== "PRIVILEGED") {
    flags.push(
      `Looks like personal data but is classified ${c.confidentiality}. ${proposed.reason}`
    );
  }

  if ((c.confidentiality === "RESTRICTED" || c.confidentiality === "PRIVILEGED") && !c.accessListSize) {
    flags.push("Classified restricted with nobody named on it, so nobody can open it.");
  }

  const text = `${c.title} ${c.description ?? ""}`.toLowerCase();
  if (/\b(contract|nda|agreement|mou)\b/.test(text) && c.departmentId && c.departmentId !== "LRC") {
    flags.push(`Contractual work sitting in ${c.departmentId} rather than with Legal.`);
  }

  return flags;
}

// ── AI-KNOW: duplicates and links ──────────────────────────────────────────

/** Title reduced for comparison — case, punctuation and filler removed. */
export function comparableTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(the|a|an|of|for|and|final|copy|draft|v\d+)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export type DuplicateCandidate = { id: string; title: string; sha256?: string | null };

export type DuplicateFinding = {
  aId: string;
  bId: string;
  /** "identical" is byte-for-byte; "similar" is a normalised title match. */
  kind: "identical" | "similar";
  confidence: number;
  reason: string;
};

/**
 * Duplicate detection.
 *
 * Two levels, and they are not the same claim. A matching hash is a fact and is
 * reported at full confidence; a matching normalised title is a suspicion and
 * is reported below the auto-file threshold so a person decides. Merging
 * records on a title match alone would lose work.
 */
export function findDuplicates(items: readonly DuplicateCandidate[]): DuplicateFinding[] {
  const found: DuplicateFinding[] = [];

  const byHash = new Map<string, DuplicateCandidate[]>();
  const byTitle = new Map<string, DuplicateCandidate[]>();

  for (const it of items) {
    if (it.sha256) byHash.set(it.sha256, [...(byHash.get(it.sha256) ?? []), it]);
    const key = comparableTitle(it.title);
    if (key) byTitle.set(key, [...(byTitle.get(key) ?? []), it]);
  }

  const seen = new Set<string>();
  const pairKey = (a: string, b: string) => [a, b].sort().join("|");

  for (const group of byHash.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const k = pairKey(group[i].id, group[j].id);
        seen.add(k);
        found.push({
          aId: group[i].id,
          bId: group[j].id,
          kind: "identical",
          confidence: EXACT,
          reason: "Identical content hash.",
        });
      }
    }
  }

  for (const group of byTitle.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const k = pairKey(group[i].id, group[j].id);
        if (seen.has(k)) continue; // already reported as identical
        seen.add(k);
        found.push({
          aId: group[i].id,
          bId: group[j].id,
          kind: "similar",
          confidence: KEYWORD,
          reason: `Titles normalise to the same text: "${comparableTitle(group[i].title)}".`,
        });
      }
    }
  }

  return found;
}

// ── AI-REP: the management picture ─────────────────────────────────────────

export type ReportInput = {
  tasksOpen: number;
  tasksOverdue: number;
  tasksBlocked: number;
  approvalsPending: number;
  approvalsOverdue: number;
  docsUnclassified: number;
  docsMissingRetention: number;
  agentRuns: { outcome: string }[];
  seatsTotal: number;
  seatsFilled: number;
};

export type ManagementReport = {
  headline: string;
  exceptions: string[];
  /** Share of agent runs that a human had to intervene in. */
  gatedRate: number;
};

/**
 * The dashboard, as prose an executive can read in ten seconds.
 *
 * Exceptions come first and there is no attempt to soften them. A report that
 * has to be interpreted before it can be acted on is a report nobody reads.
 */
export function buildReport(r: ReportInput): ManagementReport {
  const runs = r.agentRuns.length;
  const gated = r.agentRuns.filter((a) => a.outcome === "GATED" || a.outcome === "REJECTED").length;
  const gatedRate = runs === 0 ? 0 : gated / runs;

  const exceptions: string[] = [];
  if (r.tasksOverdue > 0) exceptions.push(`${r.tasksOverdue} task(s) past their due date.`);
  if (r.tasksBlocked > 0) exceptions.push(`${r.tasksBlocked} task(s) blocked.`);
  if (r.approvalsOverdue > 0) exceptions.push(`${r.approvalsOverdue} approval(s) past their expiry.`);
  if (r.docsUnclassified > 0) exceptions.push(`${r.docsUnclassified} document(s) with no classification.`);
  if (r.docsMissingRetention > 0) {
    exceptions.push(`${r.docsMissingRetention} document(s) with no retention class — disposal cannot be assessed.`);
  }
  const vacant = r.seatsTotal - r.seatsFilled;
  if (vacant > 0) exceptions.push(`${vacant} of ${r.seatsTotal} org seats vacant.`);
  if (runs > 0 && gatedRate > 0.5) {
    exceptions.push(`${Math.round(gatedRate * 100)}% of agent runs needed a human — the agents are not earning their place.`);
  }

  const headline =
    exceptions.length === 0
      ? `${r.tasksOpen} open task(s), nothing overdue and nothing waiting on a decision.`
      : `${r.tasksOpen} open task(s), ${r.approvalsPending} awaiting a decision, ${exceptions.length} exception(s).`;

  return { headline, exceptions, gatedRate };
}

// ── Phases (blueprint §15) ─────────────────────────────────────────────────

export const PHASES = [
  { id: 1, name: "Control foundation", outcome: "Taxonomy, roles, authority matrix, metadata, naming, classifications and risk rules approved." },
  { id: 2, name: "Repository migration", outcome: "Existing files inventoried, duplicates detected, classified, originals preserved." },
  { id: 3, name: "Workflow layer", outcome: "Universal work items, task templates, SLAs, approvals, notifications and dashboards." },
  { id: 4, name: "AI assistance", outcome: "Classification, extraction, drafting, comparison and filing recommendations — proposals only." },
  { id: 5, name: "Controlled autonomy", outcome: "Reversible low-risk automation running unattended, with an exception queue." },
  { id: 6, name: "Company OS", outcome: "CRM, finance, HR, project management and knowledge in one governed control plane." },
  { id: 7, name: "Optimization", outcome: "Process mining, workload analytics and quality results feeding structural change." },
] as const;

export type PhaseEvidence = {
  taxonomyLoaded: boolean;
  documentsRegistered: number;
  tasksCreated: number;
  approvalsUsed: number;
  agentsRegistered: number;
  agentsEnabled: number;
  agentRunsApplied: number;
  hrRecords: number;
  reportsGenerated: number;
};

export type PhaseStatus = {
  id: number;
  name: string;
  outcome: string;
  state: "done" | "in_progress" | "not_started";
  evidence: string;
};

/**
 * Which phase the system is actually in, derived from state rather than
 * declared.
 *
 * The distinction that matters is between phase 4 and phase 5: an agent that
 * only proposes is assistance, and an agent that acts unattended is autonomy.
 * That is not a claim anybody makes in a status report — it is whether
 * `enabled` is true and whether any run has outcome APPLIED.
 */
export function assessPhases(e: PhaseEvidence): PhaseStatus[] {
  const status = (id: number, state: PhaseStatus["state"], evidence: string): PhaseStatus => {
    const p = PHASES.find((x) => x.id === id)!;
    return { id, name: p.name, outcome: p.outcome, state, evidence };
  };

  return [
    status(
      1,
      e.taxonomyLoaded ? "done" : "not_started",
      e.taxonomyLoaded ? "Controlled config loaded and enforced in code." : "Config not loaded."
    ),
    status(
      2,
      e.documentsRegistered > 0 ? "in_progress" : "not_started",
      `${e.documentsRegistered} document(s) in the register.`
    ),
    status(
      3,
      e.tasksCreated > 0 || e.approvalsUsed > 0 ? "done" : "in_progress",
      `${e.tasksCreated} task(s), ${e.approvalsUsed} approval(s). Lifecycle and gates enforced.`
    ),
    status(
      4,
      e.agentsRegistered > 0 ? "done" : "not_started",
      `${e.agentsRegistered} agent(s) registered and proposing.`
    ),
    status(
      5,
      e.agentsEnabled === 0 ? "not_started" : e.agentRunsApplied > 0 ? "in_progress" : "not_started",
      e.agentsEnabled === 0
        ? "No agent is enabled — everything is a proposal."
        : `${e.agentsEnabled} agent(s) enabled, ${e.agentRunsApplied} action(s) applied unattended.`
    ),
    status(
      6,
      e.hrRecords > 0 ? "in_progress" : "not_started",
      `HR and org in the same control plane; CRM and finance not yet integrated.`
    ),
    status(
      7,
      e.reportsGenerated > 0 ? "in_progress" : "not_started",
      `${e.reportsGenerated} management report(s) generated.`
    ),
  ];
}
