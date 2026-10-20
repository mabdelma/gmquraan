/**
 * Document packs — what each person is required to have on file, and who may
 * see each item.
 *
 * The accessibility is the substance here, not an afterthought. A contract, a
 * passport scan and a bank mandate are all "HR documents" in casual speech and
 * three completely different disclosure risks in practice, so each requirement
 * carries its own classification and audience rather than inheriting one from
 * the folder it happens to sit in.
 *
 * Packs compose: everyone gets the base pack, and a tier or an employment type
 * adds to it. Nothing ever removes a base requirement — a director still needs
 * a signed contract.
 */
import type { Confidentiality, DocType } from "./config.js";
import { ROLE_TIER, type OrgTier } from "./org.js";
import type { EmploymentType } from "./hr.js";
import type { AreaAudience } from "./workspace.js";

export type DocumentRequirement = {
  code: string;
  name: string;
  /** Which controlled document type it files as. */
  docType: DocType;
  classification: Confidentiality;
  /** Who, besides the person themselves, may open it. */
  audience: AreaAudience;
  /** Whose job it is to produce it. */
  providedBy: "employee" | "company" | "both";
  /** When it falls due. */
  cadence: "on_joining" | "annual" | "on_role_change" | "on_leaving";
  retentionClass: string;
  /** A missing mandatory item is a compliance gap; an optional one is a nudge. */
  mandatory: boolean;
  note?: string;
};

/** Required of everybody with an employment relationship. */
export const BASE_PACK: readonly DocumentRequirement[] = [
  {
    code: "CONTRACT",
    name: "Signed employment contract",
    docType: "CTR",
    classification: "RESTRICTED",
    audience: "hr",
    providedBy: "both",
    cadence: "on_joining",
    retentionClass: "EMPLOYMENT+STATUTORY",
    mandatory: true,
  },
  {
    code: "IDENTITY",
    name: "Identity document",
    docType: "HRF",
    classification: "RESTRICTED",
    audience: "hr",
    providedBy: "employee",
    cadence: "on_joining",
    retentionClass: "EMPLOYMENT+STATUTORY",
    mandatory: true,
    note: "Passport or national ID. Held for right-to-work evidence, not copied elsewhere.",
  },
  {
    code: "RIGHT_TO_WORK",
    name: "Right to work in the employing jurisdiction",
    docType: "HRF",
    classification: "RESTRICTED",
    audience: "hr",
    providedBy: "employee",
    cadence: "on_joining",
    retentionClass: "EMPLOYMENT+STATUTORY",
    mandatory: true,
    note: "Differs by entity — a Spanish contract and an Emirati one need different evidence.",
  },
  {
    code: "NDA",
    name: "Confidentiality undertaking",
    docType: "CTR",
    classification: "CONFIDENTIAL",
    audience: "hr",
    providedBy: "both",
    cadence: "on_joining",
    retentionClass: "EXPIRY+10Y",
    mandatory: true,
  },
  {
    code: "PAYMENT_DETAILS",
    name: "Payment details",
    docType: "HRF",
    // The single most abused record in any HR system: a changed bank mandate is
    // how payroll fraud happens. Restricted, and payroll changes are HUMAN_ONLY
    // in the autonomy matrix for the same reason.
    classification: "RESTRICTED",
    audience: "hr",
    providedBy: "employee",
    cadence: "on_joining",
    retentionClass: "EMPLOYMENT+STATUTORY",
    mandatory: true,
  },
  {
    code: "EMERGENCY_CONTACT",
    name: "Emergency contact",
    docType: "HRF",
    classification: "RESTRICTED",
    audience: "hr",
    providedBy: "employee",
    cadence: "on_joining",
    retentionClass: "EMPLOYMENT+STATUTORY",
    mandatory: true,
  },
  {
    code: "POLICY_ACK",
    name: "Policy acknowledgement",
    docType: "POL",
    classification: "INTERNAL",
    audience: "line",
    providedBy: "employee",
    cadence: "annual",
    retentionClass: "ACTIVE+7Y",
    mandatory: true,
    note: "Acceptable use, privacy, security and the AI policy. Re-acknowledged each year.",
  },
];

/** Somebody engaged rather than employed. */
export const CONTRACTOR_PACK: readonly DocumentRequirement[] = [
  {
    code: "SERVICES_AGREEMENT",
    name: "Services agreement",
    docType: "CTR",
    classification: "CONFIDENTIAL",
    audience: "hr",
    providedBy: "both",
    cadence: "on_joining",
    retentionClass: "EXPIRY+10Y",
    mandatory: true,
  },
  {
    code: "TAX_REGISTRATION",
    name: "Tax or VAT registration",
    docType: "HRF",
    classification: "CONFIDENTIAL",
    audience: "hr",
    providedBy: "employee",
    cadence: "on_joining",
    retentionClass: "STATUTORY",
    mandatory: true,
    note: "Self-employment status is a tax question in every one of our jurisdictions.",
  },
  {
    code: "INSURANCE",
    name: "Professional indemnity or liability cover",
    docType: "HRF",
    classification: "INTERNAL",
    audience: "hr",
    providedBy: "employee",
    cadence: "annual",
    retentionClass: "ACTIVE+7Y",
    mandatory: false,
  },
];

