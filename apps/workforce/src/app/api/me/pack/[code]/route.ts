import { prisma } from "@app/db";
import { memberOr401 } from "@/lib/guard";
import { nextSequence, putBytes } from "@/lib/documents";
import {
  DOC_TYPE_INFO,
  documentId,
  requiredDocumentsForRole,
  uploadProblem,
  type DocType,
  type GmRole,
} from "@app/core";

export const dynamic = "force-dynamic";

/**
 * Supply a document against one of your own pack requirements.
 *
 * 61 items sat at MISSING because the requirements existed and there was
 * nowhere to put anything. This is that missing half.
 *
 * The upload lands as PROVIDED, never VERIFIED. Somebody uploading a file is
 * not somebody in HR having looked at it, and for a right-to-work check that
 * difference is the entire control.
 */
export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const auth = await memberOr401();
  if (!auth) return new Response(null, { status: 303, headers: { Location: "/" } });

  const { code } = await ctx.params;
  const url = new URL("/me", req.url);
  const fail = (m: string) => {
    url.searchParams.set("error", m);
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  };

  const record = await prisma.employeeRecord.findUnique({
    where: { memberId: auth.member.id },
    select: { employmentType: true },
  });
  const required = requiredDocumentsForRole(
    auth.member.role as GmRole,
    record?.employmentType ?? "FULL_TIME"
  );
  const requirement = required.find((r) => r.code === code);
  // Only against a requirement this person actually has. Otherwise the route
  // is a general-purpose uploader that writes RESTRICTED records.
  if (!requirement) return fail("That is not one of your document requirements.");

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail("Choose a file.");

  const buf = Buffer.from(await file.arrayBuffer());
  const problem = uploadProblem({
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: buf.byteLength,
    head: new Uint8Array(buf.subarray(0, 8)),
  });
  if (problem) return fail(problem);

  const stored = await putBytes(buf);

  const entityId = auth.member.entityId ?? "ORG-ES";
  const departmentId = "PEO";
  const docType: DocType = requirement.docType;
  const year = new Date().getFullYear();
  const sequence = await nextSequence(entityId, departmentId, docType, year);

  // The custodian is People; the owner is the person it concerns. Both are
  // named, which is what RESTRICTED requires before anybody can open it.
  const hrLead = await prisma.teamMember.findFirst({
    where: { departmentId: "PEO", status: "ACTIVE" },
    select: { id: true },
  });

  const doc = await prisma.controlledDocument.create({
    data: {
      docId: documentId({ entityId: entityId as never, departmentId, docType, year, sequence }),
      title: `${requirement.name} — ${auth.member.name}`,
      shortTitle: requirement.code,
      entityId,
      departmentId,
      docType,
      year,
      sequence,
      ownerRole: auth.member.role,
      ownerId: auth.member.id,
      custodianId: hrLead?.id ?? null,
      confidentiality: requirement.classification,
      retentionClass: DOC_TYPE_INFO[docType].defaultRetention,
      storagePath: stored.path,
      sha256: stored.sha256,
      sizeBytes: buf.byteLength,
      mimeType: file.type,
      state: "DRAFT",
    },
  });

  await prisma.$transaction([
    prisma.employeeDocument.update({
      where: { memberId_code: { memberId: auth.member.id, code } },
      data: { status: "PROVIDED", documentId: doc.id, providedAt: new Date() },
    }),
    prisma.documentEvent.create({
      data: {
        documentId: doc.id,
        actorKind: "HUMAN",
        actorRef: auth.member.id,
        actorName: auth.member.name,
        action: "supplied_for_requirement",
        toState: "DRAFT",
        note: `Supplied against ${requirement.code}. Awaiting verification by People.`,
      },
    }),
  ]);

  url.searchParams.set("saved", "1");
  return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
}
