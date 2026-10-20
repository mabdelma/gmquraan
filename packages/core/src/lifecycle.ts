/**
 * The task and document lifecycles
 * (00_SYSTEM/05_WORKFLOWS/universal_task_lifecycle.yaml, document_lifecycle.yaml).
 *
 * Both are state machines with explicit legal transitions. Anything not listed
 * is refused — which is the only reason a state machine is worth having.
 */

export const TASK_STATES = [
  "NEW",
  "TRIAGED",
  "PLANNED",
  "ASSIGNED",
  "IN_PROGRESS",
  "BLOCKED",
  "REVIEW",
  "APPROVED",
  "COMPLETED",
  "ARCHIVED",
  "CANCELLED",
] as const;
export type TaskState = (typeof TASK_STATES)[number];

/**
 * Transcribed from the YAML. Two deliberate additions, both marked, because the
 * YAML's `transitions` map omits them and a real workflow cannot function
 * without them:
 *
 *  - BLOCKED has no outgoing transitions in the YAML, which would strand every
 *    blocked task forever. It returns to the state it can resume from.
 *  - ARCHIVED and CANCELLED are terminal, which the YAML implies by giving them
 *    no entry, and that is what we enforce.
 */
export const TASK_TRANSITIONS: Record<TaskState, readonly TaskState[]> = {
  NEW: ["TRIAGED", "CANCELLED"],
  TRIAGED: ["PLANNED", "ASSIGNED", "CANCELLED"],
  PLANNED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "BLOCKED", "CANCELLED"],
  IN_PROGRESS: ["REVIEW", "BLOCKED", "CANCELLED"],
  // Not in the YAML — see the note above. A blocked task returns to where it
  // was workable, or is cancelled outright.
  BLOCKED: ["ASSIGNED", "IN_PROGRESS", "CANCELLED"],
  REVIEW: ["IN_PROGRESS", "APPROVED", "CANCELLED"],
  APPROVED: ["COMPLETED"],
  COMPLETED: ["ARCHIVED"],
  ARCHIVED: [],
  CANCELLED: [],
};

export const TERMINAL_TASK_STATES: readonly TaskState[] = ["ARCHIVED", "CANCELLED"];

export function canTransitionTask(from: TaskState, to: TaskState): boolean {
  return TASK_TRANSITIONS[from].includes(to);
}

/**
 * required_controls from the YAML: owner, due_date, priority, inputs,
 * expected_outputs, acceptance_criteria, destination.
 *
 * These are checked when a task leaves triage, not when it is captured —
 * demanding acceptance criteria from someone forwarding an email is how a
 * capture step gets bypassed entirely.
 */
export const REQUIRED_CONTROLS = [
  "ownerId",
  "dueAt",
  "priority",
  "inputs",
  "expectedOutputs",
  "acceptanceCriteria",
  "destination",
] as const;
export type RequiredControl = (typeof REQUIRED_CONTROLS)[number];

export type ControlCheckInput = {
  ownerId?: string | null;
  dueAt?: Date | string | null;
  priority?: string | null;
  inputs?: unknown;
  expectedOutputs?: unknown;
  acceptanceCriteria?: string | null;
  destination?: string | null;
};

const present = (v: unknown): boolean => {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
};

/** Which required controls are still missing. Empty means the task may proceed. */
export function missingControls(t: ControlCheckInput): RequiredControl[] {
  return REQUIRED_CONTROLS.filter((k) => !present(t[k as keyof ControlCheckInput]));
}

/**
 * States a task may not enter until every required control is filled in. Triage
 * is where the gaps get closed, so the gate sits on everything after it.
 */
const CONTROLLED_FROM: readonly TaskState[] = ["PLANNED", "ASSIGNED", "IN_PROGRESS", "REVIEW", "APPROVED", "COMPLETED"];

