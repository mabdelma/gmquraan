/**
 * The permission model
 * (00_SYSTEM/12_IDENTITY_AND_ACCESS/roles_and_permissions.yaml, access_matrix.csv).
 *
 * Thirteen operations, not the four the portal enforced before. The
 * distinctions that matter and were previously collapsed:
 *
 *   discover vs read      — knowing a record exists is itself a disclosure
 *   read vs download      — reading in a controlled viewer is not taking a copy
 *   share_internal vs external — one of these leaves the company
 *   delete_request vs delete   — nobody deletes; they ask
 *
 * Two gaps in the shipped configuration are handled explicitly below rather
 * than papered over: the hierarchy defines tiers that roles_and_permissions.yaml
 * gives no permission entry for.
 */
import type { GmRole } from "./config.js";
import { ZONES, type Zone } from "./config.js";

export const OPERATIONS = [
  "discover",
  "read",
  "download",
  "create",
  "edit",
  "comment",
  "review",
  "approve",
  "share_internal",
  "share_external",
  "archive",
  "delete_request",
  "administer",
] as const;
export type Operation = (typeof OPERATIONS)[number];

export type RolePermission = {
  allow: readonly Operation[];
  scope: string;
  /** Things this role may never do, whatever else it is granted. */
  cannot?: readonly string[];
  controls?: readonly string[];
  exclusions?: readonly string[];
};

/** Verbatim from roles_and_permissions.yaml. */
export const ROLE_PERMISSIONS: Record<string, RolePermission> = {
  board_member: {
    allow: ["discover", "read", "download", "comment", "review", "approve"],
    scope: "board_and_reserved_governance",
  },
  group_ceo: {
    allow: ["discover", "read", "download", "create", "edit", "comment", "review", "approve", "share_internal", "archive", "delete_request"],
    scope: "group_business_content",
    exclusions: ["infrastructure_secrets", "personal_hr_cases_without_need", "legal_privilege_without_authorization"],
  },
  entity_manager: {
    allow: ["discover", "read", "download", "create", "edit", "comment", "review", "approve", "share_internal", "archive", "delete_request"],
    scope: "assigned_entity",
  },
  functional_director: {
    allow: ["discover", "read", "download", "create", "edit", "comment", "review", "approve", "share_internal", "archive", "delete_request"],
    scope: "assigned_function",
  },
  department_manager: {
    allow: ["discover", "read", "download", "create", "edit", "comment", "review", "approve", "share_internal"],
    scope: "assigned_department_and_projects",
  },
  employee: {
    allow: ["discover", "read", "download", "create", "edit", "comment"],
    scope: "assigned_department_projects_tasks_and_published_knowledge",
  },
  contractor: {
    allow: ["discover", "read", "download", "create", "edit", "comment"],
    scope: "explicit_assignments",
    controls: ["expiry_required", "no_inheritance", "no_external_reshare"],
  },
  external_guest: {
    allow: ["read", "download", "comment"],
    scope: "explicitly_shared_items",
    controls: ["expiry_required", "password_or_authenticated", "watermark_where_supported"],
  },
  document_controller: {
    allow: ["discover", "read", "download", "create", "edit", "comment", "review", "archive", "delete_request"],
    scope: "document_control_and_assigned_records",
    cannot: ["approve_own_controlled_document", "bypass_legal_hold"],
  },
  ai_classifier: {
    allow: ["discover", "read", "create", "comment"],
    scope: "quarantine_and_metadata",
    cannot: ["approve", "share_external", "delete_request", "administer"],
  },
  ai_orchestrator: {
    allow: ["discover", "read", "create", "edit", "comment"],
    scope: "configured_workflows",
    cannot: ["approve", "share_external", "permanent_delete", "grant_privilege", "access_secrets"],
  },
  infrastructure_admin: {
    allow: ["administer"],
    scope: "technical_platform",
    // The whole separation, in one field.
    exclusions: ["business_content_access_by_separate_authorized_role_only"],
  },
};

/**
 * Schema role to permission role.
 *
 * Two entries are derived rather than shipped, and are marked as such:
 *
 *   EXCO (hierarchy level 3) and PROJECT_MANAGER (level 7) both appear in
 *   organization_hierarchy.yaml and have no entry in roles_and_permissions.yaml.
 *   They are mapped to the nearest defined role that does not exceed their place
 *   in the hierarchy. Both should be given explicit entries in the controlled
 *   config; until then this is an assumption, not a reading.
 */
