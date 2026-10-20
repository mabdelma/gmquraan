/**
 * HR domain rules.
 *
 * The employee file is the most sensitive record the system holds, so the
 * defaults here are deliberately restrictive: an HR record is RESTRICTED, which
 * under the access policy means an explicit group rather than a job title gets
 * you in. Being somebody's manager does not by itself open their file, and
 * neither does being an executive.
 */
import type { Confidentiality, EntityId } from "./config.js";

// ── Employment ─────────────────────────────────────────────────────────────

export const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACTOR", "INTERN", "ADVISOR"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const EMPLOYMENT_STATUSES = ["ONBOARDING", "ACTIVE", "ON_LEAVE", "NOTICE", "OFFBOARDED"] as const;
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

/** An employee file is always RESTRICTED — it is personal data by definition. */
export const HR_RECORD_CLASSIFICATION: Confidentiality = "RESTRICTED";

/**
 * Compensation is separated from the rest of the file rather than being another
 * column on it. Two reasons: it is the one field where "who can see this"
 * differs from the rest of HR, and keeping it in its own record means granting
 * somebody access to an employee file does not hand them the salary as well.
 */
export const COMPENSATION_CLASSIFICATION: Confidentiality = "RESTRICTED";

// ── Leave ──────────────────────────────────────────────────────────────────

export const LEAVE_TYPES = ["ANNUAL", "SICK", "UNPAID", "PARENTAL", "COMPASSIONATE", "PUBLIC_HOLIDAY"] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export const LEAVE_STATUSES = ["DRAFT", "REQUESTED", "APPROVED", "REJECTED", "CANCELLED", "TAKEN"] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

export const LEAVE_TRANSITIONS: Record<LeaveStatus, readonly LeaveStatus[]> = {
  DRAFT: ["REQUESTED", "CANCELLED"],
  REQUESTED: ["APPROVED", "REJECTED", "CANCELLED"],
  // Approved leave can still be cancelled — plans change — but it cannot be
  // silently un-approved back into a request.
  APPROVED: ["TAKEN", "CANCELLED"],
  REJECTED: [],
  CANCELLED: [],
  TAKEN: [],
};

export function canTransitionLeave(from: LeaveStatus, to: LeaveStatus): boolean {
  return LEAVE_TRANSITIONS[from].includes(to);
}

/**
 * Statutory annual-leave minimums by entity, in working days.
 *
 * These are the legal floor in each jurisdiction, not Unskinned policy. They
 * exist so a balance is never zero by accident; HR should set the actual
 * entitlement per contract, which may be more generous and may not be less.
 *
 *   Spain   — Estatuto de los Trabajadores art. 38: 30 calendar days,
 *             conventionally 22 working days.
 *   UAE     — Federal Decree-Law 33/2021: 30 calendar days after one year.
 *   Canada  — Ontario ESA: 2 weeks after one year, 3 weeks after five.
 *   Example Country   — Labour Law 12/2003: 21 days after six months' service.
 */
export const STATUTORY_ANNUAL_LEAVE_DAYS: Record<EntityId, number> = {
  "ORG-ES": 22,
  "ORG-UAE": 22,
  "ORG-CA": 10,
  "ORG-EG": 21,
};

/**
 * Working days between two dates, inclusive, excluding weekends.
 *
 * Weekend days differ by country — the Gulf worked Friday-Saturday until the
 * UAE moved to Saturday-Sunday in 2022 — so this takes the weekend as a
 * parameter rather than assuming. Public holidays are not deducted here: they
 * vary by emirate and province and belong in a calendar HR maintains, and
 * silently guessing them would produce balances nobody can reconcile.
 */
