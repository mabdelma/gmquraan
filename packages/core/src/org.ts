/**
 * The group hierarchy
 * (00_SYSTEM/12_IDENTITY_AND_ACCESS/organization_hierarchy.yaml).
 *
 * Twelve tiers, but only eight of them are a chain of command. The other four —
 * contractors, external counterparties, AI service agents and infrastructure
 * administrators — sit beside the chain, not in it. Keeping that distinction in
 * the type system is the point of this module: an infrastructure administrator
 * who can restart a database must not thereby be able to approve a payment, and
 * an agent must never appear in a reporting line at all.
 */
import {
  APPROVAL_LEVELS,
  DEPARTMENT_IDS,
  ENTITY_IDS,
  type ApprovalLevel,
  type DepartmentId,
  type EntityId,
  type GmRole,
} from "./config.js";

// ── Tiers ──────────────────────────────────────────────────────────────────

/** The eight tiers that form the reporting line, highest authority first. */
export const CHAIN_OF_COMMAND = [
  "BOARD",
  "GROUP_CEO",
  "EXCO",
  "ENTITY_GM",
  "FUNCTIONAL_DIRECTOR",
  "DEPARTMENT_MANAGER",
  "PROJECT_MANAGER",
  "EMPLOYEE",
] as const;
export type ChainTier = (typeof CHAIN_OF_COMMAND)[number];

/** Identity classes that are never part of the reporting line. */
export const LATERAL_TIERS = ["CONTRACTOR", "EXTERNAL", "AI_AGENT", "INFRA_ADMIN"] as const;
export type LateralTier = (typeof LATERAL_TIERS)[number];

export const ORG_TIERS = [...CHAIN_OF_COMMAND, ...LATERAL_TIERS] as const;
export type OrgTier = (typeof ORG_TIERS)[number];

export function isChainTier(t: OrgTier): t is ChainTier {
  return (CHAIN_OF_COMMAND as readonly string[]).includes(t);
}
export function isLateralTier(t: OrgTier): t is LateralTier {
  return (LATERAL_TIERS as readonly string[]).includes(t);
}

export type TierSpec = {
  name: string;
  /** Roles that may hold a position at this tier. */
  roles: readonly GmRole[];
  scope: "group" | "entity" | "external";
  approvalLevel: ApprovalLevel;
  /** Whether people may report to a position at this tier. */
  canHaveReports: boolean;
  /** Whether holders get a portal account. */
  portalAccess: boolean;
};

export const TIERS: Record<OrgTier, TierSpec> = {
  BOARD: { name: "Shareholders and Board", roles: ["BOARD"], scope: "group", approvalLevel: "A4", canHaveReports: true, portalAccess: true },
  GROUP_CEO: { name: "Group CEO", roles: ["CEO"], scope: "group", approvalLevel: "A4", canHaveReports: true, portalAccess: true },
  EXCO: { name: "Executive Committee", roles: ["COO", "CFO", "CTO", "DOC_CONTROLLER"], scope: "group", approvalLevel: "A3", canHaveReports: true, portalAccess: true },
  ENTITY_GM: { name: "Country or Entity General Manager", roles: ["ENTITY_GM"], scope: "entity", approvalLevel: "A3", canHaveReports: true, portalAccess: true },
  FUNCTIONAL_DIRECTOR: { name: "Functional Director", roles: ["FUNCTIONAL_DIRECTOR"], scope: "entity", approvalLevel: "A3", canHaveReports: true, portalAccess: true },
  DEPARTMENT_MANAGER: { name: "Department Manager", roles: ["MANAGER"], scope: "entity", approvalLevel: "A2", canHaveReports: true, portalAccess: true },
  PROJECT_MANAGER: { name: "Project and Product Manager", roles: ["PROJECT_MANAGER"], scope: "entity", approvalLevel: "A1", canHaveReports: true, portalAccess: true },
  EMPLOYEE: { name: "Employee", roles: ["EMPLOYEE"], scope: "entity", approvalLevel: "A0", canHaveReports: false, portalAccess: true },

  CONTRACTOR: { name: "Contractors and Partners", roles: ["CONTRACTOR"], scope: "entity", approvalLevel: "A0", canHaveReports: false, portalAccess: true },
  EXTERNAL: { name: "External Clients and Vendors", roles: ["EXTERNAL"], scope: "external", approvalLevel: "A0", canHaveReports: false, portalAccess: false },
  AI_AGENT: { name: "AI Service Agents", roles: ["AI_OPS"], scope: "group", approvalLevel: "A0", canHaveReports: false, portalAccess: false },
  INFRA_ADMIN: { name: "Infrastructure Administrators", roles: ["INFRA_ADMIN"], scope: "group", approvalLevel: "A0", canHaveReports: false, portalAccess: true },
};