export const ROLE_TO_PERMISSION_ROLE: Record<GmRole, string> = {
  BOARD: "board_member",
  CEO: "group_ceo",
  // Derived — see the note above.
  COO: "functional_director",
  CFO: "functional_director",
  CTO: "functional_director",
  DOC_CONTROLLER: "document_controller",
  ENTITY_GM: "entity_manager",
  FUNCTIONAL_DIRECTOR: "functional_director",
  MANAGER: "department_manager",
  // Derived — see the note above.
  PROJECT_MANAGER: "department_manager",
  EMPLOYEE: "employee",
  CONTRACTOR: "contractor",
  EXTERNAL: "external_guest",
  AI_OPS: "ai_orchestrator",
  INFRA_ADMIN: "infrastructure_admin",
};

/** Roles whose permission entry was derived rather than shipped. */
export const DERIVED_PERMISSION_ROLES: readonly GmRole[] = ["COO", "CFO", "CTO", "PROJECT_MANAGER"];

/** Whether a role holds an operation at all, before any record-level check. */
export function roleCan(role: GmRole, op: Operation): boolean {
  const p = ROLE_PERMISSIONS[ROLE_TO_PERMISSION_ROLE[role]];
  if (!p) return false;
  if (p.cannot?.includes(op)) return false;
  return p.allow.includes(op);
}

/**
 * Nobody holds these, ever.
 *
 * `share_external` is absent from every role's allow list in the shipped
 * configuration — including the CEO's. Sharing outside the company is a gated
 * action rather than a capability somebody carries, which is consistent with
 * the autonomy matrix rating external_send HUMAN_APPROVAL.
 */
export function isUniversallyWithheld(op: Operation): boolean {
  return Object.values(ROLE_PERMISSIONS).every((p) => !p.allow.includes(op));
}

// ── Zone access (access_matrix.csv) ────────────────────────────────────────

/**
 * What a role gets in a zone. The matrix codes, kept as written:
 *
 *   R    read            RA   read and approve        RC  read and control
 *   -    no access       Reserved / Summary           Assigned / Explicit
 *   Scoped / MetadataOnly / IndexOnly / PlatformOnly / SubmitOnly / OwnAndPublished
 *   ByAuthorization / ReadAndDraft / ScopedRW / AdminMetadataOnly
 */
export type ZoneGrant = string;

