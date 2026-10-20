import { prisma } from "@app/db";
import { memberOr401 } from "@/lib/guard";
import {
  childPath,
  folderCreateProblem,
  folderDeleteProblem,
  folderMoveProblem,
  isSelfOrDescendant,
  mayEditRepository,
  parentOf,
  rewriteDescendant,
  zoneOf,
} from "@app/core";

export const dynamic = "force-dynamic";

/**
 * Administering the folder structure: create, rename, move, delete.
 *
 * The tree is data, not directories — RepositoryFolder holds the controlled
 * locations and documents carry their path in relatedIds.sourcePath. So a move
 * is a rewrite of both, in one transaction: doing the folders first and the
 * documents second would leave every file in the subtree pointing at a path
 * that no longer exists, and they would simply stop appearing.
 */
export async function POST(req: Request) {
  const auth = await memberOr401();
  if (!auth) return new Response(null, { status: 303, headers: { Location: "/" } });

  const form = await req.formData();
  const action = String(form.get("action") || "");
  const back = String(form.get("back") || "");

  const to = (params: Record<string, string>) => {
    const q = new URLSearchParams();
    if (back) q.set("path", back);
    for (const [k, v] of Object.entries(params)) q.set(k, v);
    return new Response(null, { status: 303, headers: { Location: `/repository?${q.toString()}` } });
  };
  const fail = (m: string) => to({ error: m });

  if (!mayEditRepository(auth.member)) {
    return fail("Only administrators can change the folder structure.");
  }

  const folders = await prisma.repositoryFolder.findMany({ select: { id: true, path: true } });
  const existingPaths = folders.map((f) => f.path);

  if (action === "create") {
    const parentPath = String(form.get("parentPath") || "");
    const name = String(form.get("name") || "");

    const problem = folderCreateProblem({ parentPath, name, existingPaths });
    if (problem) return fail(problem);

    const path = childPath(parentPath, name.trim());
    await prisma.$transaction([
      prisma.repositoryFolder.create({
        data: {
          path,
          name: name.trim(),
          zone: zoneOf(path) ?? "",
          depth: path.split("/").length - 1,
          purpose: String(form.get("purpose") || "").trim().slice(0, 300) || null,
        },
      }),
      prisma.folderEvent.create({
        data: { path, action: "created", actorId: auth.member.id, actorName: auth.member.name },
      }),
    ]);
    return to({ done: `Created ${name.trim()}.`, path });
  }

  if (action === "rename") {
    const from = String(form.get("path") || "");
    const name = String(form.get("name") || "");
    // Absent means "rename in place"; present means "move".
    const toParent = form.has("toParent") ? String(form.get("toParent") || "") : (parentOf(from) ?? "");

    const subtree = existingPaths.filter((p) => isSelfOrDescendant(p, from));
    const deepestDescendant = subtree.reduce((a, b) => (b.split("/").length > a.split("/").length ? b : a), from);

    const problem = folderMoveProblem({ from, toParent, name, existingPaths, deepestDescendant });
    if (problem) return fail(problem);

    const target = childPath(toParent, name.trim());

    // Every document filed at or under `from`. Located by prefix on the stored
    // path, then filtered exactly, because a LIKE prefix would also match a
    // sibling whose name merely begins with the same characters.
    const docs = await prisma.controlledDocument.findMany({
      where: { relatedIds: { path: ["sourcePath"], string_starts_with: from } },
      select: { id: true, relatedIds: true },
    });

    const moves = folders
      .filter((f) => isSelfOrDescendant(f.path, from))
      .map((f) => {
        const next = rewriteDescendant(f.path, from, target);
        return prisma.repositoryFolder.update({
          where: { id: f.id },
          data: {
            path: next,
            name: next.split("/").slice(-1)[0],
            zone: zoneOf(next) ?? "",
            depth: next.split("/").length - 1,
          },
        });
      });

    const refiles = docs
      .map((d) => {
        const related = (d.relatedIds ?? {}) as { sourcePath?: string };
        const current = related.sourcePath;
        if (!current) return null;
        // The document's own path includes its filename, so compare on the
        // folder it sits in.
        const dir = current.split("/").slice(0, -1).join("/");
        if (!isSelfOrDescendant(dir, from)) return null;
        return prisma.controlledDocument.update({
          where: { id: d.id },
          data: { relatedIds: { ...related, sourcePath: rewriteDescendant(current, from, target) } },
        });
      })
      .filter((op): op is NonNullable<typeof op> => op !== null);

    await prisma.$transaction([
      ...moves,
      ...refiles,
      prisma.folderEvent.create({
        data: {
          path: target,
          action: "renamed",
          actorId: auth.member.id,
          actorName: auth.member.name,
          detail: `${from} -> ${target}${refiles.length ? ` (${refiles.length} document(s) refiled)` : ""}`,
        },
      }),
    ]);
    return to({ done: `Moved to ${target}.`, path: target });
  }

  if (action === "delete") {
    const path = String(form.get("path") || "");

    const childFolders = existingPaths.filter((p) => p !== path && isSelfOrDescendant(p, path)).length;
    const documents = await prisma.controlledDocument.count({
      where: {
        relatedIds: { path: ["sourcePath"], string_starts_with: `${path}/` },
        state: { not: "DELETED" },
      },
    });

    const problem = folderDeleteProblem({ path, childFolders, documents, existingPaths });
    if (problem) return fail(problem);

    await prisma.$transaction([
      prisma.repositoryFolder.deleteMany({ where: { path } }),
      prisma.folderEvent.create({
        data: { path, action: "deleted", actorId: auth.member.id, actorName: auth.member.name },
      }),
    ]);
    return to({ done: `Deleted ${path.split("/").slice(-1)[0]}.`, path: parentOf(path) ?? "" });
  }

  return fail("Unknown action.");
}
