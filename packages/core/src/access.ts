/**
 * Access control (00_SYSTEM/06_SECURITY/access_control_policy.md).
 *
 *   - Identity is individual; shared accounts are prohibited.
 *   - Access is based on role, entity, department, project, confidentiality and
 *     need-to-know.
 *   - Restricted and privileged records require explicit groups.
 *
 * The visibility model chosen for the portal: a member sees their own records,
 * a manager sees their reporting line, executives and the document controller
 * see the group. Clearance is applied on top of all of it — being someone's
 * manager does not by itself grant sight of a RESTRICTED record.
 */
import { clears, meetsLevel, type ApprovalLevel, type Confidentiality, type GmRole } from "./config.js";

export type Viewer = {
  id: string;
  role: GmRole;
  approvalLevel: ApprovalLevel;
  clearance: Confidentiality;
  entityId?: string | null;
  departmentId?: string | null;
  /** Ids of everyone reporting to this viewer, directly or transitively. */
  reportIds?: string[];
  /**
   * Legal entities this viewer is authorised in — the company scope axis
   * (ORG-01 / IAM-01, `security/SCOPING_RULES.md`: "company scope is mandatory
   * on tenant-sensitive records").
   *
   * Built on the existing `entityId` rather than a parallel `companyId`,
   * because the legal entity already is the company here and duplicating a
   * canonical master is what the specification's domain-ownership rule exists
   * to prevent.
   *
   * `undefined` means this viewer has not been scoped yet. See
   * `withinCompanyScope` for why that is currently permissive and what has to
   * happen before it stops being.
   */
  companyIds?: readonly string[];
};

export type Record_ = {
  /** Whoever is accountable. */
  ownerId?: string | null;
  /** Whoever is doing the work, when different. */
  assigneeId?: string | null;
  requesterId?: string | null;
  entityId?: string | null;
  departmentId?: string | null;
  confidentiality?: Confidentiality | null;
  /** Explicitly named people, for restricted and privileged records. */
  accessList?: string[] | null;
};

/** Roles with a standing group-wide view. */
const GROUP_WIDE: readonly GmRole[] = ["CEO", "COO", "CFO", "CTO", "DOC_CONTROLLER"];

/** Roles that may act on any record in their own entity. */
const ENTITY_WIDE: readonly GmRole[] = ["MANAGER"];

export function isGroupWide(role: GmRole): boolean {
  return GROUP_WIDE.includes(role);
}

/**
 * Whether the viewer is connected to the record at all, before clearance.
 * "Connected" means: it is theirs, they own it, they requested it, or the
 * person it belongs to reports to them.
 */
function hasRelationship(v: Viewer, r: Record_): boolean {
  if (r.ownerId === v.id || r.assigneeId === v.id || r.requesterId === v.id) return true;

  const reports = new Set(v.reportIds ?? []);
  if (r.ownerId && reports.has(r.ownerId)) return true;
  if (r.assigneeId && reports.has(r.assigneeId)) return true;

  if (isGroupWide(v.role)) return true;
  if (ENTITY_WIDE.includes(v.role) && r.entityId && r.entityId === v.entityId) return true;

  return false;
}

/**
 * The companies a member is authorised in.
 *
 * Group-wide roles reach across the whole group; everybody else is confined to
 * the company that employs them. That is the shape the specification's
 * `user_role_scope` describes, derived here from the role and the member's own
 * entity because per-assignment scope rows do not exist yet — when they do,
 * this is the one function that changes.
 *
 * A member with no entity gets an empty scope, not a wildcard. They keep seeing
 * records that belong to no company; they see nothing that belongs to one. An
 * unassigned person is a data error, and the safe reading of a data error in an
 * authorization path is "less", never "everything".
 */
export function companyScopeFor(
  m: { role: GmRole; entityId?: string | null },
  allCompanyCodes: readonly string[]
): string[] {
  if (isGroupWide(m.role)) return [...allCompanyCodes];
  return m.entityId ? [m.entityId] : [];
}

/**
 * Is this record inside the viewer's company scope?
 *
 * This gate runs before role, clearance and relationship, and it is not
 * overridable by any of them. A group-wide role reaches across the *group it
 * is authorised in*, not across every company in the database — without this,
 * `isGroupWide` alone would let one customer's chief executive read another's,
 * which is SEC-T001.
 *
 * Fail-closed. A viewer with no `companyIds` is refused every record that
 * belongs to a company, rather than waved through.
 *
 * This was permissive while the axis was being introduced (Wave 1.3a) and
 * flipped in Wave 1.2 once `toViewer` — the single place a Viewer is built —
 * populates the scope. The permissive branch is gone deliberately: a default
 * that silently grants is indistinguishable from a working control right up
 * until it is the reason a customer read another customer's records.
 *
 * The consequence is that any future code constructing a Viewer literal must
 * set `companyIds`, and if it forgets, it sees nothing rather than everything.
 * That is the failure mode worth having.
 */
