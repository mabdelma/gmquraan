/**
 * The controlled configuration, transcribed into types.
 *
 * Every table here comes from a file under /gmos/00_SYSTEM. That package is the
 * authority; this module exists so the rest of the codebase can rely on the
 * values without parsing CSV and YAML at runtime.
 *
 * The transcription is not trusted on faith — `config-drift.test.ts` reads the
 * actual files and fails if any row here disagrees with them. Edit the
 * controlled config first, then follow the failing test.
 */

// ── Entities (00_SYSTEM/01_CONFIGURATION/entities.csv) ──────────────────────

export const ENTITY_IDS = ["ORG-ES", "ORG-UAE", "ORG-CA", "ORG-EG"] as const;
export type EntityId = (typeof ENTITY_IDS)[number];

export const ENTITIES: Record<
  EntityId,
  { legalName: string; country: string; currency: string; status: string }
> = {
  "ORG-ES": { legalName: "Unskinned S.L.", country: "Spain", currency: "EUR", status: "active" },
  "ORG-UAE": { legalName: "Unskinned UAE", country: "United Arab Emirates", currency: "AED", status: "planned_or_active" },
  "ORG-CA": { legalName: "Unskinned Canada", country: "Canada", currency: "CAD", status: "planned_or_active" },
  // Example Country has staff in North City and Alexandria but no registration of its own, so
  // it is an operating location rather than a legal entity. It gets a
  // hierarchy like any other branch; it does not get a legal status it lacks.
  "ORG-EG": { legalName: "Unskinned Example Country Office", country: "Example Country", currency: "EGP", status: "operating_location" },
};

/** Entities that are registered companies, as opposed to operating locations. */
export const REGISTERED_ENTITY_IDS = ENTITY_IDS.filter((e) => ENTITIES[e].status !== "operating_location");

export const isRegisteredEntity = (e: EntityId): boolean => ENTITIES[e].status !== "operating_location";

/**
 * The branch slugs used by the public site map onto entity ids. Kept here
 * rather than in the web app because the orchestrator needs it too.
 */
export const BRANCH_TO_ENTITY: Record<string, EntityId> = {
  spain: "ORG-ES",
  uae: "ORG-UAE",
  canada: "ORG-CA",
  egypt: "ORG-EG",
};

// ── Departments (01_CONFIGURATION/departments.csv) ──────────────────────────

export const DEPARTMENT_IDS = ["GOV", "OPS", "FIN", "PEO", "COM", "DEL", "TEC", "MKT", "LRC"] as const;
export type DepartmentId = (typeof DEPARTMENT_IDS)[number];

export const DEPARTMENTS: Record<DepartmentId, { name: string; executiveOwner: string }> = {
  GOV: { name: "Governance", executiveOwner: "CEO" },
  OPS: { name: "Operations", executiveOwner: "COO" },
  FIN: { name: "Finance and Procurement", executiveOwner: "CFO" },
  PEO: { name: "People and Organization", executiveOwner: "COO" },
  COM: { name: "Commercial", executiveOwner: "CCO" },
  DEL: { name: "Delivery and Projects", executiveOwner: "COO" },
  TEC: { name: "Products and Technology", executiveOwner: "CTO" },
  MKT: { name: "Marketing and Brand", executiveOwner: "CMO" },
  LRC: { name: "Legal Risk and Compliance", executiveOwner: "CEO" },
};

// ── Roles and approval levels (roles.csv, approval_limits.csv) ─────────────

export const APPROVAL_LEVELS = ["A0", "A1", "A2", "A3", "A4"] as const;
export type ApprovalLevel = (typeof APPROVAL_LEVELS)[number];

export const APPROVAL_LIMITS: Record<ApprovalLevel, { description: string; authority: string }> = {
  A0: { description: "Prepare only", authority: "Draft, classify, recommend" },
  A1: { description: "Routine operational approval", authority: "Low-risk internal actions" },
  A2: { description: "Department approval", authority: "Department records and expenditure within limit" },
  A3: { description: "Executive approval", authority: "Material contracts, hiring, budgets" },
  A4: { description: "Board/shareholder approval", authority: "Reserved matters" },
};

/** True when `held` is at least `required`. A4 clears everything. */
export function meetsLevel(held: ApprovalLevel, required: ApprovalLevel): boolean {
  return APPROVAL_LEVELS.indexOf(held) >= APPROVAL_LEVELS.indexOf(required);
}

