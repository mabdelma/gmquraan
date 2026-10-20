/**
 * CRM rules, from 06_COMMERCIAL/00_AI_CRM_SYSTEM.
 *
 * The core rule the module states first and everything else follows from:
 * one canonical customer, many opportunities, one independent workflow per
 * opportunity, one shared history, no duplicate customer records.
 *
 * One conflict between two controlled files is resolved here and marked.
 * BUSINESS_RULES.md says value, probability and expected close date are
 * "mandatory from Qualified onward"; opportunity_workflow.yaml only lists them
 * as required from `proposal`. §8 of the deployment prompt says higher-level
 * governance overrides lower-level convenience, and a policy file outranks a
 * workflow file, so the stricter reading wins: required from qualified.
 */

export const OPPORTUNITY_STAGES = [
  "new",
  "contacted",
  "qualified",
  "on_hold",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;
export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number];

export const TERMINAL_STAGES: readonly OpportunityStage[] = ["won", "lost"];

/** Verbatim from opportunity_workflow.yaml. */
export const STAGE_PROBABILITY: Record<OpportunityStage, number> = {
  new: 5,
  contacted: 15,
  qualified: 35,
  on_hold: 20,
  proposal: 55,
  negotiation: 75,
  won: 100,
  lost: 0,
};

/** Verbatim from opportunity_workflow.yaml. */
export const STAGE_TRANSITIONS: Record<OpportunityStage, readonly OpportunityStage[]> = {
  new: ["contacted", "on_hold", "lost"],
  contacted: ["new", "qualified", "on_hold", "lost"],
  qualified: ["contacted", "proposal", "on_hold", "lost"],
  on_hold: ["new", "contacted", "qualified", "proposal", "negotiation", "lost"],
  proposal: ["qualified", "negotiation", "on_hold", "lost"],
  negotiation: ["proposal", "won", "on_hold", "lost"],
  // Reopening a lost opportunity is allowed and needs a sales manager.
  lost: ["new", "contacted", "qualified"],
  // Won is terminal. Correcting one is an approval, not a transition.
  won: [],
};

/** Stages a transition backwards from — a reason is required. */
const STAGE_ORDER: OpportunityStage[] = ["new", "contacted", "qualified", "proposal", "negotiation", "won"];

export function isBackwardTransition(from: OpportunityStage, to: OpportunityStage): boolean {
  const a = STAGE_ORDER.indexOf(from);
  const b = STAGE_ORDER.indexOf(to);
  // on_hold and lost are not on the linear path; moving to them is not
  // "backwards", it is sideways, and has its own required fields instead.
  if (a === -1 || b === -1) return false;
  return b < a;
}

export type OpportunityFields = {
  estimatedValue?: number | null;
  currency?: string | null;
  expectedCloseDate?: Date | string | null;
  probability?: number | null;
  lostReason?: string | null;
  holdReason?: string | null;
  followUpDate?: Date | string | null;
  closedAt?: Date | string | null;
  handoverOwnerId?: string | null;
  /** Required on a backward move, per approval_rules. */
  reason?: string | null;
};

const present = (v: unknown) =>
  v !== null && v !== undefined && (typeof v !== "string" || v.trim().length > 0);

/**
 * Fields an opportunity must carry to sit in a stage.
 *
 * Commercial stages need a number and a date because a pipeline of
 * opportunities with no value is a list, not a forecast.
 */
export function missingStageFields(stage: OpportunityStage, f: OpportunityFields): string[] {
  const missing: string[] = [];

  // See the note at the top: policy says qualified, the workflow file says
  // proposal, and policy wins.
  const commercial: OpportunityStage[] = ["qualified", "proposal", "negotiation", "won"];
  if (commercial.includes(stage)) {
    if (!present(f.estimatedValue)) missing.push("estimated value");
    if (!present(f.currency)) missing.push("currency");
    if (!present(f.expectedCloseDate)) missing.push("expected close date");
    if (!present(f.probability)) missing.push("probability");
  }

  if (stage === "on_hold") {
    if (!present(f.holdReason)) missing.push("hold reason");
    if (!present(f.followUpDate)) missing.push("follow-up date");
  }

  if (stage === "lost") {
    if (!present(f.lostReason)) missing.push("lost reason");
    if (!present(f.closedAt)) missing.push("closed date");
  }

  if (stage === "won") {
    if (!present(f.closedAt)) missing.push("closed date");
    // "Won requires approved commercial terms and a named delivery handover
    // owner" — a won deal nobody owns for delivery is how a sale becomes a
    // problem three weeks later.
    if (!present(f.handoverOwnerId)) missing.push("delivery handover owner");
  }

  return missing;
}

