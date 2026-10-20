import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  AGENTS,
  AGENT_KEYS,
  APPROVAL_LIMITS,
  CONFIDENTIALITY,
  DEPARTMENTS,
  DOC_TYPE_INFO,
  ENTITIES,
  GROUP_CONFIG,
  ROLE_DEFAULT_LEVEL,
  ROLE_IDS,
  type DocType,
  type GmRole,
} from "../config.js";
import { AUTONOMY_MATRIX } from "../autonomy.js";
import { DOC_STATES, TASK_STATES, TASK_TRANSITIONS } from "../lifecycle.js";

/**
 * The constants in config.ts are a transcription of the controlled package.
 * A transcription nobody checks is a copy that silently rots, so this reads the
 * real files and fails the moment the two disagree.
 *
 * If this test fails: the file under /gmos is right and the code is wrong.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const SYSTEM = resolve(HERE, "../../config");
const read = (rel: string) => readFileSync(resolve(SYSTEM, rel), "utf8");

/** Minimal CSV reader — the controlled files are plain, but do quote commas. */
function csv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  const head = splitRow(lines[0]);
  return lines.slice(1).map((l) => {
    const cells = splitRow(l);
    return Object.fromEntries(head.map((h, i) => [h, cells[i] ?? ""]));
  });
}
function splitRow(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

describe("entities.csv", () => {
  const rows = csv(read("01_CONFIGURATION/entities.csv"));

  it("lists exactly the entities the code knows", () => {
    expect(rows.map((r) => r.entity_id)).toEqual(Object.keys(ENTITIES));
  });

  it("agrees on legal name, country and currency", () => {
    for (const r of rows) {
      const e = ENTITIES[r.entity_id as keyof typeof ENTITIES];
      expect(e.legalName).toBe(r.legal_name);
      expect(e.country).toBe(r.country);
      expect(e.currency).toBe(r.base_currency);
    }
  });
});

describe("departments.csv", () => {
  const rows = csv(read("01_CONFIGURATION/departments.csv"));

  it("lists exactly the departments the code knows", () => {
    expect(rows.map((r) => r.department_id)).toEqual(Object.keys(DEPARTMENTS));
  });

  it("agrees on name and executive owner", () => {
    for (const r of rows) {
      const d = DEPARTMENTS[r.department_id as keyof typeof DEPARTMENTS];
      expect(d.name).toBe(r.name);
      expect(d.executiveOwner).toBe(r.executive_owner);
    }
  });
});

describe("roles.csv", () => {
  const rows = csv(read("01_CONFIGURATION/roles.csv"));

  it("every role_id maps to a schema role", () => {
    const mapped = new Set(Object.values(ROLE_IDS));
    for (const r of rows) expect(mapped).toContain(r.role_id);
  });

  it("default approval levels match the file", () => {
    const byId = new Map(rows.map((r) => [r.role_id, r.approval_level]));
    for (const [role, roleId] of Object.entries(ROLE_IDS)) {
      expect(ROLE_DEFAULT_LEVEL[role as GmRole]).toBe(byId.get(roleId));
    }
  });
});

describe("approval_limits.csv", () => {
  const rows = csv(read("01_CONFIGURATION/approval_limits.csv"));

  it("describes the same five levels", () => {
    expect(rows.map((r) => r.level)).toEqual(Object.keys(APPROVAL_LIMITS));
    for (const r of rows) {
      expect(APPROVAL_LIMITS[r.level as keyof typeof APPROVAL_LIMITS].description).toBe(r.description);
    }
  });
});

describe("document_types.csv", () => {
  const rows = csv(read("03_TAXONOMIES/document_types.csv"));

  it("lists exactly the document types the code knows", () => {
    expect(rows.map((r) => r.code)).toEqual(Object.keys(DOC_TYPE_INFO));
  });

  it("agrees on name, default owner and retention", () => {
    for (const r of rows) {
      const t = DOC_TYPE_INFO[r.code as DocType];
      expect(t.name).toBe(r.name);
      expect(t.defaultOwner).toBe(r.default_owner);
      expect(t.defaultRetention).toBe(r.default_retention);
    }
  });
});

describe("10_AI_AGENTS_CATALOGUE.csv", () => {
  const rows = csv(read("10_AI_AGENTS_CATALOGUE.csv"));

  it("registers exactly the catalogued agents", () => {
    expect(rows.map((r) => r.agent_id)).toEqual([...AGENT_KEYS]);
  });

  it("agrees on name and purpose", () => {
    for (const r of rows) {
      const a = AGENTS[r.agent_id as keyof typeof AGENTS];
      expect(a.name).toBe(r.name);
      expect(a.purpose).toBe(r.purpose);
    }
  });
});

describe("group_config.json", () => {
  const cfg = JSON.parse(read("01_CONFIGURATION/group_config.json"));

  it("carries the same thresholds", () => {
    expect(GROUP_CONFIG.groupId).toBe(cfg.group_id);
    expect(GROUP_CONFIG.timezone).toBe(cfg.timezone);
    expect(GROUP_CONFIG.aiConfidenceAutoFile).toBe(cfg.ai_confidence_auto_file);
    expect(GROUP_CONFIG.aiConfidenceHumanReview).toBe(cfg.ai_confidence_human_review);
    expect(GROUP_CONFIG.destructiveActionsRequireHumanApproval).toBe(cfg.destructive_actions_require_human_approval);
  });
});

describe("autonomy_matrix.yaml", () => {
  // `key: value` under a single `actions:` heading — parsed directly rather
  // than pulling in a YAML dependency for ten lines.
  const entries = read("04_AI_RULES/autonomy_matrix.yaml")
    .split(/\r?\n/)
    .map((l) => l.match(/^\s{2,}([a-z_]+):\s*(\S+)\s*$/))
    .filter(Boolean)
    .map((m) => [m![1], m![2]] as const);

  it("declares every action the code knows, and no others", () => {
    expect(entries.map(([k]) => k).sort()).toEqual(Object.keys(AUTONOMY_MATRIX).sort());
  });

  it("maps each action to the same gate", () => {
    for (const [action, gate] of entries) {
      expect(AUTONOMY_MATRIX[action as keyof typeof AUTONOMY_MATRIX]).toBe(gate.toUpperCase());
    }
  });
});

describe("universal_task_lifecycle.yaml", () => {
  const text = read("05_WORKFLOWS/universal_task_lifecycle.yaml");
  const states = text
    .match(/^states:\s*\[(.+)\]/m)![1]
    .split(",")
    .map((s) => s.trim().toUpperCase());

  it("every state in the file exists in the code", () => {
    for (const s of states) expect(TASK_STATES).toContain(s);
  });

  it("every transition in the file is permitted by the code", () => {
    const block = text.split("transitions:")[1].split("required_controls:")[0];
    for (const line of block.split(/\r?\n/)) {
      const m = line.match(/^\s{2}([a-z_]+):\s*\[(.*)\]/);
      if (!m) continue;
      const from = m[1].toUpperCase() as keyof typeof TASK_TRANSITIONS;
      const targets = m[2].split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
      for (const to of targets) {
        expect(TASK_TRANSITIONS[from], `${from} → ${to}`).toContain(to);
      }
    }
  });
});

describe("document_lifecycle.yaml", () => {
  const states = read("05_WORKFLOWS/document_lifecycle.yaml")
    .match(/^states:\s*\[(.+)\]/m)![1]
    .split(",")
    .map((s) => s.trim().toUpperCase());

  it("every document state in the file exists in the code", () => {
    for (const s of states) expect(DOC_STATES).toContain(s);
  });
});

describe("data_classification.md", () => {
  const text = read("06_SECURITY/data_classification.md").toLowerCase();

  it("defines every confidentiality level the code enforces", () => {
    for (const level of CONFIDENTIALITY) {
      expect(text).toContain(`- ${level.toLowerCase()}:`);
    }
  });
});
