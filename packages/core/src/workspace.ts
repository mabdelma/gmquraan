/**
 * The per-employee workspace.
 *
 * Blueprint §7: folders are a presentation layer and the metadata is the
 * authority. So an employee's "structure" is not a directory somebody creates —
 * it is a set of named areas, each with a classification and a rule about who
 * can see it, and the tree is rendered from that. Nothing has to be moved when
 * somebody changes department, and there is no folder to get out of step with
 * the permissions.
 *
 * The areas below are deliberately not uniform in visibility. An employee's
 * task list is ordinary internal work their manager should see; their
 * disciplinary file is not, and the difference has to live somewhere the UI
 * cannot forget.
 */
import type { Confidentiality } from "./config.js";

/**
 * Who, besides the employee themselves, can open an area.
 *
 * Note there is no "line" tier on the sensitive areas. That is the point: a
 * grievance or a disciplinary record may concern the line manager, so "your
 * manager can see everything about you" is exactly the wrong default.
 */
export type AreaAudience =
  /** The employee and their reporting line. */
  | "line"
  /** The employee and the People department — deliberately not the line manager. */
  | "hr"
  /** Anyone in the group who is entitled to the underlying records. */
  | "group";

export type WorkspaceArea = {
  code: string;
  name: string;
  purpose: string;
  classification: Confidentiality;
  audience: AreaAudience;
  /** Where its contents live in the information architecture. */
  zonePath: string;
};

export const EMPLOYEE_AREAS: readonly WorkspaceArea[] = [
  {
    code: "01_PERSONAL_RECORD",
    name: "Personal record",
    purpose: "Contract, identity documents, right to work, personal details.",
    classification: "RESTRICTED",
    audience: "hr",
    zonePath: "04_PEOPLE_AND_ORGANIZATION/04_EMPLOYEE_RECORDS",
  },
  {
    code: "02_MY_WORK",
    name: "My work",
    purpose: "Task assigned to or owned by this person.",
    classification: "INTERNAL",
    audience: "line",
    zonePath: "11_OPERATIONS_AND_ADMIN",
  },
  {
    code: "03_MY_DOCUMENTS",
    name: "My documents",
    purpose: "Controlled records this person owns or holds custody of.",
    classification: "INTERNAL",
    audience: "line",
    zonePath: "11_OPERATIONS_AND_ADMIN",
  },
  {
    code: "04_APPROVALS",
    name: "Approvals and decisions",
    purpose: "Gates raised by or decided by this person.",
    classification: "INTERNAL",
    audience: "line",
    zonePath: "01_GROUP_GOVERNANCE/03_DELEGATIONS_AND_APPROVALS",
  },
  {
    code: "05_LEAVE",
    name: "Leave and absence",
    purpose: "Entitlement, requests and decisions.",
    classification: "CONFIDENTIAL",
    audience: "hr",
    zonePath: "04_PEOPLE_AND_ORGANIZATION/04_EMPLOYEE_RECORDS",
  },
  {
    code: "06_TRAINING",
    name: "Training and certification",
    purpose: "Courses, certificates and policy acknowledgements.",
    classification: "INTERNAL",
    audience: "hr",
    zonePath: "04_PEOPLE_AND_ORGANIZATION",
  },
  {
    code: "07_EQUIPMENT",
    name: "Equipment and assets",
    purpose: "Company property issued to this person, and its return.",
    classification: "INTERNAL",
    audience: "hr",
    zonePath: "11_OPERATIONS_AND_ADMIN",
  },
  {
    code: "08_PERFORMANCE",
    name: "Performance",
    purpose: "Reviews, objectives, and any formal process.",
    // Higher than the rest on purpose: a grievance or disciplinary record is
    // the one thing here that must not be readable by the line manager it
    // might concern.
    classification: "RESTRICTED",
    // HR, not the line. A formal process is sometimes about the manager.
    audience: "hr",
    zonePath: "04_PEOPLE_AND_ORGANIZATION/04_EMPLOYEE_RECORDS",
  },
];

/**
 * The workspace root for one person.
 *
 * Employee number first so the path sorts and stays stable when somebody
 * changes their name — which happens, and is exactly when you least want the
 * folder to move. Falls back to the local part of their email if HR has not
 * issued a number yet.
 */
export function workspaceRoot(e: { employeeNo?: string | null; email: string }): string {
  const key = e.employeeNo?.trim() || e.email.split("@")[0];
  return `04_PEOPLE_AND_ORGANIZATION/04_EMPLOYEE_RECORDS/${key.toUpperCase()}`;
}

export function areaPath(e: { employeeNo?: string | null; email: string }, area: WorkspaceArea): string {
  return `${workspaceRoot(e)}/${area.code}`;
}

/** Whether `viewer` may open this area of `subject`'s workspace. */
export function canOpenArea(
  area: WorkspaceArea,
  ctx: { isSelf: boolean; isLineManager: boolean; isHr: boolean; isGroupWide: boolean }
): boolean {
  // Their own record, always. Somebody who cannot read their own contract or
  // leave balance has a system that is working against them.
  if (ctx.isSelf) return true;

  switch (area.audience) {
    case "line":
      return ctx.isLineManager || ctx.isHr || ctx.isGroupWide;
    case "hr":
      // Group-wide roles are included because an executive investigating a
      // grievance needs the file; the line manager still is not.
      return ctx.isHr || ctx.isGroupWide;
    case "group":
      return true;
  }
}

// ── Task creation ──────────────────────────────────────────────────────────

export type NewTaskInput = {
  title?: string | null;
  description?: string | null;
  ownerId?: string | null;
  assigneeId?: string | null;
  entityId?: string | null;
  departmentId?: string | null;
  priority?: string | null;
  dueAt?: string | Date | null;
  acceptanceCriteria?: string | null;
  expectedOutputs?: string | null;
  destination?: string | null;
};

/**
 * Why this task cannot be created, or null.
 *
 * Only what is needed to *capture* work is required here. The full set of
 * controls is enforced when the task tries to leave triage — demanding
 * acceptance criteria from somebody forwarding an email is how a capture step
 * gets bypassed, and work that is not captured is work nobody can see.
 */
export function newTaskProblem(t: NewTaskInput): string | null {
  const title = (t.title ?? "").trim();
  if (title.length < 4) return "Give the task a title of at least four characters.";
  if (title.length > 200) return "Titles are limited to 200 characters.";
  if (!t.ownerId) return "Every task needs an accountable owner.";

  if (t.dueAt) {
    const d = new Date(t.dueAt);
    if (Number.isNaN(d.getTime())) return "That due date is not a date.";
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (d < startOfToday) return "A due date in the past cannot be met.";
  }

  return null;
}