/** The tier a role belongs to. */
export const ROLE_TIER: Record<GmRole, OrgTier> = {
  BOARD: "BOARD",
  CEO: "GROUP_CEO",
  COO: "EXCO",
  CFO: "EXCO",
  CTO: "EXCO",
  DOC_CONTROLLER: "EXCO",
  ENTITY_GM: "ENTITY_GM",
  FUNCTIONAL_DIRECTOR: "FUNCTIONAL_DIRECTOR",
  MANAGER: "DEPARTMENT_MANAGER",
  PROJECT_MANAGER: "PROJECT_MANAGER",
  EMPLOYEE: "EMPLOYEE",
  CONTRACTOR: "CONTRACTOR",
  EXTERNAL: "EXTERNAL",
  AI_OPS: "AI_AGENT",
  INFRA_ADMIN: "INFRA_ADMIN",
};

/** Rank in the chain; lateral tiers have no rank and return null. */
export function tierRank(t: OrgTier): number | null {
  const i = (CHAIN_OF_COMMAND as readonly string[]).indexOf(t);
  return i === -1 ? null : i;
}

/**
 * Whether `manager` may be the reporting line for `report`.
 *
 * Three refusals, each for a different reason: a lateral identity is not part
 * of the chain in either direction; a tier that cannot have reports cannot have
 * them regardless of rank; and a position may only report upward, which rules
 * out both sideways lines and the cycles that a "reports to a peer" edge
 * eventually creates.
 */
export function canReportTo(report: OrgTier, manager: OrgTier): { ok: boolean; reason?: string } {
  if (isLateralTier(report)) {
    return { ok: false, reason: `${TIERS[report].name} sits beside the chain of command, not in it.` };
  }
  if (isLateralTier(manager)) {
    return { ok: false, reason: `${TIERS[manager].name} cannot hold a reporting line.` };
  }
  if (!TIERS[manager].canHaveReports) {
    return { ok: false, reason: `${TIERS[manager].name} cannot have reports.` };
  }
  const r = tierRank(report)!;
  const m = tierRank(manager)!;
  if (m >= r) {
    return { ok: false, reason: "A position may only report to a higher tier." };
  }
  return { ok: true };
}

/**
 * The business approval level a tier confers.
 *
 * Infrastructure administrators are the case worth stating out loud: they hold
 * the most technical power in the system and the least commercial authority,
 * and this function is where that is enforced rather than assumed.
 */
export function approvalLevelFor(tier: OrgTier): ApprovalLevel {
  return TIERS[tier].approvalLevel;
}

/** Whether a tier may ever be granted business approval authority. */
export function mayHoldApproval(tier: OrgTier): boolean {
  return isChainTier(tier) && APPROVAL_LEVELS.indexOf(TIERS[tier].approvalLevel) > 0;
}

// ── Positions ──────────────────────────────────────────────────────────────

export type PositionSpec = {
  code: string;
  tier: OrgTier;
  role: GmRole;
  title: string;
  entityId: EntityId | null;
  departmentId: DepartmentId | null;
  approvalLevel: ApprovalLevel;
  parentCode: string | null;
};