/** Why this task transition is refused, or null when it is allowed. */
export function taskTransitionProblem(
  from: TaskState,
  to: TaskState,
  task: ControlCheckInput
): string | null {
  if (from === to) return "The task is already in that state.";
  if (!canTransitionTask(from, to)) {
    const allowed = TASK_TRANSITIONS[from];
    return allowed.length
      ? `A task in ${from} can only move to ${allowed.join(", ")}.`
      : `${from} is a terminal state — the task cannot move.`;
  }
  if (CONTROLLED_FROM.includes(to)) {
    const missing = missingControls(task);
    if (missing.length) {
      return `Missing required controls before ${to}: ${missing.join(", ")}.`;
    }
  }
  return null;
}

// ── Documents ──────────────────────────────────────────────────────────────

export const DOC_STATES = [
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "EXECUTED",
  "SUPERSEDED",
  "ARCHIVED",
  "DELETION_PENDING",
  "DELETED",
] as const;
export type DocState = (typeof DOC_STATES)[number];

/**
 * document_lifecycle.yaml lists the states but not the edges, so these are
 * derived from its `controls` block and the records policy: a record can always
 * be archived, an archived record can still be proposed for disposal, and
 * DELETED is terminal.
 */
export const DOC_TRANSITIONS: Record<DocState, readonly DocState[]> = {
  DRAFT: ["IN_REVIEW", "ARCHIVED"],
  IN_REVIEW: ["DRAFT", "APPROVED", "ARCHIVED"],
  APPROVED: ["EXECUTED", "SUPERSEDED", "ARCHIVED"],
  EXECUTED: ["SUPERSEDED", "ARCHIVED"],
  SUPERSEDED: ["ARCHIVED"],
  ARCHIVED: ["DELETION_PENDING"],
  DELETION_PENDING: ["ARCHIVED", "DELETED"],
  DELETED: [],
};

export type DocCheckInput = {
  approverId?: string | null;
  versionLocked?: boolean;
  evidence?: unknown;
  supersedesId?: string | null;
  retainUntil?: Date | string | null;
  legalHold?: boolean;
  /** Distinct member ids that have authorised a deletion. */
  deletionAuthorisers?: string[];
};

/**
 * The `controls` block from document_lifecycle.yaml, enforced:
 *
 *   approved         → requires_approver_and_locked_version
 *   executed         → requires_evidence
 *   superseded       → requires_replacement_id
 *   deletion_pending → requires_retention_check
 *   deleted          → requires_two_person_authorization_and_audit_record
 */
export function docTransitionProblem(from: DocState, to: DocState, doc: DocCheckInput): string | null {
  if (from === to) return "The document is already in that state.";
  if (!DOC_TRANSITIONS[from].includes(to)) {
    const allowed = DOC_TRANSITIONS[from];
    return allowed.length
      ? `A document in ${from} can only move to ${allowed.join(", ")}.`
      : `${from} is terminal — the record cannot move.`;
  }

  if (to === "APPROVED") {
    if (!doc.approverId) return "Approval requires a named approver.";
    if (!doc.versionLocked) return "Approval requires the version to be locked first.";
  }
  if (to === "EXECUTED" && !present(doc.evidence)) {
    return "A record cannot be marked executed without evidence.";
  }
  if (to === "SUPERSEDED" && !doc.supersedesId) {
    return "Superseding requires the id of the replacement record.";
  }
  if (to === "DELETION_PENDING") {
    if (doc.legalHold) return "The record is under legal hold and cannot be proposed for disposal.";
    if (!doc.retainUntil) return "Disposal requires a retention date to check against.";
    if (new Date(doc.retainUntil).getTime() > Date.now()) {
      return `Retention runs until ${new Date(doc.retainUntil).toISOString().slice(0, 10)} — disposal cannot be proposed yet.`;
    }
  }
  if (to === "DELETED") {
    if (doc.legalHold) return "The record is under legal hold and cannot be deleted.";
    const authorisers = new Set(doc.deletionAuthorisers ?? []);
    if (authorisers.size < 2) {
      return "Deletion requires two-person authorisation — two distinct approvers are needed.";
    }
  }
  return null;
}