export function withinCompanyScope(v: Viewer, r: Record_): boolean {
  // The record does not belong to a company, so there is no company boundary
  // to cross. Unscoped records stay readable by the ordinary rules.
  if (!r.entityId) return true;
  if (!v.companyIds) return false;
  return v.companyIds.includes(r.entityId);
}

/**
 * Can this viewer read this record?
 *
 * The AI_OPS identity is handled explicitly rather than falling through: an
 * agent identity has no personal clearance and reads only what a run gives it,
 * so it is refused here and access is granted per run instead.
 */
export function canRead(v: Viewer, r: Record_): boolean {
  if (v.role === "AI_OPS") return false;

  // First, and above everything else. Being the owner of a record does not
  // carry it across a company boundary either: if the identity is scoped out
  // of that company, it does not see the record.
  if (!withinCompanyScope(v, r)) return false;

  // Unclassified content is treated as CONFIDENTIAL, not INTERNAL. A record
  // nobody has looked at is a record nobody has judged safe to circulate, and
  // guessing downward on that is how something sensitive gets read before it is
  // reviewed. This is the default the access policy requires.
  const level: Confidentiality = r.confidentiality ?? "CONFIDENTIAL";

  // Restricted and privileged need an explicit group — a relationship is not
  // enough, and neither is being an executive.
  if (level === "RESTRICTED" || level === "PRIVILEGED") {
    const named = new Set(r.accessList ?? []);
    const owns = r.ownerId === v.id;
    if (!named.has(v.id) && !owns) return false;
    return clears(v.clearance, level);
  }

  // Whoever owns it, is doing it, or asked for it is not "circulation" — they
  // are the source. The clearance ceiling is about who else may see a record,
  // and applying it to the owner would lock somebody out of their own work
  // without protecting anything.
  const isParticipant = r.ownerId === v.id || r.assigneeId === v.id || r.requesterId === v.id;
  if (isParticipant) return true;

  if (!clears(v.clearance, level)) return false;
  return hasRelationship(v, r);
}

/** Can this viewer change it? Read plus a stake in it, or group-wide authority. */
export function canWrite(v: Viewer, r: Record_): boolean {
  if (!canRead(v, r)) return false;
  if (r.ownerId === v.id || r.assigneeId === v.id) return true;
  if (isGroupWide(v.role)) return true;
  const reports = new Set(v.reportIds ?? []);
  return Boolean((r.ownerId && reports.has(r.ownerId)) || (r.assigneeId && reports.has(r.assigneeId)));
}

export type AssignTarget = { id: string; entityId?: string | null; departmentId?: string | null };

/**
 * Can this viewer give work to this person?
 *
 * The reporting line is the primary route, and it is transitive — a director
 * reaches everybody beneath them, not only their direct reports, which is what
 * makes assignment cascade down a branch.
 *
 * But a reporting line is not the only real relationship. A functional director
 * owns a department across a branch and a general manager owns a branch, and
 * neither of those people appears in the chain above every individual they
 * legitimately direct. So scope is allowed alongside the line — bounded by both
 * entity and department, so a Spanish marketing director cannot task somebody
 * in Canadian finance.
 *
 * Accepts a bare id for the common case where scope is irrelevant.
 */
export function canAssignTo(v: Viewer, target: string | AssignTarget): boolean {
  const t: AssignTarget = typeof target === "string" ? { id: target } : target;

  if (v.id === t.id) return true;
  if (isGroupWide(v.role)) return true;
  if ((v.reportIds ?? []).includes(t.id)) return true;

  // Scope-based, for the roles that own a slice of the organisation.
  const sameEntity = Boolean(v.entityId && t.entityId && v.entityId === t.entityId);
  if (!sameEntity) return false;

  if (v.role === "ENTITY_GM") return true;
  if (v.role === "FUNCTIONAL_DIRECTOR" || v.role === "MANAGER") {
    return Boolean(v.departmentId && t.departmentId && v.departmentId === t.departmentId);
  }
  return false;
}

/** Can this viewer decide an approval request needing `minLevel`? */
export function canApprove(v: Viewer, minLevel: ApprovalLevel): boolean {
  if (v.role === "AI_OPS") return false;
  return meetsLevel(v.approvalLevel, minLevel);
}

/**
 * What a member may edit on their own profile — the interface language, and
 * nothing else.
 *
 * Name, job title and photo used to be here. They came out because they are
 * business-card fields: they appear on the public site and on a downloadable
 * vCard, so they are published company assets rather than personal preferences.
 * HR maintains them and an employee raises a correction request instead.
 *
 * Role, approval level, clearance, entity and manager were never here — those
 * are access decisions.
 */
export const SELF_EDITABLE_FIELDS = ["locale"] as const;
export type SelfEditableField = (typeof SELF_EDITABLE_FIELDS)[number];

export function isSelfEditable(field: string): field is SelfEditableField {
  return (SELF_EDITABLE_FIELDS as readonly string[]).includes(field);
}

/**
 * The reduced view of a colleague that anyone in the group may see: enough to
 * know who they are and how to reach them at work, and nothing more.
 */
export const DIRECTORY_FIELDS = ["id", "name", "title", "photo", "email", "entityId", "departmentId"] as const;