/**
 * Position codes read as a path, so a seat's place in the structure is legible
 * without a lookup: ORG-ES-OPS-DEPARTMENT_MANAGER, GROUP-GROUP_CEO.
 */
export function positionCode(p: { entityId?: string | null; departmentId?: string | null; tier: OrgTier }): string {
  return [p.entityId ?? "GROUP", p.departmentId, p.tier].filter(Boolean).join("-");
}

/** The four group-level seats above every entity. */
export function groupPositions(): PositionSpec[] {
  const mk = (tier: OrgTier, role: GmRole, title: string, parentCode: string | null): PositionSpec => ({
    code: positionCode({ tier }),
    tier,
    role,
    title,
    entityId: null,
    departmentId: null,
    approvalLevel: approvalLevelFor(tier),
    parentCode,
  });

  const board = mk("BOARD", "BOARD", "Shareholders and Board", null);
  const ceo = mk("GROUP_CEO", "CEO", "Group CEO", board.code);

  // The executive committee is three distinct seats, not one — a single "EXCO"
  // position would make it impossible to say who the CFO is.
  const exco: PositionSpec[] = (
    [
      ["COO", "Chief Operating Officer"],
      ["CFO", "Chief Financial Officer"],
      ["CTO", "Chief Technology Officer"],
      ["DOC_CONTROLLER", "Group Document Controller"],
    ] as const
  ).map(([role, title]) => ({
    code: `GROUP-EXCO-${role}`,
    tier: "EXCO" as OrgTier,
    role: role as GmRole,
    title,
    entityId: null,
    departmentId: null,
    approvalLevel: approvalLevelFor("EXCO"),
    parentCode: ceo.code,
  }));

  // No parent, deliberately. Hanging this seat under the CTO would read as a
  // reporting line, and a lateral identity is not in the chain in either
  // direction — that is the whole separation. Accountability for infrastructure
  // custody is a matter for the delegation of authority, not the org chart.
  const infra: PositionSpec = {
    code: positionCode({ tier: "INFRA_ADMIN" }),
    tier: "INFRA_ADMIN",
    role: "INFRA_ADMIN",
    title: "Infrastructure Administrator",
    entityId: null,
    departmentId: null,
    approvalLevel: "A0",
    parentCode: null,
  };

  return [board, ceo, ...exco, infra];
}

/**
 * The standard structure for one branch: a general manager, four functional
 * directors, and a manager for each department.
 *
 * Employees are not generated. A seat exists because the structure calls for
 * it; a person exists because they were hired. Generating an "Employee"
 * position per department would invent headcount that does not exist.
 */
export function entityPositions(entityId: EntityId): PositionSpec[] {
  const gm: PositionSpec = {
    code: positionCode({ entityId, tier: "ENTITY_GM" }),
    tier: "ENTITY_GM",
    role: "ENTITY_GM",
    title: "General Manager",
    entityId,
    departmentId: null,
    approvalLevel: approvalLevelFor("ENTITY_GM"),
    parentCode: "GROUP-EXCO-COO",
  };

  const DIRECTOR_DEPTS: DepartmentId[] = ["OPS", "COM", "TEC", "FIN"];
  const directors = DIRECTOR_DEPTS.map<PositionSpec>((d) => ({
    code: positionCode({ entityId, departmentId: d, tier: "FUNCTIONAL_DIRECTOR" }),
    tier: "FUNCTIONAL_DIRECTOR",
    role: "FUNCTIONAL_DIRECTOR",
    title: `Director, ${d}`,
    entityId,
    departmentId: d,
    approvalLevel: approvalLevelFor("FUNCTIONAL_DIRECTOR"),
    parentCode: gm.code,
  }));

  const managers = DEPARTMENT_IDS.map<PositionSpec>((d) => ({
    code: positionCode({ entityId, departmentId: d, tier: "DEPARTMENT_MANAGER" }),
    tier: "DEPARTMENT_MANAGER",
    role: "MANAGER",
    title: `Manager, ${d}`,
    entityId,
    departmentId: d,
    approvalLevel: approvalLevelFor("DEPARTMENT_MANAGER"),
    // A department with a director reports to them; the rest report to the GM.
    parentCode: DIRECTOR_DEPTS.includes(d)
      ? positionCode({ entityId, departmentId: d, tier: "FUNCTIONAL_DIRECTOR" })
      : gm.code,
  }));

  return [gm, ...directors, ...managers];
}

