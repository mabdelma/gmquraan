import { createHash } from "crypto";
import { mkdir, readFile, unlink, writeFile, stat } from "fs/promises";
import { dirname, join } from "path";
import { prisma } from "@app/db";
import {
  canRead,
  grantAllowsRead,
  isGroupWide,
  roleCan,
  storagePath,
  zoneGrant,
  type Operation,
  type Viewer,
  type Zone,
} from "@app/core";

/**
 * Document storage on disk, register in the database.
 *
 * Content-addressed: the file lives under its own SHA-256, so the same bytes
 * uploaded twice cost one copy, and the checksum recorded against the document
 * is literally the name of the thing on disk rather than a field that has to be
 * kept in step with it.
 */

function root(): string {
  return process.env.DOCUMENT_ROOT || "/data/documents";
}

export function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

/**
 * Write bytes and return their digest.
 *
 * If the digest already exists on disk the write is skipped — identical content
 * is stored once. That makes the duplicate detection AI-KNOW performs a
 * property of the store rather than a cleanup job.
 */
export async function putBytes(buf: Buffer): Promise<{ sha256: string; path: string; deduped: boolean }> {
  const digest = sha256(buf);
  const rel = storagePath(digest);
  const abs = join(root(), rel);

  try {
    await stat(abs);
    return { sha256: digest, path: rel, deduped: true };
  } catch {
    // Not present — write it.
  }

  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, buf, { mode: 0o640 });
  return { sha256: digest, path: rel, deduped: false };
}

/**
 * Read bytes back, verifying them against the digest they are filed under.
 *
 * A silent bit-flip or a swapped file would otherwise be served as though it
 * were the approved record. Cheap to check, and the whole point of storing by
 * content hash.
 */
export async function getBytes(rel: string, expected: string): Promise<Buffer> {
  const buf = await readFile(join(root(), rel));
  const actual = sha256(buf);
  if (actual !== expected) {
    throw new Error(`Integrity failure: ${rel} hashes to ${actual}, expected ${expected}`);
  }
  return buf;
}

/**
 * Drop the bytes for a digest, but only when nothing else is filed under it.
 *
 * The store is deduplicated: the same file uploaded twice is one object on
 * disk referenced by two records. Deleting a document must therefore never
 * delete its bytes on the strength of that document alone, or removing one
 * copy silently empties the other — and the survivor still passes its own
 * metadata checks, so it looks intact right up until somebody opens it.
 *
 * `keepDocumentId` is the row being deleted, excluded from the count because
 * the caller has not committed its removal yet.
 */
export async function releaseBytes(digest: string, keepDocumentId: string): Promise<boolean> {
  const others = await prisma.controlledDocument.count({
    where: { sha256: digest, id: { not: keepDocumentId } },
  });
  if (others > 0) return false;

  try {
    await unlink(join(root(), storagePath(digest)));
    return true;
  } catch {
    // Already gone. The record is what matters, and it is going anyway.
    return false;
  }
}

/** The zone a document's department maps to, for the access matrix. */
const DEPARTMENT_ZONE: Record<string, Zone> = {
  GOV: "01_GROUP_GOVERNANCE",
  LRC: "05_LEGAL_RISK_COMPLIANCE",
  COM: "06_COMMERCIAL",
  DEL: "07_DELIVERY_AND_PROJECTS",
  FIN: "08_FINANCE_AND_PROCUREMENT",
  TEC: "09_PRODUCTS_AND_TECHNOLOGY",
  MKT: "10_MARKETING_AND_BRAND",
  OPS: "11_OPERATIONS_AND_ADMIN",
  PEO: "04_PEOPLE_AND_ORGANIZATION",
};

export type DocRecord = {
  id: string;
  docId: string;
  ownerId: string;
  custodianId: string | null;
  entityId: string | null;
  departmentId: string | null;
  confidentiality: string;
  state: string;
};

/**
 * Whether this viewer may perform this operation on this document.
 *
 * Three gates, all of which must pass, and they check different things:
 *
 *   1. Does the role hold the verb at all? A contractor has no `approve`,
 *      whatever the record is.
 *   2. Does the access matrix give the role anything in this zone? An employee
 *      gets nothing in 01_GROUP_GOVERNANCE regardless of who owns the record.
 *   3. Does the record-level rule allow it? Classification, need-to-know, and
 *      the explicit group that RESTRICTED requires.
 *
 * Collapsing any two of these would lose a real distinction.
 */
