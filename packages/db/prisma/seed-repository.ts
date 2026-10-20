/**
 * Import the controlled repository into the document register.
 *
 * Reads the extracted v1.2 tree, files every real document into the register
 * with classification, owner and entity metadata, and records what it could not
 * classify rather than guessing.
 *
 * Placeholders are not documents. The tree is mostly `.keep` files marking
 * controlled locations in the information architecture — §4 of the deployment
 * prompt says explicitly not to treat them as errors — so they are counted and
 * skipped, not imported and not reported as failures.
 *
 *   GMOS_TREE=/srv/app/staging/... npm --workspace @app/db run seed:repository
 */
import { createHash } from "crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "fs/promises";
import { dirname, extname, join, relative } from "path";
import { PrismaClient } from "@prisma/client";
import {
  DEPARTMENT_IDS,
  DOC_TYPE_INFO,
  documentId,
  normaliseShortTitle,
  storagePath,
  type DepartmentId,
  type DocType,
} from "@app/core";

const prisma = new PrismaClient();

const TREE = process.env.GMOS_TREE || "/srv/app/staging/gmos-v1.2/unskinned-core";
const DOC_ROOT = process.env.DOCUMENT_ROOT || "/data/documents";

/** Zone to the department that owns it, from access_matrix.csv data owners. */
const ZONE_DEPARTMENT: Record<string, DepartmentId> = {
  "00_SYSTEM": "GOV",
  "01_GROUP_GOVERNANCE": "GOV",
  "02_LEGAL_ENTITIES": "LRC",
  "03_STRATEGY_AND_PORTFOLIO": "GOV",
  "04_PEOPLE_AND_ORGANIZATION": "PEO",
  "05_LEGAL_RISK_COMPLIANCE": "LRC",
  "06_COMMERCIAL": "COM",
  "07_DELIVERY_AND_PROJECTS": "DEL",
  "08_FINANCE_AND_PROCUREMENT": "FIN",
  "09_PRODUCTS_AND_TECHNOLOGY": "TEC",
  "10_MARKETING_AND_BRAND": "MKT",
  "11_OPERATIONS_AND_ADMIN": "OPS",
  "12_INBOX_AND_QUARANTINE": "OPS",
  "13_TEMPLATES": "GOV",
  "14_RECORDS_AND_ARCHIVE": "GOV",
  "15_EXAMPLES": "GOV",
  "16_REFERENCE_BLUEPRINT": "GOV",
};

/** Document type from the filename, else the zone's usual output. */
function inferType(name: string, zone: string): DocType {
  const n = name.toUpperCase();
  if (n.startsWith("POL-") || n.includes("POLICY")) return "POL";
  if (n.includes("SOP") || n.includes("PROCEDURE")) return "SOP";
  if (n.includes("RUNBOOK")) return "SOP";
  if (n.includes("ADR-") || n.includes("DECISION")) return "DEC";
  if (n.includes("MINUTES")) return "MIN";
  if (n.includes("CONTRACT") || n.includes("AGREEMENT")) return "CTR";
  if (n.includes("INVOICE")) return "INV";
  if (zone === "04_PEOPLE_AND_ORGANIZATION") return "HRF";
  if (zone === "09_PRODUCTS_AND_TECHNOLOGY" || zone === "00_SYSTEM") return "TEC";
  if (zone === "10_MARKETING_AND_BRAND") return "MKT";
  if (zone === "07_DELIVERY_AND_PROJECTS") return "PRJ";
  return "POL";
}

/** Kept in step with ALLOWED_MIME in @app/core — a narrower table here silently
 *  drops real documents, which is exactly what happened on the first run. */
const MIME: Record<string, string> = {
  ".md": "text/markdown",
  ".csv": "text/csv",
  ".json": "application/json",
  ".jsonl": "application/json",
  ".yaml": "application/yaml",
  ".yml": "application/yaml",
  ".txt": "text/plain",
  ".log": "text/plain",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else yield p;
  }
}

