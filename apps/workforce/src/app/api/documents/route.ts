import { prisma } from "@app/db";
import { memberOr401 } from "@/lib/guard";
import { nextSequence, putBytes } from "@/lib/documents";
import {
  DOC_TYPE_INFO,
  documentId,
  roleCan,
  shortTitleProblem,
  uploadProblem,
  type DocType,
} from "@app/core";

export const dynamic = "force-dynamic";

/**
 * Upload a controlled document.
 *
 * The bytes are validated before anything is written: extension, declared type,
 * size, and the first bytes against the format's signature. A record is only
 * created once the file is on disk under its own digest, so there is never a
 * register entry pointing at nothing.
 */
export async function POST(req: Request) {
  const auth = await memberOr401();
  if (!auth) return new Response(null, { status: 303, headers: { Location: "/" } });

  const url = new URL("/documents", req.url);
  const fail = (m: string) => {
    url.searchParams.set("error", m);
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  };

  if (!roleCan(auth.member.role, "create")) return fail("Your role cannot add documents.");

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail("Choose a file.");

  const title = String(form.get("title") || "").trim();
  const shortTitle = String(form.get("shortTitle") || "").trim();
  const docType = String(form.get("docType") || "") as DocType;
  const entityId = String(form.get("entityId") || auth.member.entityId || "ORG-ES");
  const departmentId = String(form.get("departmentId") || auth.member.departmentId || "OPS");
  const confidentiality = String(form.get("confidentiality") || "CONFIDENTIAL");

  if (!title) return fail("Give the document a title.");
  if (!DOC_TYPE_INFO[docType]) return fail("Choose a document type.");

  const shortProblem = shortTitleProblem(shortTitle || title);
  if (shortProblem) return fail(shortProblem);

  // The folder the uploader was browsing. Validated against the declared
  // locations rather than trusted: it becomes a stored path.
  const requested = String(form.get("sourcePath") || "").trim();
  const folder = requested
    ? await prisma.repositoryFolder.findUnique({ where: { path: requested }, select: { path: true } })
    : null;
  if (requested && !folder) return fail("That folder does not exist.");
  const sourcePath = folder?.path ?? "";
  // The filename is a person's, so it is rebuilt rather than interpolated.
  const safeFilename = file.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(-120) || "upload";

  const buf = Buffer.from(await file.arrayBuffer());
  const problem = uploadProblem({
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: buf.byteLength,
    head: new Uint8Array(buf.subarray(0, 8)),
  });
  if (problem) return fail(problem);

  const stored = await putBytes(buf);

  const year = new Date().getFullYear();
  const sequence = await nextSequence(entityId, departmentId, docType, year);
  const docIdValue = documentId({
    entityId: entityId as never,
    departmentId: departmentId as never,
    docType,
    year,
    sequence,
  });

  const created = await prisma.controlledDocument.create({
    data: {
      docId: docIdValue,
      title,
      shortTitle: shortTitle || title,
      entityId,
      departmentId,
      docType,
      year,
      sequence,
      ownerRole: auth.member.role,
      ownerId: auth.member.id,
      confidentiality: confidentiality as never,
      retentionClass: DOC_TYPE_INFO[docType].defaultRetention,
      storagePath: stored.path,
      sha256: stored.sha256,
      sizeBytes: buf.byteLength,
      mimeType: file.type,
      state: "DRAFT",
      // Where it is filed. Uploads previously set nothing here, so the
      // repository — which locates documents by relatedIds.sourcePath — never
      // showed a single uploaded file; they existed only in the flat register.
      relatedIds: sourcePath ? { sourcePath: `${sourcePath}/${safeFilename}` } : undefined,
    },
  });

  await prisma.documentEvent.create({
    data: {
      documentId: created.id,
      actorKind: "HUMAN",
      actorRef: auth.member.id,
      actorName: auth.member.name,
      action: "uploaded",
      toState: "DRAFT",
      note: stored.deduped
        ? `Uploaded ${file.name}. Identical content already held — stored once.`
        : `Uploaded ${file.name} (${buf.byteLength} bytes).`,
      meta: { sha256: stored.sha256, deduped: stored.deduped },
    },
  });

  // Back to the folder when the upload came from one, so the file is visible
  // where it was put rather than on a page the uploader has to navigate from.
  if (sourcePath) {
    const q = new URLSearchParams({ path: sourcePath, done: `Added ${title}.` });
    return new Response(null, { status: 303, headers: { Location: `/repository?${q.toString()}` } });
  }
  return new Response(null, { status: 303, headers: { Location: `/documents/${created.id}` } });
}
