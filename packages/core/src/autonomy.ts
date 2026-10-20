/**
 * The autonomy matrix (00_SYSTEM/04_AI_RULES/autonomy_matrix.yaml).
 *
 * This is the module that decides whether an agent may act, propose, or must
 * stop and ask. Everything else in GM-OS routes through it, so it is
 * deliberately small, total, and closed by default: an action nobody has
 * declared is not "probably fine", it is HUMAN_ONLY.
 */
import { GROUP_CONFIG, meetsLevel, type ApprovalLevel } from "./config.js";

export const GATES = [
  "AUTO",
  "AUTO_WITH_AUDIT",
  "HUMAN_APPROVAL",
  "HUMAN_ONLY",
  "DUAL_HUMAN_APPROVAL",
  "RECORDS_OWNER_AND_LEGAL_APPROVAL",
  "SECURITY_OWNER_APPROVAL",
] as const;
export type Gate = (typeof GATES)[number];

/** Ordered least to most restrictive, so gates can be compared. */
const GATE_RANK: Record<Gate, number> = {
  AUTO: 0,
  AUTO_WITH_AUDIT: 1,
  HUMAN_APPROVAL: 2,
  SECURITY_OWNER_APPROVAL: 3,
  RECORDS_OWNER_AND_LEGAL_APPROVAL: 4,
  DUAL_HUMAN_APPROVAL: 5,
  HUMAN_ONLY: 6,
};

/** Verbatim from the YAML. */
export const AUTONOMY_MATRIX = {
  classify_and_tag: "AUTO",
  create_draft_from_template: "AUTO",
  assign_routine_task: "AUTO_WITH_AUDIT",
  move_approved_record: "AUTO_WITH_AUDIT",
  external_send: "HUMAN_APPROVAL",
  legal_signature: "HUMAN_ONLY",
  payroll_change: "HUMAN_ONLY",
  bank_payment: "DUAL_HUMAN_APPROVAL",
  permanent_delete: "RECORDS_OWNER_AND_LEGAL_APPROVAL",
  access_change_restricted: "SECURITY_OWNER_APPROVAL",
  /** An employee asking HR to correct a published card detail. */
  card_correction: "HUMAN_APPROVAL",
  employee_record_change: "HUMAN_APPROVAL",
  leave_decision: "HUMAN_APPROVAL",
  /**
   * Withdrawing a leaver's access. Automatic on purpose: a control that waits
   * for somebody to click it is not a control, and revoking access from
   * somebody who has left is safe to get wrong in that direction.
   */
  offboard_revoke_access: "AUTO_WITH_AUDIT",
  /**
   * Letting an agent act unattended. The moment the system stops proposing and
   * starts doing, so it needs the security owner — while *disabling* an agent
   * needs nobody, because stopping a machine should never wait for a signature.
   */
  agent_enable: "SECURITY_OWNER_APPROVAL",
} as const satisfies Record<string, Gate>;

export type AutonomyAction = keyof typeof AUTONOMY_MATRIX;

/**
 * The gate for an action.
 *
 * An unknown action returns HUMAN_ONLY. That is the whole safety property of
 * this function: as agents grow new capabilities, the ones nobody has thought
 * about cannot run unattended just because they were never listed.
 */
export function gateFor(action: string): Gate {
  return (AUTONOMY_MATRIX as Record<string, Gate>)[action] ?? "HUMAN_ONLY";
}

/** Gates an agent can never clear on its own, whatever its registry setting. */
export const NEVER_AUTONOMOUS: readonly Gate[] = [
  "HUMAN_ONLY",
  "DUAL_HUMAN_APPROVAL",
  "RECORDS_OWNER_AND_LEGAL_APPROVAL",
  "SECURITY_OWNER_APPROVAL",
  "HUMAN_APPROVAL",
];

/** The minimum approval level a human decider needs to clear each gate. */
export const GATE_MIN_LEVEL: Record<Gate, ApprovalLevel> = {
  AUTO: "A0",
  AUTO_WITH_AUDIT: "A0",
  HUMAN_APPROVAL: "A1",
  SECURITY_OWNER_APPROVAL: "A2",
  RECORDS_OWNER_AND_LEGAL_APPROVAL: "A3",
  DUAL_HUMAN_APPROVAL: "A3",
  HUMAN_ONLY: "A2",
};

/** Gates that are not satisfied by a single person. */
export const DUAL_GATES: readonly Gate[] = ["DUAL_HUMAN_APPROVAL", "RECORDS_OWNER_AND_LEGAL_APPROVAL"];

