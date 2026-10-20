/**
 * The workflow engine (WF-01).
 *
 * `workflows/WORKFLOW_RULES.md` wants a definition to carry code, version,
 * trigger, scope, conditions, stages, approver resolution, SLA, escalation,
 * delegation, required evidence and a terminal outcome — as data, so an
 * approval chain changes without a deployment.
 *
 * What exists today is `ApprovalRequest`: one gate, one `minLevel`, one
 * decision, with the routing implied by the autonomy matrix. That is enough for
 * "an agent proposed something, a person allowed it" and not enough for
 * "manager, then HR, then finance, escalating after two days". This adds the
 * missing shape without discarding the gate, which still decides *whether* an
 * approval is needed at all.
 *
 * Everything here is pure. A stage does not know how to find a person; it
 * describes *which* people, and the caller resolves that against the directory.
 * That keeps segregation of duties testable without a database.
 */

export const APPROVER_RULES = [
  /** Whoever manages the subject of the request. */
  "MANAGER_OF_SUBJECT",
  /** Anybody holding a named role. */
  "ROLE",
  /** Anybody in a named department. */
  "DEPARTMENT",
  /** Anybody at or above an approval level. */
  "MIN_LEVEL",
  /** Named individuals. */
  "NAMED",
] as const;
export type ApproverRule = (typeof APPROVER_RULES)[number];

export type WorkflowStage = {
  key: string;
  name: string;
  rule: ApproverRule;
  /** Role code, department code, approval level or member ids, per `rule`. */
  target?: string | string[];
  /**
   * How many distinct people must approve. Two means two, and the engine
   * enforces distinctness rather than trusting the caller — a two-person
   * control that one person can satisfy twice is not a control.
   */
  quorum?: number;
  /** Hours before the stage is late. */
  slaHours?: number;
  /** Hours before it escalates. Must be at least the SLA to mean anything. */
  escalateAfterHours?: number;
  /** Stage key to escalate to, or a role via `escalateToRole`. */
  escalateToRole?: string;
  /** Evidence that must be attached before the stage can be decided. */
  requiredEvidence?: string[];
  /** Whether this stage may be delegated. */
  delegable?: boolean;
};

export type WorkflowDefinition = {
  code: string;
  version: number;
  name: string;
  /** What starts it, e.g. "leave.requested". */
  trigger: string;
  /** Subject type this applies to, e.g. "LeaveRequest". */
  subjectType: string;
  stages: WorkflowStage[];
  /** Where an approved run ends up, and where a rejected one does. */
  onApproved: string;
  onRejected: string;
};

const KEY = /^[a-z0-9]+(_[a-z0-9]+)*$/;

/** Why this definition cannot be used, or null. */
export function definitionProblem(d: WorkflowDefinition): string | null {
  if (!KEY.test(d.code)) return "Workflow code must be lower_snake_case.";
  if (!Number.isInteger(d.version) || d.version < 1) return "Version must be a positive whole number.";
  if (!d.name.trim()) return "Give the workflow a name.";
  if (!d.trigger.trim()) return "A workflow needs a trigger.";
  if (!d.subjectType.trim()) return "A workflow needs a subject type.";
  if (!d.stages.length) return "A workflow needs at least one stage.";

  const seen = new Set<string>();
  for (const s of d.stages) {
    if (!KEY.test(s.key)) return `Stage key "${s.key}" must be lower_snake_case.`;
    if (seen.has(s.key)) return `Two stages share the key "${s.key}".`;
    seen.add(s.key);

    if (!APPROVER_RULES.includes(s.rule)) return `Stage "${s.key}" has an unknown approver rule.`;
    if (s.rule !== "MANAGER_OF_SUBJECT" && !s.target) {
      return `Stage "${s.key}" uses ${s.rule} and needs a target.`;
    }
    if (s.quorum !== undefined && (!Number.isInteger(s.quorum) || s.quorum < 1)) {
      return `Stage "${s.key}" has an invalid quorum.`;
    }
    // A manager stage cannot require two people: there is one manager, so the
    // rule would deadlock rather than protect anything.
    if (s.rule === "MANAGER_OF_SUBJECT" && (s.quorum ?? 1) > 1) {
      return `Stage "${s.key}" asks for ${s.quorum} approvers from a single manager.`;
    }
    if (s.slaHours !== undefined && s.slaHours <= 0) return `Stage "${s.key}" has a non-positive SLA.`;
    if (
      s.escalateAfterHours !== undefined &&
      s.slaHours !== undefined &&
      s.escalateAfterHours < s.slaHours
    ) {
      return `Stage "${s.key}" escalates before its own SLA expires.`;
    }
    if (s.escalateAfterHours !== undefined && !s.escalateToRole) {
      return `Stage "${s.key}" escalates to nobody.`;
    }
  }
  return null;
}

export const INSTANCE_STATES = ["RUNNING", "APPROVED", "REJECTED", "WITHDRAWN", "EXPIRED"] as const;
export type InstanceState = (typeof INSTANCE_STATES)[number];

export type Decision = {
  stageKey: string;
  deciderId: string;
  /** APPROVE | REJECT */
  outcome: "APPROVE" | "REJECT";
  at: Date | string;
  /** Set when the decider acted on somebody else's behalf. */
  onBehalfOf?: string | null;
};

