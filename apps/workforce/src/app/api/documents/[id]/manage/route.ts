import { prisma } from "@app/db";
import { memberOr401 } from "@/lib/guard";
import { releaseBytes } from "@/lib/documents";
import {
  fileDeleteProblem,
  folderNameProblem,
  isSelfOrDescendant,
  mayEditRepository,
  shortTitleProblem,
} from "@app/core";

export const dynamic = "force-dynamic";

/**
 * Administering a file: retitle, move between folders, delete.
 *
 * Deletion is split by state rather than granted flat. A draft in the wrong
 * folder is working material and goes in one action; anything that reached
 * APPROVED is a controlled record, and document_lifecycle.yaml requires a
 * retention check and two distinct authorisers before it can go. Being an
 * administrator does not make that shortcut safe — it is the control that makes
 * the register worth keeping — so those keep the archive-then-dispose route.
 * Legal hold stops both. The reasoning lives in fileDeleteProblem.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await memberOr401();
  if (!auth) return new Response(null, { status: 303, headers: { Location: "/" } });

  const { id } = await ctx.params;
  const form = await req.formData();
  const action = String(form.get("action") || "");
  const back = String(form.get("back") || "");

  const toRepository = (params: Record<string, string>) => {
    const q = new URLSearchParams();
    if (back) q.set("path", back);
    for (const [k, v] of Object.entries(params)) q.set(k, v);
    return new Response(null, { status: 303, headers: { Location: `/repository?${q.toString()}` } });
  };
  const toDocument = (params: Record<string, string>) => {
    const q = new URLSearchParams(params);
    return new Response(null, { status: 303, headers: { Location: `/documents/${id}?${q.toString()}` } });
  };
  const fail = (m: string) => (back ? toRepository({ error: m }) : toDocument({ error: m }));

  if (!mayEditRepository(auth.member)) {
    return fail("Only administrators can manage files in the repository.");
  }

  const doc = await prisma.controlledDocument.findUnique({
    where: { id },
    select: {
      id: true,
      docId: true,
      title: true,
      shortTitle: true,
      state: true,
      legalHold: true,
      sha256: true,
      relatedIds: true,
    },
  });
  if (!doc) return fail("That record no longer exists.");

  const related = (doc.relatedIds ?? {}) as { sourcePath?: string };

  if (action === "rename") {
    const title = String(form.get("title") || "").trim();
    const shortTitle = String(form.get("shortTitle") || "").trim();
    if (!title) return fail("Give the document a title.");

    const problem = shortTitleProblem(shortTitle || title);
    if (problem) return fail(problem);

    await prisma.$transaction([
      prisma.controlledDocument.update({
        where: { id },
        data: { title, shortTitle: shortTitle || title },
      }),
      prisma.documentEvent.create({
        data: {
          documentId: id,
          actorKind: "HUMAN",
          actorRef: auth.member.id,
          actorName: auth.member.name,
          action: "retitled",
          note: `"${doc.title}" renamed to "${title}".`,
        },
      }),
    ]);
    return back ? toRepository({ done: "Renamed." }) : toDocument({ done: "1" });
  }

  if (action === "move") {
    const destination = String(form.get("destination") || "").trim();
    if (!destination) return fail("Choose a folder to move it to.");

    const folder = await prisma.repositoryFolder.findUnique({ where: { path: destination } });
    if (!folder) return fail("That folder no longer exists.");

    // The stored path carries the filename; only the folder part changes.
    const filename = related.sourcePath?.split("/").slice(-1)[0] ?? `${doc.docId}`;
    const nameIssue = folderNameProblem(filename.replace(/\.[^.]+$/, ""));
    // A filename that predates these rules should not block a move — it is the
    // destination being validated here, not the historical name.
    const safeName = nameIssue ? doc.docId : filename;
    const next = `${destination}/${safeName}`;

    await prisma.$transaction([
      prisma.controlledDocument.update({
        where: { id },
        data: { relatedIds: { ...related, sourcePath: next } },
      }),
      prisma.documentEvent.create({
        data: {
          documentId: id,
          actorKind: "HUMAN",
          actorRef: auth.member.id,
          actorName: auth.member.name,
          action: "refiled",
          note: `Moved from ${related.sourcePath ?? "(unfiled)"} to ${next}.`,
        },
      }),
    ]);
    return toRepository({ done: "Moved.", path: destination });
  }

  if (action === "delete") {
    const problem = fileDeleteProblem({ state: doc.state, legalHold: doc.legalHold });
    if (problem) return fail(problem);

    // The event is written first and deliberately survives: DocumentEvent
    // cascades on delete, so the record of the deletion would go with the row
    // it describes. This copy is filed against the folder instead.
    await prisma.folderEvent.create({
      data: {
        path: (related.sourcePath ?? "").split("/").slice(0, -1).join("/"),
        action: "document_deleted",
        actorId: auth.member.id,
        actorName: auth.member.name,
        detail: `${doc.docId} — "${doc.title}" (${doc.state.toLowerCase()}) deleted.`,
      },
    });

    const purged = await releaseBytes(doc.sha256 ?? "", id);
    await prisma.controlledDocument.delete({ where: { id } });

    return toRepository({
      done: purged ? "Deleted." : "Deleted. The stored bytes are still referenced by another record.",
    });
  }

  return fail("Unknown action.");
}