/** Every position across the group and all entities. */
export function allPositions(entities: readonly EntityId[] = ENTITY_IDS): PositionSpec[] {
  return [...groupPositions(), ...entities.flatMap((e) => entityPositions(e))];
}

/** The chain of command only — what the org chart proper is drawn from. */
export function chainPositions(entities: readonly EntityId[] = ENTITY_IDS): PositionSpec[] {
  return allPositions(entities).filter((p) => isChainTier(p.tier));
}

/** Seats that sit beside the chain: listed, never drawn into the tree. */
export function lateralPositions(entities: readonly EntityId[] = ENTITY_IDS): PositionSpec[] {
  return allPositions(entities).filter((p) => isLateralTier(p.tier));
}

// ── Tree ───────────────────────────────────────────────────────────────────

export type PositionNode<T extends { code: string; parentCode: string | null }> = T & {
  children: PositionNode<T>[];
  depth: number;
};

/**
 * Assemble positions into a tree.
 *
 * Orphans — a position whose parent is missing from the input — are returned
 * separately rather than silently dropped or reparented to the root. A chart
 * that quietly relocates a seat is lying about the structure.
 */
export function buildTree<T extends { code: string; parentCode: string | null }>(
  positions: readonly T[]
): { roots: PositionNode<T>[]; orphans: T[] } {
  const byCode = new Map<string, PositionNode<T>>();
  for (const p of positions) byCode.set(p.code, { ...p, children: [], depth: 0 });

  const roots: PositionNode<T>[] = [];
  const orphans: T[] = [];

  for (const p of positions) {
    const node = byCode.get(p.code)!;
    if (!p.parentCode) {
      roots.push(node);
      continue;
    }
    const parent = byCode.get(p.parentCode);
    if (!parent) {
      orphans.push(p);
      continue;
    }
    parent.children.push(node);
  }

  // Depth is assigned by walking down, with a visited set: a cycle in the data
  // would otherwise recurse until the stack gives out.
  const seen = new Set<string>();
  const walk = (n: PositionNode<T>, depth: number) => {
    if (seen.has(n.code)) return;
    seen.add(n.code);
    n.depth = depth;
    for (const c of n.children) walk(c, depth + 1);
  };
  for (const r of roots) walk(r, 0);

  return { roots, orphans };
}

/** Flatten a tree back to a list in display order. */
export function flattenTree<T extends { code: string; parentCode: string | null }>(
  roots: readonly PositionNode<T>[]
): PositionNode<T>[] {
  const out: PositionNode<T>[] = [];
  const walk = (n: PositionNode<T>) => {
    out.push(n);
    for (const c of n.children) walk(c);
  };
  for (const r of roots) walk(r);
  return out;
}

/** Why this person cannot hold this position, or null when they can. */
export function placementProblem(
  member: { role: GmRole; entityId?: string | null },
  position: { tier: OrgTier; role: GmRole; entityId: string | null }
): string | null {
  if (!TIERS[position.tier].roles.includes(position.role)) {
    return `A ${position.tier} seat cannot be held with the role ${position.role}.`;
  }
  if (member.role !== position.role) {
    return `${member.role} does not match the seat's role, ${position.role}.`;
  }
  if (position.entityId && member.entityId && position.entityId !== member.entityId) {
    return `The seat belongs to ${position.entityId} but the member is in ${member.entityId}.`;
  }
  return null;
}