/** The Prisma `GmRole` values, in the order roles.csv lists them. */
export const GM_ROLES = [
  "BOARD",
  "CEO",
  "COO",
  "DOC_CONTROLLER",
  "CFO",
  "CTO",
  "ENTITY_GM",
  "FUNCTIONAL_DIRECTOR",
  "MANAGER",
  "PROJECT_MANAGER",
  "EMPLOYEE",
  "CONTRACTOR",
  "EXTERNAL",
  "AI_OPS",
  "INFRA_ADMIN",
] as const;
export type GmRole = (typeof GM_ROLES)[number];

/** roles.csv `role_id` for each schema role — the two vocabularies differ. */
export const ROLE_IDS: Record<GmRole, string> = {
  BOARD: "BOARD",
  CEO: "CEO",
  COO: "COO",
  DOC_CONTROLLER: "DOC",
  CFO: "CFO",
  CTO: "CTO",
  ENTITY_GM: "GM",
  FUNCTIONAL_DIRECTOR: "DIR",
  MANAGER: "MGR",
  PROJECT_MANAGER: "PPM",
  EMPLOYEE: "EMP",
  CONTRACTOR: "CON",
  EXTERNAL: "EXT",
  AI_OPS: "AI-OPS",
  INFRA_ADMIN: "INFRA",
};

/**
 * The approval level a role starts with. It is a default, not a cap: a member's
 * level is stored per person so a manager can be granted A3 for a mandate
 * without being made an executive.
 */
export const ROLE_DEFAULT_LEVEL: Record<GmRole, ApprovalLevel> = {
  BOARD: "A4",
  CEO: "A4",
  COO: "A3",
  CFO: "A3",
  CTO: "A3",
  DOC_CONTROLLER: "A2",
  ENTITY_GM: "A3",
  FUNCTIONAL_DIRECTOR: "A3",
  MANAGER: "A2",
  PROJECT_MANAGER: "A1",
  EMPLOYEE: "A0",
  CONTRACTOR: "A0",
  EXTERNAL: "A0",
  AI_OPS: "A0",
  // Technical custody, not commercial authority. See org.ts.
  INFRA_ADMIN: "A0",
};

export const ROLE_REPORTS_TO: Record<GmRole, GmRole | null> = {
  BOARD: null,
  CEO: "BOARD",
  COO: "CEO",
  CFO: "CEO",
  CTO: "CEO",
  DOC_CONTROLLER: "COO",
  ENTITY_GM: "COO",
  FUNCTIONAL_DIRECTOR: "ENTITY_GM",
  MANAGER: null, // "Executive Owner" — depends on the department, not a fixed role
  PROJECT_MANAGER: "MANAGER",
  EMPLOYEE: "MANAGER",
  CONTRACTOR: "MANAGER",
  EXTERNAL: null,
  AI_OPS: "COO",
  INFRA_ADMIN: "CTO",
};

// ── Confidentiality (06_SECURITY/data_classification.md) ───────────────────

export const CONFIDENTIALITY = ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED", "PRIVILEGED"] as const;
export type Confidentiality = (typeof CONFIDENTIALITY)[number];

export const CONFIDENTIALITY_MEANING: Record<Confidentiality, string> = {
  PUBLIC: "Approved for unrestricted distribution.",
  INTERNAL: "Normal business use.",
  CONFIDENTIAL: "Commercial, financial, technical, or partner-sensitive.",
  RESTRICTED: "Personal data, credentials, banking, security, or highly sensitive strategy.",
  PRIVILEGED: "Protected legal or investigation material.",
};

/** True when a holder of `clearance` may see something marked `level`. */
export function clears(clearance: Confidentiality, level: Confidentiality): boolean {
  return CONFIDENTIALITY.indexOf(clearance) >= CONFIDENTIALITY.indexOf(level);
}

// ── Document types (03_TAXONOMIES/document_types.csv) ──────────────────────