export const ZONE_ACCESS: Record<string, Partial<Record<string, ZoneGrant>>> = {
  "00_SYSTEM": { data_owner: "Group CEO", board: "R", group_ceo: "R", document_controller: "R", ai_agent: "Scoped", infrastructure_admin: "AdminMetadataOnly" },
  "01_GROUP_GOVERNANCE": { data_owner: "Board", board: "R", group_ceo: "RA", document_controller: "RC", ai_agent: "IndexOnly", infrastructure_admin: "PlatformOnly" },
  "02_LEGAL_ENTITIES": { data_owner: "Group CEO", board: "R", group_ceo: "RA", entity_manager: "RA(Entity)", functional_director: "R(Assigned)", department_manager: "R(Assigned)", employee: "Assigned", document_controller: "RC", ai_agent: "MetadataOnly", infrastructure_admin: "PlatformOnly" },
  "03_STRATEGY_AND_PORTFOLIO": { data_owner: "Group CEO", board: "R", group_ceo: "RA", entity_manager: "R(Assigned)", functional_director: "RA(Assigned)", department_manager: "R(Assigned)", employee: "Assigned", document_controller: "RC", ai_agent: "Scoped", infrastructure_admin: "PlatformOnly" },
  "04_PEOPLE_AND_ORGANIZATION": { data_owner: "HR Director", board: "Reserved", group_ceo: "RA", entity_manager: "R(Entity)", functional_director: "R(Function)", department_manager: "R(Team)", employee: "OwnAndPublished", contractor: "Assigned", document_controller: "RC", ai_agent: "MetadataOnly", infrastructure_admin: "PlatformOnly" },
  "05_LEGAL_RISK_COMPLIANCE": { data_owner: "Legal Director", board: "Reserved", group_ceo: "RA", entity_manager: "R(Entity)", functional_director: "R(Assigned)", department_manager: "Assigned", employee: "Assigned", document_controller: "RC", ai_agent: "MetadataOnly", infrastructure_admin: "PlatformOnly" },
  "06_COMMERCIAL": { data_owner: "Commercial Director", board: "Summary", group_ceo: "RA", entity_manager: "RA(Entity)", functional_director: "RA(Function)", department_manager: "RA(Team)", employee: "Assigned", contractor: "Assigned", external_guest: "Explicit", document_controller: "RC", ai_agent: "Scoped", infrastructure_admin: "PlatformOnly" },
  "07_DELIVERY_AND_PROJECTS": { data_owner: "Operations Director", board: "Summary", group_ceo: "RA", entity_manager: "RA(Entity)", functional_director: "RA(Function)", department_manager: "RA(Team)", employee: "Assigned", contractor: "Assigned", external_guest: "Explicit", document_controller: "RC", ai_agent: "Scoped", infrastructure_admin: "PlatformOnly" },
  "08_FINANCE_AND_PROCUREMENT": { data_owner: "CFO", board: "Reserved", group_ceo: "RA", entity_manager: "R(Entity)", functional_director: "R(Assigned)", department_manager: "R(Assigned)", employee: "Assigned", contractor: "Assigned", document_controller: "RC", ai_agent: "MetadataOnly", infrastructure_admin: "PlatformOnly" },
  "09_PRODUCTS_AND_TECHNOLOGY": { data_owner: "CTO", board: "Summary", group_ceo: "RA", entity_manager: "R(Entity)", functional_director: "RA(Function)", department_manager: "RA(Team)", employee: "Assigned", contractor: "Assigned", document_controller: "RC", ai_agent: "Scoped", infrastructure_admin: "PlatformOnly" },
  "10_MARKETING_AND_BRAND": { data_owner: "Marketing Director", board: "Summary", group_ceo: "RA", entity_manager: "RA(Entity)", functional_director: "RA(Function)", department_manager: "RA(Team)", employee: "Assigned", contractor: "Assigned", external_guest: "Explicit", document_controller: "RC", ai_agent: "Scoped", infrastructure_admin: "PlatformOnly" },
  "11_OPERATIONS_AND_ADMIN": { data_owner: "COO", board: "Summary", group_ceo: "RA", entity_manager: "RA(Entity)", functional_director: "RA(Function)", department_manager: "RA(Team)", employee: "Assigned", contractor: "Assigned", document_controller: "RC", ai_agent: "Scoped", infrastructure_admin: "PlatformOnly" },
  "12_INBOX_AND_QUARANTINE": { data_owner: "Document Controller", group_ceo: "R", entity_manager: "R(Assigned)", functional_director: "R(Assigned)", department_manager: "R(Assigned)", employee: "SubmitOnly", contractor: "SubmitOnly", document_controller: "RA", ai_agent: "ScopedRW", infrastructure_admin: "PlatformOnly" },
  "13_TEMPLATES": { data_owner: "Document Controller", board: "R", group_ceo: "RA", entity_manager: "R", functional_director: "R", department_manager: "R", employee: "R", contractor: "R", document_controller: "RA", ai_agent: "ReadAndDraft", infrastructure_admin: "PlatformOnly" },
  "14_RECORDS_AND_ARCHIVE": { data_owner: "Records Manager", board: "Reserved", group_ceo: "RA", entity_manager: "R(Entity)", functional_director: "R(Assigned)", department_manager: "R(Assigned)", employee: "ByAuthorization", document_controller: "RA", ai_agent: "MetadataOnly", infrastructure_admin: "PlatformOnly" },
};

/** The matrix column a schema role reads. */
const ROLE_TO_COLUMN: Record<GmRole, string> = {
  BOARD: "board",
  CEO: "group_ceo",
  COO: "functional_director",
  CFO: "functional_director",
  CTO: "functional_director",
  DOC_CONTROLLER: "document_controller",
  ENTITY_GM: "entity_manager",
  FUNCTIONAL_DIRECTOR: "functional_director",
  MANAGER: "department_manager",
  PROJECT_MANAGER: "department_manager",
  EMPLOYEE: "employee",
  CONTRACTOR: "contractor",
  EXTERNAL: "external_guest",
  AI_OPS: "ai_agent",
  INFRA_ADMIN: "infrastructure_admin",
};