export function workingDays(from: Date, to: Date, weekend: readonly number[] = [0, 6]): number {
  if (to < from) return 0;
  let days = 0;
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  while (cursor <= end) {
    if (!weekend.includes(cursor.getDay())) days++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export type LeaveCheck = {
  from: Date;
  to: Date;
  type: LeaveType;
  entitledDays: number;
  takenDays: number;
  /** Days already requested but not yet decided. */
  pendingDays: number;
};

/** Why this leave request cannot be submitted, or null when it can. */
export function leaveRequestProblem(r: LeaveCheck, now = new Date()): string | null {
  if (r.to < r.from) return "The end date is before the start date.";

  const days = workingDays(r.from, r.to);
  if (days === 0) return "That range contains no working days.";
  if (days > 60) return "Requests longer than 60 working days are handled off-system by HR.";

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (r.from < startOfToday && r.type !== "SICK") {
    // Sick leave is recorded after the fact by its nature; nothing else is.
    return "Leave cannot start in the past. Ask HR to record it retrospectively.";
  }

  // Only annual leave draws down a balance. Sick, parental and compassionate
  // leave are governed by statute and contract, not by an allowance.
  if (r.type === "ANNUAL") {
    const remaining = r.entitledDays - r.takenDays - r.pendingDays;
    if (days > remaining) {
      return `That is ${days} working days but only ${remaining} remain of ${r.entitledDays}.`;
    }
  }
  return null;
}

/** Days remaining, for display. Negative is possible if HR granted an advance. */
export function leaveRemaining(b: { entitledDays: number; takenDays: number; pendingDays: number }): number {
  return b.entitledDays - b.takenDays - b.pendingDays;
}

// ── Joiner, mover, leaver ──────────────────────────────────────────────────

/**
 * access_control_policy.md: "Joiner, mover, and leaver events must update
 * access promptly." These are the steps that has to mean in practice.
 */
export const JML_KINDS = ["JOINER", "MOVER", "LEAVER"] as const;
export type JmlKind = (typeof JML_KINDS)[number];

export type JmlStep = { key: string; label: string; /** Done by the system rather than a person. */ automated: boolean };

export const JML_STEPS: Record<JmlKind, readonly JmlStep[]> = {
  JOINER: [
    { key: "record", label: "Employee record created with start date and contract type", automated: false },
    { key: "entity", label: "Entity, department and reporting line assigned", automated: false },
    { key: "mailbox", label: "Mailbox created", automated: false },
    { key: "portal", label: "Portal account activated", automated: true },
    { key: "clearance", label: "Clearance and approval level set for the role", automated: false },
    { key: "leave", label: "Leave entitlement opened for the current year", automated: true },
    { key: "card", label: "Business card details captured", automated: false },
    { key: "policies", label: "Policies acknowledged", automated: false },
  ],
  MOVER: [
    { key: "record", label: "New role, department and reporting line recorded", automated: false },
    { key: "revoke_old", label: "Access from the previous role withdrawn", automated: false },
    { key: "clearance", label: "Clearance and approval level re-set for the new role", automated: false },
    { key: "handover", label: "Open work reassigned", automated: false },
    { key: "card", label: "Business card and directory updated", automated: false },
  ],
  LEAVER: [
    { key: "notice", label: "Leaving date recorded", automated: false },
    { key: "handover", label: "Open work reassigned and documents transferred", automated: false },
    { key: "final_leave", label: "Outstanding leave settled", automated: false },
    // The two that actually close the door. Automated because a checklist item
    // that depends on somebody remembering is not a control.
    { key: "sessions", label: "All portal sessions revoked", automated: true },
    { key: "suspend", label: "Portal account suspended", automated: true },
    { key: "mailbox", label: "Mailbox suspended or forwarded", automated: false },
    { key: "assets", label: "Equipment returned", automated: false },
    { key: "card", label: "Business card withdrawn from the public directory", automated: false },
  ],
};

/** Steps a leaver event must complete before it can be closed. */
export const MANDATORY_LEAVER_STEPS = ["handover", "sessions", "suspend"] as const;

export function jmlCompletionProblem(kind: JmlKind, done: readonly string[]): string | null {
  if (kind !== "LEAVER") {
    const all = JML_STEPS[kind].map((s) => s.key);
    const missing = all.filter((k) => !done.includes(k));
    return missing.length ? `Outstanding steps: ${missing.join(", ")}.` : null;
  }
  const missing = MANDATORY_LEAVER_STEPS.filter((k) => !done.includes(k));
  if (missing.length) {
    return `An offboarding cannot be closed with access still open. Outstanding: ${missing.join(", ")}.`;
  }
  return null;
}

// ── What the employee may change themselves ────────────────────────────────

/**
 * Card details are not among these.
 *
 * A business card is a published company asset: the name on it, the job title,
 * the work number and the photo all appear on the public site and on a vCard
 * anyone can download. Letting each person rewrite their own would make the
 * directory unverifiable, so those fields are maintained by HR and an employee
 * asks for a correction instead.
 *
 * What is here is genuinely the employee's own: how they want the interface,
 * and the details HR needs from them rather than the other way round.
 */
export const SELF_EDITABLE_HR_FIELDS = [
  "personalEmail",
  "personalPhone",
  "emergencyContactName",
  "emergencyContactPhone",
  "emergencyContactRelation",
  "dietaryNotes",
  "accessibilityNotes",
] as const;
export type SelfEditableHrField = (typeof SELF_EDITABLE_HR_FIELDS)[number];

export function isSelfEditableHrField(f: string): f is SelfEditableHrField {
  return (SELF_EDITABLE_HR_FIELDS as readonly string[]).includes(f);
}

/** Card fields an employee may ask HR to correct, but not edit directly. */
export const CARD_FIELDS = [
  "name",
  "title",
  "photo",
  "location",
  "linkedin",
  "phones",
  "whatsapp",
  "branches",
] as const;
export type CardField = (typeof CARD_FIELDS)[number];

export function isCardField(f: string): f is CardField {
  return (CARD_FIELDS as readonly string[]).includes(f);
}