export const DOC_TYPES = ["POL", "SOP", "CTR", "MIN", "DEC", "INV", "HRF", "PRJ", "TEC", "MKT"] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const DOC_TYPE_INFO: Record<DocType, { name: string; defaultOwner: string; defaultRetention: string }> = {
  POL: { name: "Policy", defaultOwner: "Governance", defaultRetention: "PERM" },
  SOP: { name: "Standard Operating Procedure", defaultOwner: "Operations", defaultRetention: "ACTIVE+7Y" },
  CTR: { name: "Contract", defaultOwner: "Legal", defaultRetention: "EXPIRY+10Y" },
  MIN: { name: "Meeting Minutes", defaultOwner: "Secretariat", defaultRetention: "10Y" },
  DEC: { name: "Decision Record", defaultOwner: "Governance", defaultRetention: "PERM" },
  INV: { name: "Invoice", defaultOwner: "Finance", defaultRetention: "STATUTORY" },
  HRF: { name: "Employee Record", defaultOwner: "People", defaultRetention: "EMPLOYMENT+STATUTORY" },
  PRJ: { name: "Project Record", defaultOwner: "Delivery", defaultRetention: "CLOSE+7Y" },
  TEC: { name: "Technical Record", defaultOwner: "Technology", defaultRetention: "ACTIVE+5Y" },
  MKT: { name: "Marketing Asset", defaultOwner: "Marketing", defaultRetention: "ACTIVE+3Y" },
};

// ── Group configuration (01_CONFIGURATION/group_config.json) ───────────────

export const GROUP_CONFIG = {
  groupId: "ORG-GROUP",
  groupName: "Unskinned",
  defaultLanguage: "en",
  timezone: "Europe/Madrid",
  /** At or above this, an agent may file without asking. */
  aiConfidenceAutoFile: 0.92,
  /** Below this, a human must classify — see the low-confidence routing rule. */
  aiConfidenceHumanReview: 0.7,
  destructiveActionsRequireHumanApproval: true,
} as const;

// ── Agent catalogue (00_SYSTEM/10_AI_AGENTS_CATALOGUE.csv) ─────────────────

export const AGENT_KEYS = [
  "AI-ORCH",
  "AI-DOC",
  "AI-SCHED",
  "AI-QA",
  "AI-COMP",
  "AI-REC",
  "AI-REP",
  "AI-KNOW",
] as const;
export type AgentKey = (typeof AGENT_KEYS)[number];

export const AGENTS: Record<AgentKey, { name: string; purpose: string }> = {
  "AI-ORCH": {
    name: "Orchestration Agent",
    purpose: "Receives work, decomposes it, resolves dependencies and routes tasks.",
  },
  "AI-DOC": {
    name: "Document Control Agent",
    purpose: "Classifies, names, versions, validates metadata and files documents.",
  },
  "AI-SCHED": {
    name: "Workforce Scheduling Agent",
    purpose: "Matches tasks to available qualified employees and priorities.",
  },
  "AI-QA": {
    name: "Quality Agent",
    purpose: "Checks outputs against acceptance criteria, templates and controls.",
  },
  "AI-COMP": {
    name: "Compliance Agent",
    purpose: "Screens privacy, legal, policy, retention and approval requirements.",
  },
  "AI-REC": {
    name: "Records Agent",
    purpose: "Manages supersession, archival, legal hold and controlled deletion.",
  },
  "AI-REP": {
    name: "Reporting Agent",
    purpose: "Produces dashboards, exceptions, decisions and management summaries.",
  },
  "AI-KNOW": {
    name: "Knowledge Agent",
    purpose: "Links related records, extracts reusable knowledge and prevents duplication.",
  },
};

// ── Information architecture zones (the /gmos root) ────────────────────────

export const ZONES = [
  "00_SYSTEM",
  "01_GROUP_GOVERNANCE",
  "02_LEGAL_ENTITIES",
  "03_STRATEGY_AND_PORTFOLIO",
  "04_PEOPLE_AND_ORGANIZATION",
  "05_LEGAL_RISK_COMPLIANCE",
  "06_COMMERCIAL",
  "07_DELIVERY_AND_PROJECTS",
  "08_FINANCE_AND_PROCUREMENT",
  "09_PRODUCTS_AND_TECHNOLOGY",
  "10_MARKETING_AND_BRAND",
  "11_OPERATIONS_AND_ADMIN",
  "12_INBOX_AND_QUARANTINE",
  "13_TEMPLATES",
  "14_RECORDS_AND_ARCHIVE",
  "15_EXAMPLES",
  "16_REFERENCE_BLUEPRINT",
] as const;
export type Zone = (typeof ZONES)[number];

/** Where an item goes when nothing else claims it — never a catch-all folder. */
export const QUARANTINE_ZONE: Zone = "12_INBOX_AND_QUARANTINE";
export const LOW_CONFIDENCE_DESTINATION = "12_INBOX_AND_QUARANTINE/04_AI_LOW_CONFIDENCE";
