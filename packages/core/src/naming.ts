/**
 * The naming standard (00_SYSTEM/04_AI_RULES/naming_standard.md).
 *
 *   [Entity]-[Department]-[Type]-[YYYY]-[Sequence]-[ShortTitle]-vMajor.Minor-[Status].[ext]
 *   ORG-ES-OPS-SOP-2026-0007-ClientOnboarding-v1.0-APPROVED.pdf
 *
 * The standard also forbids names like `final`, `final2`, `new` and `copy`. That
 * is enforced here rather than left to good intentions, because those names are
 * exactly what a person types at 6pm.
 */
import {
  DEPARTMENT_IDS,
  DOC_TYPES,
  ENTITY_IDS,
  type DepartmentId,
  type DocType,
  type EntityId,
} from "./config.js";

export type DocIdParts = {
  entityId: EntityId;
  departmentId: DepartmentId;
  docType: DocType;
  year: number;
  sequence: number;
};

export type FileNameParts = DocIdParts & {
  shortTitle: string;
  versionMajor: number;
  versionMinor: number;
  status: string;
  ext: string;
};

/** Sequence is zero-padded to four digits, as in the worked example. */
const seq = (n: number) => String(n).padStart(4, "0");

/**
 * The stable identifier for a controlled document. Note this deliberately
 * excludes version and status: those change over a record's life, and an
 * identifier that changes is not an identifier.
 *
 * Matches `^ORG-[A-Z0-9-]+$` from document_metadata.schema.json.
 */
export function documentId(p: DocIdParts): string {
  return [p.entityId, p.departmentId, p.docType, p.year, seq(p.sequence)].join("-");
}

/** Parse a document id back into its parts, or null if it is not one. */
export function parseDocumentId(id: string): DocIdParts | null {
  // Entity ids contain a hyphen themselves (ORG-ES), so anchor on the tail:
  // the last four segments are always department, type, year, sequence.
  const parts = id.split("-");
  if (parts.length < 6) return null;
  const sequence = parts.pop()!;
  const year = parts.pop()!;
  const docType = parts.pop()!;
  const departmentId = parts.pop()!;
  const entityId = parts.join("-");

  if (!(ENTITY_IDS as readonly string[]).includes(entityId)) return null;
  if (!(DEPARTMENT_IDS as readonly string[]).includes(departmentId)) return null;
  if (!(DOC_TYPES as readonly string[]).includes(docType)) return null;
  if (!/^\d{4}$/.test(year) || !/^\d{4}$/.test(sequence)) return null;

  return {
    entityId: entityId as EntityId,
    departmentId: departmentId as DepartmentId,
    docType: docType as DocType,
    year: Number(year),
    sequence: Number(sequence),
  };
}

/** Names the standard rejects outright, whatever else is in the filename. */
const BANNED_WORDS = ["final", "final2", "finalfinal", "new", "copy", "latest", "draft2", "v2final"];

/**
 * Short titles go into a filename, so they are reduced to CamelCase without
 * separators: spaces and punctuation out, accents folded, capitals kept.
 * "Client onboarding (ES)" becomes "ClientOnboardingES".
 */
export function normaliseShortTitle(raw: string): string {
  const folded = raw.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const words = folded.split(/[^A-Za-z0-9]+/).filter(Boolean);
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join("");
}

/** Why this short title is unacceptable, or null when it is fine. */
export function shortTitleProblem(raw: string): string | null {
  const normalised = normaliseShortTitle(raw);
  if (!normalised) return "A short title is required.";
  if (normalised.length > 60) return "Short title must be 60 characters or fewer once normalised.";
  const lower = normalised.toLowerCase();
  const hit = BANNED_WORDS.find((w) => lower === w || lower.endsWith(w));
  if (hit) {
    return `"${hit}" is not allowed in a controlled name — the version and status fields carry that meaning.`;
  }
  return null;
}

/** The full controlled filename. */
export function fileName(p: FileNameParts): string {
  const problem = shortTitleProblem(p.shortTitle);
  if (problem) throw new Error(problem);
  const ext = p.ext.replace(/^\./, "").toLowerCase();
  return (
    [
      p.entityId,
      p.departmentId,
      p.docType,
      p.year,
      seq(p.sequence),
      normaliseShortTitle(p.shortTitle),
      `v${p.versionMajor}.${p.versionMinor}`,
      p.status.toUpperCase(),
    ].join("-") + `.${ext}`
  );
}

/**
 * Task references follow the same shape minus the document type, so a task and
 * the document it produces are visibly related.
 */
export function taskRef(p: { entityId: EntityId; departmentId: DepartmentId; year: number; sequence: number }): string {
  return [p.entityId, p.departmentId, "TSK", p.year, seq(p.sequence)].join("-");
}

/** Decision register references. */
export function decisionRef(p: { entityId: EntityId; year: number; sequence: number }): string {
  return [p.entityId, "DEC", p.year, seq(p.sequence)].join("-");
}