export function requiredApprovers(gate: Gate): number {
  return DUAL_GATES.includes(gate) ? 2 : 1;
}

export type AgentDecision =
  | { verdict: "PROCEED"; gate: Gate; audit: boolean }
  | { verdict: "GATED"; gate: Gate; reason: string; minLevel: ApprovalLevel; approversNeeded: number }
  | { verdict: "REFUSED"; gate: Gate; reason: string };

export type AgentContext = {
  /** The agent's registry ceiling. */
  maxGate: Gate;
  enabled: boolean;
  /** Classification confidence for this particular action, when relevant. */
  confidence?: number;
  autoFileConfidence?: number;
  humanReviewConfidence?: number;
};

/**
 * What an agent may do about `action` right now.
 *
 * Order matters and is the interesting part:
 *
 *  1. A disabled agent can only propose — nothing it says takes effect.
 *  2. Actions the matrix rates HUMAN_ONLY are refused outright, not queued.
 *     Signing, payroll and legal records are not things a human approves *on
 *     behalf of* an agent; a person does them.
 *  3. Confidence is checked before the gate, so a low-confidence "classify"
 *     goes to a human even though classification is otherwise AUTO.
 *  4. Everything left is compared against the agent's ceiling.
 */
export function decide(action: string, ctx: AgentContext): AgentDecision {
  const gate = gateFor(action);

  if (!ctx.enabled) {
    return { verdict: "GATED", gate, reason: "Agent is not enabled — proposal only.", minLevel: GATE_MIN_LEVEL[gate], approversNeeded: requiredApprovers(gate) };
  }

  if (gate === "HUMAN_ONLY") {
    return { verdict: "REFUSED", gate, reason: `${action} is reserved to a person and cannot be delegated.` };
  }

  const autoAt = ctx.autoFileConfidence ?? GROUP_CONFIG.aiConfidenceAutoFile;
  const reviewAt = ctx.humanReviewConfidence ?? GROUP_CONFIG.aiConfidenceHumanReview;
  if (typeof ctx.confidence === "number") {
    if (ctx.confidence < reviewAt) {
      return {
        verdict: "GATED",
        gate,
        reason: `Confidence ${ctx.confidence.toFixed(2)} is below the human-review threshold of ${reviewAt} — route to quarantine for human classification.`,
        minLevel: GATE_MIN_LEVEL[gate],
        approversNeeded: requiredApprovers(gate),
      };
    }
    if (ctx.confidence < autoAt) {
      return {
        verdict: "GATED",
        gate,
        reason: `Confidence ${ctx.confidence.toFixed(2)} is below the auto-file threshold of ${autoAt}.`,
        minLevel: GATE_MIN_LEVEL[gate],
        approversNeeded: requiredApprovers(gate),
      };
    }
  }

  if (GATE_RANK[gate] > GATE_RANK[ctx.maxGate]) {
    return {
      verdict: "GATED",
      gate,
      reason: `${action} needs ${gate}; this agent is limited to ${ctx.maxGate}.`,
      minLevel: GATE_MIN_LEVEL[gate],
      approversNeeded: requiredApprovers(gate),
    };
  }

  if (NEVER_AUTONOMOUS.includes(gate)) {
    return {
      verdict: "GATED",
      gate,
      reason: `${action} always requires a human decision.`,
      minLevel: GATE_MIN_LEVEL[gate],
      approversNeeded: requiredApprovers(gate),
    };
  }

  return { verdict: "PROCEED", gate, audit: gate === "AUTO_WITH_AUDIT" };
}

/** Whether a set of votes satisfies a gate. Deciders must be distinct people. */
export function approvalSatisfied(
  gate: Gate,
  votes: { deciderId: string; vote: string; level: ApprovalLevel }[]
): { ok: boolean; reason?: string } {
  const rejected = votes.find((v) => v.vote === "REJECT");
  if (rejected) return { ok: false, reason: "A decider rejected the request." };

  const min = GATE_MIN_LEVEL[gate];
  const eligible = votes.filter((v) => v.vote === "APPROVE" && meetsLevel(v.level, min));
  const distinct = new Set(eligible.map((v) => v.deciderId));
  const needed = requiredApprovers(gate);

  if (distinct.size < needed) {
    return {
      ok: false,
      reason: `${needed} distinct approver(s) at ${min} or above are required; ${distinct.size} so far.`,
    };
  }
  return { ok: true };
}