/**
 * What this role gets in this zone, or null for no access.
 *
 * A missing cell means no access. The matrix is deny-by-default, so an absent
 * entry is a refusal rather than an omission to be interpreted generously.
 */
export function zoneGrant(role: GmRole, zone: Zone | string): ZoneGrant | null {
  const row = ZONE_ACCESS[String(zone)];
  if (!row) return null;
  const grant = row[ROLE_TO_COLUMN[role]];
  if (!grant || grant === "-") return null;
  return grant;
}

/** Whether a grant code confers any ability to read content. */
export function grantAllowsRead(grant: ZoneGrant | null): boolean {
  if (!grant) return false;
  // Codes that name a restriction rather than a read right.
  const noRead = ["PlatformOnly", "AdminMetadataOnly", "MetadataOnly", "IndexOnly", "SubmitOnly"];
  return !noRead.includes(grant);
}

/** Whether a grant confers approval. */
export function grantAllowsApprove(grant: ZoneGrant | null): boolean {
  return Boolean(grant && (grant === "RA" || grant.startsWith("RA(")));
}

/** Zones a role can see at all — for building navigation that hides the rest. */
export function visibleZones(role: GmRole): string[] {
  return ZONES.filter((z) => grantAllowsRead(zoneGrant(role, z)));
}

// ── Granted capabilities ───────────────────────────────────────────────────

/**
 * An operation held by a person rather than by their role.
 *
 * The shipped model separates business authority from technical: `group_ceo`
 * holds no `administer`, and `infrastructure_admin` holds nothing else. That is
 * the right default and it stays the default — but a small group needs somebody
 * who can do both, and the honest way to express that is a named exception on
 * one person, not a quiet redefinition of what CEO means for everyone.
 *
 * ACCESS_GOVERNANCE_POLICY.md: "All exceptions require an owner, business
 * reason, approver, start date, expiry date, and review." So a grant carries
 * those rather than being a bare boolean.
 */
export type CapabilityGrant = {
  operations: Operation[];
  reason: string;
  grantedBy: string;
  grantedAt: string;
  /** Null means indefinite, which should be rare and is shown as such. */
  expiresAt?: string | null;
};

export function parseGrant(raw: unknown): CapabilityGrant | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Partial<CapabilityGrant>;
  if (!Array.isArray(g.operations) || !g.reason || !g.grantedBy) return null;
  const ops = g.operations.filter((o): o is Operation => (OPERATIONS as readonly string[]).includes(o));
  if (ops.length === 0) return null;
  return {
    operations: ops,
    reason: g.reason,
    grantedBy: g.grantedBy,
    grantedAt: g.grantedAt ?? "",
    expiresAt: g.expiresAt ?? null,
  };
}

export function grantIsCurrent(g: CapabilityGrant | null, now = new Date()): boolean {
  if (!g) return false;
  if (!g.expiresAt) return true;
  return new Date(g.expiresAt) > now;
}

/**
 * Whether this person holds the operation — by role, or by a current grant.
 *
 * An expired grant confers nothing. That is the point of recording an expiry
 * rather than a flag: a temporary elevation that never lapses is a permanent
 * one nobody decided to make.
 */
export function memberCan(
  member: { role: GmRole; grantedCapabilities?: unknown },
  op: Operation,
  now = new Date()
): boolean {
  if (roleCan(member.role, op)) return true;

  // A `cannot` is absolute. It is the difference between "this role is not
  // given that" and "this identity may never have that" — and a grant is an
  // exception mechanism for people, not a way around a prohibition on a
  // machine identity. Without this check, granting an agent `approve` would
  // work, and the agent gates would be decorative.
  const spec = ROLE_PERMISSIONS[ROLE_TO_PERMISSION_ROLE[member.role]];
  if (spec?.cannot?.includes(op)) return false;

  const grant = parseGrant(member.grantedCapabilities);
  if (!grantIsCurrent(grant, now)) return false;
  return grant!.operations.includes(op);
}

/** Operations this person holds beyond their role, for display. */
export function elevatedOperations(member: { role: GmRole; grantedCapabilities?: unknown }, now = new Date()): Operation[] {
  const grant = parseGrant(member.grantedCapabilities);
  if (!grantIsCurrent(grant, now)) return [];
  return grant!.operations.filter((o) => !roleCan(member.role, o));
}