export function mayActOnDocument(v: Viewer, d: DocRecord, op: Operation): { ok: boolean; reason?: string } {
  if (!roleCan(v.role, op)) {
    return { ok: false, reason: `Your role does not hold "${op}".` };
  }

  const zone = d.departmentId ? DEPARTMENT_ZONE[d.departmentId] : undefined;
  if (zone) {
    const grant = zoneGrant(v.role, zone);
    if (!grantAllowsRead(grant)) {
      return { ok: false, reason: `You have no access to ${zone}.` };
    }
  }

  const readable = canRead(v, {
    ownerId: d.ownerId,
    assigneeId: d.custodianId,
    entityId: d.entityId,
    departmentId: d.departmentId,
    confidentiality: d.confidentiality as never,
    // RESTRICTED needs an explicit group. Owner and custodian are the named
    // people on a controlled document.
    accessList: [d.ownerId, d.custodianId].filter(Boolean) as string[],
  });
  if (!readable) return { ok: false, reason: "You are not named on that record." };

  return { ok: true };
}

/** Documents this viewer may know exist. */
export async function visibleDocuments(v: Viewer, limit = 200) {
  const rows = await prisma.controlledDocument.findMany({
    where: { state: { not: "DELETED" } },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: { owner: { select: { name: true } } },
  });

  // Filtered per row rather than in the query: the rules are in one tested
  // place, and a `where` clause that approximates them is how a leak happens.
  return rows.filter((d) => mayActOnDocument(v, d as unknown as DocRecord, "discover").ok);
}

export async function readableDocument(v: Viewer, id: string) {
  const d = await prisma.controlledDocument.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true } },
      custodian: { select: { id: true, name: true } },
      events: { orderBy: { at: "desc" }, take: 30 },
      supersedes: { select: { id: true, docId: true, versionMajor: true, versionMinor: true } },
    },
  });
  if (!d) return null;
  return mayActOnDocument(v, d as unknown as DocRecord, "read").ok ? d : null;
}

/** Next sequence number for an entity/department/type/year. */
export async function nextSequence(entityId: string, departmentId: string, docType: string, year: number) {
  const last = await prisma.controlledDocument.findFirst({
    where: { entityId, departmentId, docType, year },
    orderBy: { sequence: "desc" },
    select: { sequence: true },
  });
  return (last?.sequence ?? 0) + 1;
}

export const canSeeZone = (v: Viewer, zone: Zone) =>
  isGroupWide(v.role) || grantAllowsRead(zoneGrant(v.role, zone));

/** Formats whose bytes are text we can search without parsing anything. */
const SEARCHABLE_TEXT = ["text/markdown", "text/plain", "text/csv", "application/json", "application/yaml"];

/**
 * Search the documents a viewer may see.
 *
 * Metadata first — that is free and covers most searches. Content is only read
 * for plain-text formats, and only for records that did not already match, so
 * a search never opens more files than it has to. PDFs and Office documents
 * are excluded: extracting their text needs a parser, and a parser is an
 * attack surface pointed at files people upload.
 *
 * The candidate set is filtered by permission before any byte is read, so a
 * search can never confirm the contents of a record the searcher cannot open.
 */
export async function searchDocuments(v: Viewer, query: string, limit = 100) {
  const q = query.trim().toLowerCase();
  const all = await visibleDocuments(v, 500);
  if (!q) return all.slice(0, limit);

  const matched: typeof all = [];
  const rest: typeof all = [];
  for (const d of all) {
    const haystack = `${d.docId} ${d.title} ${d.shortTitle} ${d.docType}`.toLowerCase();
    (haystack.includes(q) ? matched : rest).push(d);
  }

  for (const d of rest) {
    if (matched.length >= limit) break;
    if (!d.storagePath || !d.sha256) continue;
    if (!SEARCHABLE_TEXT.includes(d.mimeType ?? "")) continue;
    // Reading a large file to find a short string is not worth it.
    if ((d.sizeBytes ?? 0) > 2_000_000) continue;
    try {
      const buf = await getBytes(d.storagePath, d.sha256);
      if (buf.toString("utf8").toLowerCase().includes(q)) matched.push(d);
    } catch {
      // An unreadable or corrupted file is reported by the download path, not
      // silently surfaced as a search hit.
    }
  }

  return matched.slice(0, limit);
}
