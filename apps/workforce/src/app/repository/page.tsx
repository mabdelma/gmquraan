import Link from "next/link";
import { prisma } from "@app/db";
import { requireMember } from "@/lib/guard";
import { visibleDocuments } from "@/lib/documents";
import { Shell } from "@/components/Shell";
import {
  breadcrumbs,
  buildFolderTree,
  fileDeleteProblem,
  findFolder,
  humanFolder,
  mayEditRepository,
  visibleChildren,
  zoneGrant,
  grantAllowsRead,
  type Zone,
} from "@app/core";
import { FileControls, FolderControls, NewFolderPanel } from "@/components/RepositoryAdmin";

export const dynamic = "force-dynamic";

/**
 * The repository, browsed as folders.
 *
 * The tree is derived, not stored twice: controlled locations come from
 * RepositoryFolder, documents from the register, and the nesting is computed.
 * There is no second copy of the hierarchy on disk to drift out of step with
 * the metadata.
 *
 * §13: users should not see folders they cannot access. A branch containing
 * nothing this viewer may see is hidden — except a location that is empty for
 * everybody, which is shown, because "declared and unused" is honest and
 * hiding it would misrepresent the architecture.
 */
export default async function RepositoryPage({
  searchParams,
}: {
  searchParams: Promise<{ path?: string; error?: string; done?: string }>;
}) {
  const { member, viewer } = await requireMember();
  const sp = await searchParams;
  const here = sp.path ?? "";
  const canEdit = mayEditRepository(member);

  const [folders, docs] = await Promise.all([
    prisma.repositoryFolder.findMany({ orderBy: { path: "asc" } }),
    visibleDocuments(viewer, 2000),
  ]);

  // Only folders in zones this role has any grant in. The access matrix is
  // consulted before the tree is built, so a hidden zone never appears even
  // as an empty location.
  const reachable = folders.filter((f) => grantAllowsRead(zoneGrant(member.role, f.zone as Zone)));

  const docPaths = docs
    .map((d) => (d.relatedIds as { sourcePath?: string } | null)?.sourcePath)
    .filter((p): p is string => Boolean(p));

  const tree = buildFolderTree(
    reachable.map((f) => f.path),
    docPaths
  );

  const node = findFolder(tree, here);
  if (!node) {
    return (
      <Shell member={member}>
        <p className="rounded-2xl px-5 py-8 text-sm panel [color:var(--muted)]">
          That folder does not exist, or contains nothing you are entitled to see.
        </p>
      </Shell>
    );
  }

  // A location with no documents at all — for anybody — is a declared but
  // unused part of the architecture and is shown as such.
  const totalByPath = new Map<string, number>();
  {
    const everything = buildFolderTree(
      folders.map((f) => f.path),
      []
    );
    const walk = (n: ReturnType<typeof findFolder>) => {
      if (!n) return;
      totalByPath.set(n.path, n.totalCount);
      n.children.forEach(walk);
    };
    walk(everything);
  }
  const emptyForEveryone = (p: string) => (totalByPath.get(p) ?? 0) === 0;

  const children = visibleChildren(node, emptyForEveryone);
  const filed = docs.filter((d) => {
    const p = (d.relatedIds as { sourcePath?: string } | null)?.sourcePath;
    if (!p) return false;
    const dir = p.split("/").slice(0, -1).join("/");
    return dir === here;
  });

  const trail = breadcrumbs(here);
  const purpose = reachable.find((f) => f.path === here)?.purpose;

  // Somewhere a folder or a file can be moved to. Offered from the locations
  // this viewer can already reach; the route re-checks, since a select is a
  // suggestion and not a permission.
  const destinations = reachable.map((f) => f.path).sort();

  return (
    <Shell member={member}>
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {here ? humanFolder(node.name) : "Repository"}
        </h1>
        <nav className="mt-2 flex flex-wrap items-center gap-1 text-sm [color:var(--muted)]">
          <Link href="/repository" className="[color:var(--accent-text)]">
            Root
          </Link>
          {trail.map((c) => (
            <span key={c.path} className="flex items-center gap-1">
              <span aria-hidden="true">/</span>
              <Link href={`/repository?path=${encodeURIComponent(c.path)}`} className="[color:var(--accent-text)]">
                {c.name}
              </Link>
            </span>
          ))}
        </nav>
        <p className="mt-2 text-sm [color:var(--muted)]">
          {node.totalCount} document{node.totalCount === 1 ? "" : "s"} here or below.
          {purpose ? ` ${purpose}` : ""}
        </p>
      </header>

      {sp.error && (
        <p role="alert" className="mb-4 rounded-2xl px-5 py-4 text-sm panel [color:var(--danger)]">
          {sp.error}
        </p>
      )}
      {sp.done && (
        <p role="status" className="mb-4 rounded-2xl px-5 py-4 text-sm panel [color:var(--ok)]">
          {sp.done}
        </p>
      )}

      {canEdit && <NewFolderPanel here={here} canAddFile={Boolean(here)} />}

      {children.length === 0 && filed.length === 0 && (
        <p className="rounded-2xl px-5 py-8 text-sm panel [color:var(--muted)]">
          This location is declared in the information architecture and holds nothing yet.
        </p>
      )}

      {children.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
            Folders
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {children.map((c) => (
              <li key={c.path}>
                <Link
                  href={`/repository?path=${encodeURIComponent(c.path)}`}
                  className="flex items-center gap-3 rounded-2xl px-4 py-4 panel hover:[background:var(--overlay)]"
                >
                  <FolderIcon empty={c.totalCount === 0} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{humanFolder(c.name)}</span>
                    <span className="block truncate font-mono text-[11px] [color:var(--muted)]">{c.name}</span>
                  </span>
                  <span className="shrink-0 text-xs [color:var(--muted)]">
                    {c.totalCount === 0 ? "empty" : c.totalCount}
                  </span>
                </Link>
                {canEdit && (
                  <FolderControls
                    path={c.path}
                    name={c.name}
                    here={here}
                    destinations={destinations.filter(
                      (d) => d !== c.path && !d.startsWith(`${c.path}/`)
                    )}
                    empty={c.totalCount === 0 && c.children.length === 0}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {filed.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
            Documents here
          </h2>
          <ul className="flex flex-col gap-2">
            {filed.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/documents/${d.id}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl px-5 py-4 panel hover:[background:var(--overlay)]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{d.title}</span>
                    <span className="block font-mono text-xs [color:var(--muted)]">{d.docId}</span>
                  </span>
                  <span className="flex shrink-0 gap-2 text-xs">
                    <span className="rounded-full px-2.5 py-1 font-semibold [background:var(--overlay)]">
                      v{d.versionMajor}.{d.versionMinor}
                    </span>
                    <span className="rounded-full px-2.5 py-1 font-semibold [background:var(--overlay)] [color:var(--muted)]">
                      {d.confidentiality.toLowerCase()}
                    </span>
                  </span>
                </Link>
                {canEdit && (
                  <FileControls
                    id={d.id}
                    title={d.title}
                    state={d.state}
                    legalHold={d.legalHold}
                    here={here}
                    destinations={destinations}
                    deleteProblem={fileDeleteProblem({ state: d.state, legalHold: d.legalHold })}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </Shell>
  );
}

function FolderIcon({ empty }: { empty: boolean }) {
  return (
    <svg
      className={`h-5 w-5 shrink-0 ${empty ? "[color:var(--muted)]" : "[color:var(--accent-text)]"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}