/** Anybody who can approve at A2 or above. */
export const MANAGER_PACK: readonly DocumentRequirement[] = [
  {
    code: "DELEGATION",
    name: "Delegation of authority",
    docType: "DEC",
    // A governance record: what somebody may approve is not a private matter,
    // and hiding it would make the approval trail unauditable.
    classification: "INTERNAL",
    audience: "group",
    providedBy: "company",
    cadence: "on_role_change",
    retentionClass: "PERM",
    mandatory: true,
  },
];

/** Executive committee and above. */
export const EXECUTIVE_PACK: readonly DocumentRequirement[] = [
  {
    code: "CONFLICT_OF_INTEREST",
    name: "Conflict of interest declaration",
    docType: "DEC",
    classification: "CONFIDENTIAL",
    audience: "hr",
    providedBy: "employee",
    cadence: "annual",
    retentionClass: "PERM",
    mandatory: true,
  },
  {
    code: "DIRECTOR_CONSENT",
    name: "Consent to act and statutory filings",
    docType: "DEC",
    classification: "INTERNAL",
    audience: "group",
    providedBy: "company",
    cadence: "on_role_change",
    retentionClass: "PERM",
    mandatory: false,
    note: "Only where the person is a filed director of an entity.",
  },
];

/** Anybody with technical custody of production systems. */
export const INFRA_PACK: readonly DocumentRequirement[] = [
  {
    code: "PRIVILEGED_ACCESS",
    name: "Privileged access undertaking",
    docType: "POL",
    classification: "INTERNAL",
    audience: "hr",
    providedBy: "both",
    cadence: "annual",
    retentionClass: "ACTIVE+7Y",
    mandatory: true,
    note: "Acknowledges that administrative access carries no business authority.",
  },
];

const TIERS_WITH_DELEGATION: readonly OrgTier[] = [
  "DEPARTMENT_MANAGER",
  "FUNCTIONAL_DIRECTOR",
  "ENTITY_GM",
  "EXCO",
  "GROUP_CEO",
  "BOARD",
];

const EXECUTIVE_TIERS: readonly OrgTier[] = ["EXCO", "GROUP_CEO", "BOARD"];

export type PackSubject = {
  tier: OrgTier;
  employmentType: EmploymentType;
};

/**
 * Everything this person is required to have.
 *
 * A contractor gets the contractor pack *instead of* the employment base —
 * asking a supplier for a right-to-work document is both wrong and a data
 * protection problem — but still gets the confidentiality undertaking and the
 * policy acknowledgement, because those are about access rather than
 * employment.
 */
export function requiredDocuments(s: PackSubject): DocumentRequirement[] {
  const out: DocumentRequirement[] = [];

  if (s.employmentType === "CONTRACTOR" || s.employmentType === "ADVISOR") {
    out.push(...CONTRACTOR_PACK);
    out.push(...BASE_PACK.filter((d) => d.code === "NDA" || d.code === "POLICY_ACK"));
  } else {
    out.push(...BASE_PACK);
  }

  if (TIERS_WITH_DELEGATION.includes(s.tier)) out.push(...MANAGER_PACK);
  if (EXECUTIVE_TIERS.includes(s.tier)) out.push(...EXECUTIVE_PACK);
  if (s.tier === "INFRA_ADMIN") out.push(...INFRA_PACK);

  // Composition can repeat an item; the strictest wins so a lower-classified
  // duplicate can never downgrade one that is already restricted.
  const byCode = new Map<string, DocumentRequirement>();
  for (const d of out) {
    const existing = byCode.get(d.code);
    if (!existing || rank(d.classification) > rank(existing.classification)) byCode.set(d.code, d);
  }
  return [...byCode.values()];
}

const ORDER: Confidentiality[] = ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED", "PRIVILEGED"];
const rank = (c: Confidentiality) => ORDER.indexOf(c);

/** The pack for somebody, resolved from their role rather than their tier. */
export function requiredDocumentsForRole(role: keyof typeof ROLE_TIER, employmentType: EmploymentType) {
  return requiredDocuments({ tier: ROLE_TIER[role], employmentType });
}

export type HeldDocument = { code: string; status: string; expiresAt?: Date | string | null };

export type PackGap = {
  code: string;
  name: string;
  mandatory: boolean;
  reason: "missing" | "expired" | "unverified";
};

/**
 * What is outstanding.
 *
 * "Provided" is not the same as "verified": somebody uploading a document is
 * not somebody in HR having looked at it, and for a right-to-work check the
 * difference is the whole control.
 */
export function packGaps(required: readonly DocumentRequirement[], held: readonly HeldDocument[], now = new Date()): PackGap[] {
  const byCode = new Map(held.map((h) => [h.code, h]));
  const gaps: PackGap[] = [];

  for (const r of required) {
    const h = byCode.get(r.code);
    if (!h || h.status === "MISSING") {
      gaps.push({ code: r.code, name: r.name, mandatory: r.mandatory, reason: "missing" });
      continue;
    }
    if (h.expiresAt && new Date(h.expiresAt) < now) {
      gaps.push({ code: r.code, name: r.name, mandatory: r.mandatory, reason: "expired" });
      continue;
    }
    if (h.status === "PROVIDED") {
      gaps.push({ code: r.code, name: r.name, mandatory: r.mandatory, reason: "unverified" });
    }
  }
  return gaps;
}

/** Whether somebody is clear to work — every mandatory item verified and current. */
export function packComplete(gaps: readonly PackGap[]): boolean {
  return gaps.every((g) => !g.mandatory);
}
