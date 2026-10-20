import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  DERIVED_PERMISSION_ROLES,
  GM_ROLES,
  OPERATIONS,
  ROLE_PERMISSIONS,
  ROLE_TO_PERMISSION_ROLE,
  elevatedOperations,
  memberCan,
  parseGrant,
  ZONES,
  ZONE_ACCESS,
  grantAllowsApprove,
  grantAllowsRead,
  isUniversallyWithheld,
  roleCan,
  visibleZones,
  zoneGrant,
} from "../index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const IAM = resolve(HERE, "../../config/12_IDENTITY_AND_ACCESS");

/**
 * These read the v1.2 controlled files. If the package moves or is replaced,
 * this suite fails loudly rather than silently validating a stale transcription.
 */
describe("roles_and_permissions.yaml", () => {
  const text = readFileSync(resolve(IAM, "roles_and_permissions.yaml"), "utf8");

  it("declares the same thirteen operations the code knows", () => {
    const declared = text
      .match(/^operations:\s*\[(.+)\]/m)![1]
      .split(",")
      .map((s) => s.trim());
    expect(declared).toEqual([...OPERATIONS]);
  });

  it("declares the same roles", () => {
    const declared = [...text.matchAll(/^ {2}([a-z_]+):$/gm)].map((m) => m[1]);
    expect(declared.sort()).toEqual(Object.keys(ROLE_PERMISSIONS).sort());
  });

  it("grants each role exactly the operations the file lists", () => {
    for (const [role, spec] of Object.entries(ROLE_PERMISSIONS)) {
      const block = text.split(`  ${role}:`)[1].split(/\n {2}[a-z_]+:/)[0];
      const allow = block
        .match(/allow:\s*\[(.*?)\]/s)![1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      expect(allow, role).toEqual([...spec.allow]);
    }
  });
});

describe("access_matrix.csv", () => {
  const rows = readFileSync(resolve(IAM, "access_matrix.csv"), "utf8").trim().split(/\r?\n/);
  const areas = rows.slice(1).map((r) => r.split(",")[0]).filter((a) => a !== "Legend");

  it("covers every zone the code knows about", () => {
    for (const a of areas) expect(ZONES, a).toContain(a);
  });

  it("agrees with the transcribed grants, cell by cell", () => {
    const header = rows[0].split(",");
    let compared = 0;

    for (const row of rows.slice(1)) {
      const cells = row.split(",");
      const area = cells[0];
      if (area === "Legend") continue;

      for (let i = 1; i < header.length; i++) {
        const column = header[i];
        if (column === "data_owner") continue;
        const fileValue = cells[i] === "-" || !cells[i] ? null : cells[i];
        const codeValue = ZONE_ACCESS[area]?.[column] ?? null;
        expect(codeValue, `${area} / ${column}`).toBe(fileValue);
        compared++;
      }
    }

    // Guard against the comparison silently doing nothing.
    expect(compared).toBeGreaterThan(100);
  });
});

describe("operations", () => {
  it("separates the four distinctions that were previously collapsed", () => {
    // Knowing a record exists, reading it, taking a copy, and sending it
    // outside the company are four different disclosures.
    for (const op of ["discover", "read", "download", "share_external"] as const) {
      expect(OPERATIONS).toContain(op);
    }
  });

  it("gives nobody share_external — not even the CEO", () => {
    // Absent from every allow list in the shipped config. Sharing outside the
    // company is a gated action, not a capability anybody carries. Consistent
    // with external_send being HUMAN_APPROVAL in the autonomy matrix.
    expect(isUniversallyWithheld("share_external")).toBe(true);
    expect(roleCan("CEO", "share_external")).toBe(false);
  });

  it("gives nobody an outright delete", () => {
    expect(OPERATIONS).toContain("delete_request");
    expect(OPERATIONS as readonly string[]).not.toContain("delete");
  });
});

describe("infrastructure administrators", () => {
  it("hold administer and nothing else", () => {
    expect(roleCan("INFRA_ADMIN", "administer")).toBe(true);
    for (const op of OPERATIONS) {
      if (op === "administer") continue;
      expect(roleCan("INFRA_ADMIN", op), op).toBe(false);
    }
  });

  it("cannot read business content in any zone", () => {
    // PlatformOnly and AdminMetadataOnly are the only grants they hold, and
    // neither confers read.
    let checked = 0;
    for (const z of ZONES) {
      const g = zoneGrant("INFRA_ADMIN", z);
      if (!g) continue;
      expect(grantAllowsRead(g), `${z}: ${g}`).toBe(false);
      checked++;
    }
    expect(checked).toBeGreaterThan(10);
    expect(visibleZones("INFRA_ADMIN")).toEqual([]);
  });
});

describe("AI agents", () => {
  it("cannot approve, share externally or request deletion", () => {
    for (const op of ["approve", "share_external", "delete_request", "administer"] as const) {
      expect(roleCan("AI_OPS", op), op).toBe(false);
    }
  });

  it("can read, create and comment — the work of a classifier", () => {
    for (const op of ["discover", "read", "create", "comment"] as const) {
      expect(roleCan("AI_OPS", op), op).toBe(true);
    }
  });
});

describe("zone grants", () => {
  it("keeps the board out of HR and finance detail", () => {
    // "Reserved" is not a read grant.
    expect(zoneGrant("BOARD", "04_PEOPLE_AND_ORGANIZATION")).toBe("Reserved");
    expect(zoneGrant("BOARD", "08_FINANCE_AND_PROCUREMENT")).toBe("Reserved");
  });

  it("gives an employee submit-only access to quarantine", () => {
    const g = zoneGrant("EMPLOYEE", "12_INBOX_AND_QUARANTINE");
    expect(g).toBe("SubmitOnly");
    expect(grantAllowsRead(g)).toBe(false);
  });

  it("gives the document controller control of quarantine and the archive", () => {
    expect(grantAllowsApprove(zoneGrant("DOC_CONTROLLER", "12_INBOX_AND_QUARANTINE"))).toBe(true);
    expect(grantAllowsApprove(zoneGrant("DOC_CONTROLLER", "14_RECORDS_AND_ARCHIVE"))).toBe(true);
  });

  it("refuses an external guest everything but explicitly shared commercial areas", () => {
    expect(zoneGrant("EXTERNAL", "06_COMMERCIAL")).toBe("Explicit");
    expect(zoneGrant("EXTERNAL", "04_PEOPLE_AND_ORGANIZATION")).toBeNull();
    expect(zoneGrant("EXTERNAL", "00_SYSTEM")).toBeNull();
  });

  it("treats a missing cell as a refusal rather than an omission", () => {
    expect(zoneGrant("CONTRACTOR", "01_GROUP_GOVERNANCE")).toBeNull();
    expect(zoneGrant("EMPLOYEE", "00_SYSTEM")).toBeNull();
  });
});

describe("granted capabilities", () => {
  const grant = (ops: string[], expiresAt: string | null = null) => ({
    operations: ops,
    reason: "Sole owner-operator; business and technical authority held by one person.",
    grantedBy: "board",
    grantedAt: "2026-08-04T00:00:00Z",
    expiresAt,
  });

  it("a role without administer does not hold it by default", () => {
    // The shipped separation: group_ceo has no administer at all.
    expect(roleCan("CEO", "administer")).toBe(false);
    expect(memberCan({ role: "CEO" }, "administer")).toBe(false);
  });

  it("a current grant confers the operation", () => {
    expect(memberCan({ role: "CEO", grantedCapabilities: grant(["administer"]) }, "administer")).toBe(true);
  });

  it("an expired grant confers nothing", () => {
    // The point of recording an expiry: a temporary elevation that never
    // lapses is a permanent one nobody decided to make.
    const expired = grant(["administer"], "2026-01-01T00:00:00Z");
    expect(memberCan({ role: "CEO", grantedCapabilities: expired }, "administer")).toBe(false);
  });

  it("a grant never removes what the role already gives", () => {
    expect(memberCan({ role: "CEO", grantedCapabilities: grant(["administer"]) }, "approve")).toBe(true);
  });

  it("a malformed grant is ignored rather than trusted", () => {
    for (const bad of [null, {}, { operations: [] }, { operations: ["administer"] }, "administer"]) {
      expect(memberCan({ role: "CEO", grantedCapabilities: bad }, "administer"), JSON.stringify(bad)).toBe(false);
    }
  });

  it("an unknown operation in a grant is discarded", () => {
    const junk = grant(["administer", "become_root" as never]);
    expect(parseGrant(junk)!.operations).toEqual(["administer"]);
  });

  it("reports what somebody holds beyond their role", () => {
    expect(elevatedOperations({ role: "CEO", grantedCapabilities: grant(["administer", "approve"]) })).toEqual([
      "administer",
    ]);
    expect(elevatedOperations({ role: "CEO" })).toEqual([]);
  });

  it("does not let a grant hand an agent something it may never hold", () => {
    // ai_orchestrator lists approve, share_external and delete_request under
    // `cannot`. A grant is an exception mechanism for people, not a way round a
    // prohibition on a machine identity — otherwise the agent gates are
    // decorative and one row in the database undoes them.
    for (const op of ["approve", "share_external"] as const) {
      expect(roleCan("AI_OPS", op), op).toBe(false);
      expect(memberCan({ role: "AI_OPS", grantedCapabilities: grant([op]) }, op), op).toBe(false);
    }
  });

  it("only blocks what that particular role is actually forbidden", () => {
    // AI_OPS maps to ai_orchestrator, whose `cannot` list is approve,
    // share_external, permanent_delete, grant_privilege and access_secrets.
    // delete_request is forbidden to ai_classifier, a different role — so a
    // grant of it here is permitted, and pretending otherwise would be
    // asserting a rule the config does not contain.
    expect(ROLE_PERMISSIONS.ai_orchestrator.cannot).not.toContain("delete_request");
    expect(memberCan({ role: "AI_OPS", grantedCapabilities: grant(["delete_request"]) }, "delete_request")).toBe(true);
  });

  it("the cannot lists mix operations with autonomy-matrix action names", () => {
    // Worth recording: permanent_delete, grant_privilege and access_secrets are
    // action keys from autonomy_matrix.yaml, not entries in OPERATIONS. The
    // check is a string comparison, so they are inert here and are enforced by
    // the autonomy gate instead. A reader should not assume they do work twice.
    const cannot = ROLE_PERMISSIONS.ai_orchestrator.cannot ?? [];
    const notOperations = cannot.filter((c) => !(OPERATIONS as readonly string[]).includes(c));
    expect(notOperations).toEqual(["permanent_delete", "grant_privilege", "access_secrets"]);
  });
});

describe("role coverage", () => {
  it("maps every schema role to a permission role", () => {
    for (const r of GM_ROLES) {
      expect(ROLE_PERMISSIONS[ROLE_TO_PERMISSION_ROLE[r]], r).toBeDefined();
    }
  });

  it("marks the roles whose permissions were derived rather than shipped", () => {
    // The hierarchy defines executive_committee and project_product_manager;
    // roles_and_permissions.yaml gives neither an entry. That is a gap in the
    // controlled config, recorded here rather than hidden.
    expect(DERIVED_PERMISSION_ROLES).toContain("COO");
    expect(DERIVED_PERMISSION_ROLES).toContain("PROJECT_MANAGER");
    const shipped = readFileSync(resolve(IAM, "roles_and_permissions.yaml"), "utf8");
    expect(shipped).not.toContain("executive_committee:");
    expect(shipped).not.toContain("project_product_manager:");
  });
});
