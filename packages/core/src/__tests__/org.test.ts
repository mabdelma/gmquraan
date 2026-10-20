import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  CHAIN_OF_COMMAND,
  chainPositions,
  lateralPositions,
  ENTITIES,
  ENTITY_IDS,
  LATERAL_TIERS,
  ORG_TIERS,
  ROLE_DEFAULT_LEVEL,
  ROLE_TIER,
  TIERS,
  allPositions,
  approvalLevelFor,
  buildTree,
  canReportTo,
  entityPositions,
  flattenTree,
  groupPositions,
  isChainTier,
  isLateralTier,
  isRegisteredEntity,
  mayHoldApproval,
  placementProblem,
  positionCode,
  tierRank,
  type OrgTier,
} from "../index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const HIERARCHY = resolve(HERE, "../../config/12_IDENTITY_AND_ACCESS/organization_hierarchy.yaml");

describe("the hierarchy matches the controlled file", () => {
  const text = readFileSync(HIERARCHY, "utf8");

  it("declares every tier the code knows", () => {
    for (const t of ORG_TIERS) expect(text).toContain(`id: ${t}`);
  });

  it("splits the chain of command from the lateral identities the same way", () => {
    const chainBlock = text.split("chain_of_command:")[1].split("lateral_identities:")[0];
    const lateralBlock = text.split("lateral_identities:")[1].split("entity_template:")[0];

    for (const t of CHAIN_OF_COMMAND) expect(chainBlock, t).toContain(`id: ${t}`);
    for (const t of LATERAL_TIERS) expect(lateralBlock, t).toContain(`id: ${t}`);
  });
});

describe("tiers", () => {
  it("every role maps to a tier, and every tier accepts its roles", () => {
    for (const [role, tier] of Object.entries(ROLE_TIER)) {
      expect(TIERS[tier].roles, `${role} → ${tier}`).toContain(role);
    }
  });

  it("chain tiers are ranked, lateral tiers are not", () => {
    for (const t of CHAIN_OF_COMMAND) expect(tierRank(t)).toBeTypeOf("number");
    for (const t of LATERAL_TIERS) expect(tierRank(t)).toBeNull();
  });

  it("a tier is either in the chain or beside it, never both", () => {
    for (const t of ORG_TIERS) expect(isChainTier(t)).toBe(!isLateralTier(t));
  });
});

describe("infrastructure administrators are separated from business authority", () => {
  // The point of the separation: the most technical power, the least
  // commercial authority.
  it("hold no approval level", () => {
    expect(approvalLevelFor("INFRA_ADMIN")).toBe("A0");
    expect(ROLE_DEFAULT_LEVEL.INFRA_ADMIN).toBe("A0");
    expect(mayHoldApproval("INFRA_ADMIN")).toBe(false);
  });

  it("cannot have anyone reporting to them", () => {
    expect(TIERS.INFRA_ADMIN.canHaveReports).toBe(false);
    expect(canReportTo("EMPLOYEE", "INFRA_ADMIN").ok).toBe(false);
  });

  it("the same is true of every lateral identity", () => {
    for (const t of LATERAL_TIERS) {
      expect(approvalLevelFor(t), t).toBe("A0");
      expect(mayHoldApproval(t), t).toBe(false);
      expect(canReportTo("EMPLOYEE", t).ok, t).toBe(false);
      expect(canReportTo(t, "GROUP_CEO").ok, t).toBe(false);
    }
  });

  it("an AI agent is never in a reporting line in either direction", () => {
    expect(canReportTo("AI_AGENT", "GROUP_CEO").ok).toBe(false);
    expect(canReportTo("EMPLOYEE", "AI_AGENT").ok).toBe(false);
  });
});

describe("reporting lines", () => {
  it("only go upward", () => {
    expect(canReportTo("EMPLOYEE", "DEPARTMENT_MANAGER").ok).toBe(true);
    expect(canReportTo("DEPARTMENT_MANAGER", "ENTITY_GM").ok).toBe(true);
    expect(canReportTo("ENTITY_GM", "EXCO").ok).toBe(true);
  });

  it("refuse sideways and downward lines", () => {
    expect(canReportTo("EXCO", "EMPLOYEE").ok).toBe(false);
    expect(canReportTo("EMPLOYEE", "EMPLOYEE").ok).toBe(false);
    expect(canReportTo("ENTITY_GM", "ENTITY_GM").ok).toBe(false);
  });

  it("refuse a report to a tier that cannot hold reports", () => {
    expect(canReportTo("EMPLOYEE", "EMPLOYEE").reason).toMatch(/only report to a higher tier|cannot have reports/);
  });
});