export type StageMoveVerdict =
  | { ok: true; needsApproval: null | "sales_manager"; probability: number }
  | { ok: false; reason: string };

/**
 * Whether an opportunity may move, and what it costs to do so.
 *
 * Reopening a lost opportunity is permitted but needs a sales manager, which
 * the caller enforces — this reports the requirement rather than assuming the
 * caller knows.
 */
export function stageMove(
  from: OpportunityStage,
  to: OpportunityStage,
  f: OpportunityFields
): StageMoveVerdict {
  if (from === to) return { ok: false, reason: "It is already at that stage." };

  if (!STAGE_TRANSITIONS[from].includes(to)) {
    const allowed = STAGE_TRANSITIONS[from];
    return {
      ok: false,
      reason: allowed.length
        ? `From ${from} it can only move to ${allowed.join(", ")}.`
        : `${from} is final — correcting it is an approval, not a stage change.`,
    };
  }

  const missing = missingStageFields(to, f);
  if (missing.length) return { ok: false, reason: `Before ${to}, record: ${missing.join(", ")}.` };

  if (isBackwardTransition(from, to) && !present(f.reason)) {
    return { ok: false, reason: "Moving an opportunity backwards needs a reason." };
  }

  return {
    ok: true,
    needsApproval: from === "lost" ? "sales_manager" : null,
    probability: f.probability ?? STAGE_PROBABILITY[to],
  };
}

// ── Deduplication (customer_creation_and_deduplication.yaml) ───────────────

export type CustomerCandidate = {
  id: string;
  displayName: string;
  legalName?: string | null;
  taxId?: string | null;
  websiteDomain?: string | null;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
};

export type DedupOutcome =
  /** An exact tax identifier is the same legal entity. Creating a second is wrong. */
  | { decision: "block_create_and_link_existing"; matchId: string; because: string }
  /** Strong but not conclusive — a person decides. */
  | { decision: "request_review"; candidates: { id: string; because: string }[] }
  | { decision: "allow_create" };

/** Normalise for comparison: case, punctuation and common company suffixes. */
export function normaliseCompanyName(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(s\.?l\.?|s\.?a\.?|ltd|limited|llc|inc|incorporated|gmbh|bv|plc|co|corp|corporation|company)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const normaliseTaxId = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, "");
const normaliseDomain = (v: string) =>
  v.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];

/** Free-mail domains are not evidence that two customers are the same company. */
const FREE_MAIL = ["gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com", "proton.me", "protonmail.com"];

/**
 * Decide whether a proposed customer already exists.
 *
 * The order is the file's order and it matters. A matching tax identifier is
 * conclusive and blocks creation outright; everything else is evidence for a
 * person to weigh, because two companies genuinely can share a phone number or
 * have similar names.
 */