async function main() {
  const owner = await prisma.teamMember.findFirst({ where: { role: "CEO" } });
  if (!owner) throw new Error("no CEO to own imported records");

  let imported = 0;
  let placeholders = 0;
  let deduped = 0;
  let skipped: string[] = [];
  const sequences = new Map<string, number>();

  for await (const abs of walk(TREE)) {
    const rel = relative(TREE, abs).replace(/\\/g, "/");
    const base = rel.split("/").pop()!;

    // Controlled placeholders, not content. §4: not an error.
    if (base === ".keep" || base === ".gitignore") {
      placeholders++;
      continue;
    }

    const ext = extname(base).toLowerCase();
    const mimeType = MIME[ext];
    if (!mimeType) {
      skipped.push(`${rel} — no accepted type for ${ext || "(no extension)"}`);
      continue;
    }

    // A file at the tree root has no zone segment — its first path element is
    // its own filename. README, CHANGELOG and the manifests are system records.
    const segments = rel.split("/");
    const zone = segments.length > 1 ? segments[0] : "00_SYSTEM";
    const departmentId = ZONE_DEPARTMENT[zone];
    if (!departmentId || !(DEPARTMENT_IDS as readonly string[]).includes(departmentId)) {
      skipped.push(`${rel} — zone "${zone}" maps to no department`);
      continue;
    }

    const buf = await readFile(abs);
    const sha256 = createHash("sha256").update(buf).digest("hex");

    // Already in the register? Content-addressed, so identical bytes are one
    // record however many paths they appear under.
    const existing = await prisma.controlledDocument.findFirst({ where: { sha256 } });
    if (existing) {
      deduped++;
      continue;
    }

    const storeRel = storagePath(sha256);
    const storeAbs = join(DOC_ROOT, storeRel);
    await mkdir(dirname(storeAbs), { recursive: true });
    try {
      await stat(storeAbs);
    } catch {
      await writeFile(storeAbs, buf, { mode: 0o640 });
    }

    const docType = inferType(base, zone);
    const year = new Date().getFullYear();
    const key = `ORG-ES|${departmentId}|${docType}|${year}`;
    if (!sequences.has(key)) {
      const last = await prisma.controlledDocument.findFirst({
        where: { entityId: "ORG-ES", departmentId, docType, year },
        orderBy: { sequence: "desc" },
        select: { sequence: true },
      });
      sequences.set(key, last?.sequence ?? 0);
    }
    const sequence = sequences.get(key)! + 1;
    sequences.set(key, sequence);

    const title = base.replace(ext, "").replace(/[_-]+/g, " ").trim();

    await prisma.controlledDocument.create({
      data: {
        docId: documentId({ entityId: "ORG-ES", departmentId, docType, year, sequence }),
        title,
        shortTitle: normaliseShortTitle(title).slice(0, 60) || "Record",
        entityId: "ORG-ES",
        departmentId,
        docType,
        year,
        sequence,
        ownerRole: "CEO",
        ownerId: owner.id,
        // §9: unknown or unclassified content defaults to Confidential until
        // reviewed. Nothing here has been reviewed, so nothing is lower.
        confidentiality: "CONFIDENTIAL",
        retentionClass: DOC_TYPE_INFO[docType].defaultRetention,
        storagePath: storeRel,
        sha256,
        sizeBytes: buf.byteLength,
        mimeType,
        language: "EN",
        state: "DRAFT",
        relatedIds: { sourcePath: rel },
      },
    });
    imported++;
  }

  console.log(`[repo] imported     : ${imported}`);
  console.log(`[repo] placeholders : ${placeholders} (.keep — controlled locations, not documents)`);
  console.log(`[repo] deduplicated : ${deduped} (identical content already in the register)`);
  console.log(`[repo] skipped      : ${skipped.length}`);
  for (const s of skipped.slice(0, 15)) console.log(`         ${s}`);
  if (skipped.length > 15) console.log(`         …and ${skipped.length - 15} more`);

  const total = await prisma.controlledDocument.count();
  console.log(`[repo] register now holds ${total} document(s)`);
}

main()
  .catch((e) => {
    console.error("[repo] import failed", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