describe("generated structure", () => {
  it("gives every branch a general manager, four directors and a manager per department", () => {
    const es = entityPositions("ORG-ES");
    expect(es.filter((p) => p.tier === "ENTITY_GM")).toHaveLength(1);
    expect(es.filter((p) => p.tier === "FUNCTIONAL_DIRECTOR")).toHaveLength(4);
    expect(es.filter((p) => p.tier === "DEPARTMENT_MANAGER")).toHaveLength(9);
  });

  it("generates no employee seats — headcount is hired, not generated", () => {
    for (const e of ENTITY_IDS) {
      expect(entityPositions(e).some((p) => p.tier === "EMPLOYEE"), e).toBe(false);
    }
  });

  it("covers all four branches including the Example Country operating location", () => {
    const all = allPositions();
    for (const e of ENTITY_IDS) {
      expect(all.some((p) => p.entityId === e), e).toBe(true);
    }
    expect(isRegisteredEntity("ORG-EG")).toBe(false);
    expect(isRegisteredEntity("ORG-ES")).toBe(true);
  });

  it("codes read as a path and are unique", () => {
    expect(positionCode({ entityId: "ORG-ES", departmentId: "OPS", tier: "DEPARTMENT_MANAGER" })).toBe(
      "ORG-ES-OPS-DEPARTMENT_MANAGER"
    );
    expect(positionCode({ tier: "GROUP_CEO" })).toBe("GROUP-GROUP_CEO");

    const codes = allPositions().map((p) => p.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("every parent reference resolves, and every line is legal", () => {
    const all = allPositions();
    const byCode = new Map(all.map((p) => [p.code, p]));

    for (const p of all) {
      if (!p.parentCode) continue;
      const parent = byCode.get(p.parentCode);
      expect(parent, `${p.code} → ${p.parentCode}`).toBeDefined();
      expect(canReportTo(p.tier, parent!.tier).ok, `${p.tier} → ${parent!.tier}`).toBe(true);
    }
  });

  it("the chain of command has exactly one root, the board", () => {
    const { roots, orphans } = buildTree(chainPositions());
    expect(orphans).toHaveLength(0);
    expect(roots).toHaveLength(1);
    expect(roots[0].tier).toBe("BOARD");
  });

  it("no lateral seat has a parent — it is beside the chart, not under it", () => {
    for (const p of lateralPositions()) {
      expect(p.parentCode, p.code).toBeNull();
    }
  });

  it("the tree contains every seat exactly once", () => {
    const all = chainPositions();
    const { roots } = buildTree(all);
    const flat = flattenTree(roots);
    expect(flat).toHaveLength(all.length);
    expect(new Set(flat.map((n) => n.code)).size).toBe(all.length);
  });

  it("the executive committee is separate seats, so the CFO is identifiable", () => {
    const exco = groupPositions().filter((p) => p.tier === "EXCO");
    expect(exco.map((p) => p.role).sort()).toEqual(["CFO", "COO", "CTO", "DOC_CONTROLLER"]);
  });
});

describe("tree assembly", () => {
  it("reports orphans rather than reparenting them", () => {
    // A chart that quietly moves a seat is lying about the structure.
    const { roots, orphans } = buildTree([
      { code: "a", parentCode: null },
      { code: "b", parentCode: "a" },
      { code: "c", parentCode: "missing" },
    ]);
    expect(roots).toHaveLength(1);
    expect(orphans.map((o) => o.code)).toEqual(["c"]);
  });

  it("survives a cycle in the data instead of overflowing the stack", () => {
    const { roots } = buildTree([
      { code: "x", parentCode: "y" },
      { code: "y", parentCode: "x" },
    ]);
    // Neither is a root, so nothing renders — but it returns.
    expect(roots).toHaveLength(0);
  });
});

describe("placing a person in a seat", () => {
  const seat = { tier: "DEPARTMENT_MANAGER" as OrgTier, role: "MANAGER" as const, entityId: "ORG-ES" };

  it("accepts a matching member", () => {
    expect(placementProblem({ role: "MANAGER", entityId: "ORG-ES" }, seat)).toBeNull();
  });

  it("refuses a mismatched role", () => {
    expect(placementProblem({ role: "EMPLOYEE", entityId: "ORG-ES" }, seat)).toMatch(/does not match/);
  });

  it("refuses somebody from another branch", () => {
    expect(placementProblem({ role: "MANAGER", entityId: "ORG-CA" }, seat)).toMatch(/belongs to ORG-ES/);
  });
});

describe("entity coverage", () => {
  it("every branch in the config has a legal name and a currency", () => {
    for (const e of ENTITY_IDS) {
      expect(ENTITIES[e].legalName, e).toBeTruthy();
      expect(ENTITIES[e].currency, e).toBeTruthy();
    }
  });
});