export function dedupeCustomer(
  proposed: Omit<CustomerCandidate, "id">,
  existing: readonly CustomerCandidate[]
): DedupOutcome {
  if (proposed.taxId) {
    const t = normaliseTaxId(proposed.taxId);
    const exact = existing.find((c) => c.taxId && normaliseTaxId(c.taxId) === t);
    if (exact) {
      return {
        decision: "block_create_and_link_existing",
        matchId: exact.id,
        because: `${exact.displayName} already holds tax identifier ${proposed.taxId}. The same legal entity cannot be two customers.`,
      };
    }
  }

  const review: { id: string; because: string }[] = [];

  if (proposed.websiteDomain) {
    const d = normaliseDomain(proposed.websiteDomain);
    for (const c of existing) {
      if (c.websiteDomain && normaliseDomain(c.websiteDomain) === d) {
        review.push({ id: c.id, because: `Same website domain as ${c.displayName}.` });
      }
    }
  }

  if (proposed.primaryEmail) {
    const e = proposed.primaryEmail.toLowerCase().trim();
    const domain = e.split("@")[1] ?? "";
    for (const c of existing) {
      if (c.primaryEmail && c.primaryEmail.toLowerCase().trim() === e) {
        review.push({ id: c.id, because: `Same primary email as ${c.displayName}.` });
      } else if (domain && !FREE_MAIL.includes(domain) && c.websiteDomain && normaliseDomain(c.websiteDomain) === domain) {
        review.push({ id: c.id, because: `Email domain matches ${c.displayName}'s website.` });
      }
    }
  }

  if (proposed.primaryPhone) {
    const p = proposed.primaryPhone.replace(/[^0-9]/g, "").slice(-9);
    if (p.length >= 7) {
      for (const c of existing) {
        if (c.primaryPhone && c.primaryPhone.replace(/[^0-9]/g, "").slice(-9) === p) {
          review.push({ id: c.id, because: `Same phone number as ${c.displayName}.` });
        }
      }
    }
  }

  const name = normaliseCompanyName(proposed.displayName || proposed.legalName || "");
  if (name.length >= 4) {
    for (const c of existing) {
      const other = normaliseCompanyName(c.displayName || c.legalName || "");
      if (other && other === name) {
        review.push({ id: c.id, because: `Name normalises to the same as ${c.displayName}.` });
      }
    }
  }

  if (review.length === 0) return { decision: "allow_create" };

  // One entry per candidate, keeping the first reason found for each.
  const seen = new Set<string>();
  const unique = review.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
  return { decision: "request_review", candidates: unique };
}

// ── Inactivity (inactivity_and_followup_rules.yaml) ────────────────────────

/** Days a stage may sit without activity before it is a breach. */
export const INACTIVITY_DAYS: Partial<Record<OpportunityStage, number>> = {
  new: 2,
  contacted: 3,
  qualified: 5,
  proposal: 7,
  negotiation: 5,
};

export type InactivityCheck = {
  stage: OpportunityStage;
  lastActivityAt: Date | string | null;
  stageEnteredAt: Date | string;
  followUpDate?: Date | string | null;
  /** How many times this opportunity has already breached. */
  priorBreaches?: number;
};

export type InactivityVerdict =
  | { breached: false }
  | { breached: true; days: number; reason: string; escalate: boolean };

/**
 * Whether an opportunity has gone quiet for too long.
 *
 * On hold is measured against its own follow-up date rather than a stage
 * timeout, because an opportunity deliberately parked until March is not
 * neglected — it is parked. It becomes a breach the hour that date passes.
 */
export function inactivityBreach(c: InactivityCheck, now = new Date()): InactivityVerdict {
  const escalate = (c.priorBreaches ?? 0) >= 1;

  if (c.stage === "on_hold") {
    if (!c.followUpDate) {
      return { breached: true, days: 0, reason: "On hold with no follow-up date.", escalate };
    }
    const due = new Date(c.followUpDate).getTime();
    if (due < now.getTime()) {
      const hours = Math.floor((now.getTime() - due) / 3_600_000);
      return {
        breached: true,
        days: Math.floor(hours / 24),
        reason: `Follow-up was due ${hours} hour(s) ago.`,
        escalate,
      };
    }
    return { breached: false };
  }

  const limit = INACTIVITY_DAYS[c.stage];
  if (limit === undefined) return { breached: false };

  // No activity at all is measured from when it entered the stage, not treated
  // as fresh — silence since day one is the worst case, not an exemption.
  const since = new Date(c.lastActivityAt ?? c.stageEnteredAt).getTime();
  const days = Math.floor((now.getTime() - since) / 86_400_000);
  if (days > limit) {
    return {
      breached: true,
      days,
      reason: `${days} days without activity at ${c.stage}; the limit is ${limit}.`,
      escalate,
    };
  }
  return { breached: false };
}

// ── Identifiers ────────────────────────────────────────────────────────────

/** Opportunity numbers are immutable and globally unique. */
export function opportunityRef(year: number, sequence: number): string {
  return `OPP-${year}-${String(sequence).padStart(5, "0")}`;
}

export function customerRef(sequence: number): string {
  return `CUS-${String(sequence).padStart(6, "0")}`;
}