export type Instance = {
  definitionCode: string;
  version: number;
  subjectRef: string;
  /** Who raised it. Cannot also decide it. */
  requestedById: string;
  /** Who the request is about, for MANAGER_OF_SUBJECT. */
  subjectMemberId?: string | null;
  currentStageKey: string;
  state: InstanceState;
  startedAt: Date | string;
  stageEnteredAt: Date | string;
  decisions: Decision[];
  evidence?: string[];
};

export const stageOf = (d: WorkflowDefinition, key: string): WorkflowStage | null =>
  d.stages.find((s) => s.key === key) ?? null;

/**
 * Whether this person may decide this stage.
 *
 * Segregation of duties is enforced here rather than left to the caller, and it
 * is the reason this function takes the whole instance: a requester approving
 * their own request, or one person satisfying a two-person quorum by deciding
 * twice, are both things that look fine one call at a time.
 */
export function decisionProblem(
  d: WorkflowDefinition,
  i: Instance,
  decider: { id: string; role?: string; departmentId?: string | null; approvalLevel?: string },
  eligible: (stage: WorkflowStage, memberId: string) => boolean
): string | null {
  if (i.state !== "RUNNING") return `This request is already ${i.state.toLowerCase()}.`;

  const stage = stageOf(d, i.currentStageKey);
  if (!stage) return "This request is at a stage the workflow no longer defines.";

  // The one that matters most, and the one an approval UI makes easy to forget.
  if (decider.id === i.requestedById) {
    return "You raised this request, so you cannot also approve it.";
  }
  if (i.subjectMemberId && decider.id === i.subjectMemberId) {
    return "This request is about you, so you cannot decide it.";
  }

  if (!eligible(stage, decider.id)) {
    return "You are not an approver for this stage.";
  }

  if (i.decisions.some((x) => x.stageKey === stage.key && x.deciderId === decider.id)) {
    return "You have already decided this stage.";
  }

  for (const need of stage.requiredEvidence ?? []) {
    if (!(i.evidence ?? []).includes(need)) {
      return `This stage needs ${need.replace(/_/g, " ")} attached before it can be decided.`;
    }
  }
  return null;
}

/**
 * Apply a decision and say where the instance lands.
 *
 * A rejection at any stage ends the run. That is deliberate: a chain where a
 * later approver can overturn an earlier rejection is not an approval chain,
 * it is a suggestion box.
 */
export function applyDecision(
  d: WorkflowDefinition,
  i: Instance,
  decision: Decision
): { state: InstanceState; currentStageKey: string; decisions: Decision[] } {
  const decisions = [...i.decisions, decision];

  if (decision.outcome === "REJECT") {
    return { state: "REJECTED", currentStageKey: i.currentStageKey, decisions };
  }

  const stage = stageOf(d, i.currentStageKey);
  if (!stage) return { state: i.state, currentStageKey: i.currentStageKey, decisions };

  const approvals = decisions.filter(
    (x) => x.stageKey === stage.key && x.outcome === "APPROVE"
  );
  // Distinct people, not distinct decisions.
  const distinct = new Set(approvals.map((x) => x.deciderId)).size;
  if (distinct < (stage.quorum ?? 1)) {
    return { state: "RUNNING", currentStageKey: stage.key, decisions };
  }

  const idx = d.stages.findIndex((s) => s.key === stage.key);
  const next = d.stages[idx + 1];
  return next
    ? { state: "RUNNING", currentStageKey: next.key, decisions }
    : { state: "APPROVED", currentStageKey: stage.key, decisions };
}

const hoursSince = (from: Date | string, now: Date) =>
  (now.getTime() - new Date(from).getTime()) / 3_600_000;

/** Whether the current stage has missed its SLA. */
export function isOverdue(d: WorkflowDefinition, i: Instance, now = new Date()): boolean {
  if (i.state !== "RUNNING") return false;
  const stage = stageOf(d, i.currentStageKey);
  if (!stage?.slaHours) return false;
  return hoursSince(i.stageEnteredAt, now) > stage.slaHours;
}

/** The role to escalate to, or null if escalation is not due. */
export function escalationDue(
  d: WorkflowDefinition,
  i: Instance,
  now = new Date()
): string | null {
  if (i.state !== "RUNNING") return null;
  const stage = stageOf(d, i.currentStageKey);
  if (!stage?.escalateAfterHours || !stage.escalateToRole) return null;
  return hoursSince(i.stageEnteredAt, now) > stage.escalateAfterHours ? stage.escalateToRole : null;
}

/**
 * Why this delegation is not allowed, or null.
 *
 * Delegation moves who may act, never who is accountable — the decision still
 * records the delegate and the person delegated for, so the trail does not
 * quietly acquire a decision nobody made.
 */
export function delegationProblem(
  d: WorkflowDefinition,
  i: Instance,
  fromId: string,
  toId: string
): string | null {
  const stage = stageOf(d, i.currentStageKey);
  if (!stage) return "This request is at a stage the workflow no longer defines.";
  if (stage.delegable === false) return "This stage cannot be delegated.";
  if (fromId === toId) return "That is the same person.";
  if (toId === i.requestedById) return "The person who raised the request cannot be delegated to.";
  return null;
}
