import { prisma } from "@app/db";
import { memberOr401 } from "@/lib/guard";
import { mayActOnDocument, putBytes, type DocRecord } from "@/lib/documents";
import { nextVersion, replaceProblem, uploadProblem } from "@app/core";

export const dynamic = "force-dynamic";

/**
 * Supersede a record with a new version.
 *
 * An approved version is never overwritten. The new bytes become a new row that
 * supersedes the old one, and the old one is marked SUPERSEDED rather than
 * changed — so the version that was approved is still the version that was
 * approved, and the chain back through it survives.
 *
 * Appendix B: "No approved document overwritten; revisions create a new
 * controlled version."
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await memberOr401();
  if (!auth) return new Response(null, { status: 303, headers: { Location: "/" } });

  const { id } = await ctx.params;
  const url = new URL(`/documents/${id}`, req.url);
  const fail = (m: string) => {
    url.searchParams.set("error", m);
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  };

  const doc = await prisma.controlledDocument.findUnique({ where: { id } });
  if (!doc) return fail("That record no longer exists.");

  if (!mayActOnDocument(auth.viewer, doc as unknown as DocRecord, "edit").ok) {
    return fail("You cannot revise this record.");
  }

  const problem = replaceProblem({ state: doc.state, legalHold: doc.legalHold });
  if (problem) return fail(problem);

  const form = await req.formData();
  const file = form.get("file");
  const note = String(form.get("note") || "").trim().slice(0, 300);
  if (!(file instanceof File)) return fail("Choose the replacement file.");

  const buf = Buffer.from(await file.arrayBuffer());
  const uploadIssue = uploadProblem({
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: buf.byteLength,
    head: new Uint8Array(buf.subarray(0, 8)),
  });
  if (uploadIssue) return fail(uploadIssue);

  const stored = await putBytes(buf);
  if (stored.sha256 === doc.sha256) {
    // Identical content is not a new version. Recording one would put a
    // meaningless entry in a history somebody may later have to rely on.
    return fail("That file is byte-for-byte identical to the current version.");
  }

  // A revision moves the minor; approval later moves the major.
  const v = nextVersion(
    { versionMajor: doc.versionMajor, versionMinor: doc.versionMinor },
    "revision"
  );

  const created = await prisma.controlledDocument.create({
    data: {
      // Same identifier: the docId names the record, not the version. The
      // sequence and unique constraint are on entity/department/type/year, so
      // the new row takes the next sequence to stay within it.
      docId: `${doc.docId}-v${v.versionMajor}.${v.versionMinor}`,
      title: doc.title,
      shortTitle: doc.shortTitle,
      entityId: doc.entityId,
      departmentId: doc.departmentId,
      docType: doc.docType,
      year: doc.year,
      sequence: (await nextSeq(doc.entityId, doc.departmentId, doc.docType, doc.year)),
      ownerRole: doc.ownerRole,
      ownerId: doc.ownerId,
      custodianId: doc.custodianId,
      confidentiality: doc.confidentiality,
      retentionClass: doc.retentionClass,
      storagePath: stored.path,
      sha256: stored.sha256,
      sizeBytes: buf.byteLength,
      mimeType: file.type,
      language: doc.language,
      versionMajor: v.versionMajor,
      versionMinor: v.versionMinor,
      state: "DRAFT",
      supersedesId: doc.id,
      relatedIds: doc.relatedIds ?? undefined,
    },
  });

  await prisma.$transaction([
    prisma.controlledDocument.update({ where: { id: doc.id }, data: { state: "SUPERSEDED" } }),
    prisma.documentEvent.create({
      data: {
        documentId: doc.id,
        actorKind: "HUMAN",
        actorRef: auth.member.id,
        actorName: auth.member.name,
        action: "superseded",
        fromState: doc.state,
        toState: "SUPERSEDED",
        note: `Replaced by v${v.versionMajor}.${v.versionMinor}.${note ? ` ${note}` : ""}`,
      },
    }),
    prisma.documentEvent.create({
      data: {
        documentId: created.id,
        actorKind: "HUMAN",
        actorRef: auth.member.id,
        actorName: auth.member.name,
        action: "new_version",
        toState: "DRAFT",
        note: `v${v.versionMajor}.${v.versionMinor}, superseding ${doc.docId}.${note ? ` ${note}` : ""}`,
      },
    }),
  ]);

  return new Response(null, { status: 303, headers: { Location: `/documents/${created.id}` } });
}

async function nextSeq(entityId: string, departmentId: string, docType: string, year: number) {
  const last = await prisma.controlledDocument.findFirst({
    where: { entityId, departmentId, docType, year },
    orderBy: { sequence: "desc" },
    select: { sequence: true },
  });
  return (last?.sequence ?? 0) + 1;
}
