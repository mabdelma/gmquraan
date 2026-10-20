import Link from "next/link";
import { requireMember } from "@/lib/guard";
import { searchDocuments, visibleDocuments } from "@/lib/documents";
import { Shell } from "@/components/Shell";
import {
  CONFIDENTIALITY,
  DEPARTMENTS,
  DEPARTMENT_IDS,
  DOC_TYPES,
  DOC_TYPE_INFO,
  ENTITIES,
  ENTITY_IDS,
  roleCan,
} from "@app/core";

export const dynamic = "force-dynamic";

/**
 * The document register.
 *
 * Only shows what the viewer may know exists — `discover` is a separate
 * permission from `read`, so a record they cannot open does not appear at all
 * rather than appearing and refusing.
 */
export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string }>;
}) {
  const { member, viewer } = await requireMember();
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const [all, docs] = await Promise.all([
    visibleDocuments(viewer),
    searchDocuments(viewer, q),
  ]);

  const mayUpload = roleCan(member.role, "create");

  return (
    <Shell member={member}>
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Documents</h1>
        <p className="mt-1 text-sm [color:var(--muted)]">
          {all.length} record{all.length === 1 ? "" : "s"} you are entitled to see. Search covers
          only those — it reads the text of plain-text records too, and it cannot surface a record
          you have no access to.
        </p>
      </header>

      {sp.error && (
        <p role="alert" className="mb-6 rounded-2xl px-5 py-4 text-sm panel [color:var(--danger)]">
          {sp.error}
        </p>
      )}

      <form method="get" className="mb-6 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Search titles, identifiers and text content"
          className="min-w-56 flex-1 rounded-xl border px-4 py-3 text-sm [border-color:var(--hairline)] [background:var(--bg)]"
        />
        <button className="rounded-xl border px-5 py-3 text-sm [border-color:var(--hairline)]">Search</button>
      </form>

      {mayUpload && (
        <details className="mb-8 rounded-2xl px-5 py-4 panel">
          <summary className="cursor-pointer text-sm font-semibold [color:var(--accent-text)]">
            Add a document
          </summary>
          <form
            action="/api/documents"
            method="post"
            encType="multipart/form-data"
            className="mt-4 grid gap-4 sm:grid-cols-2"
          >
            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
              <span className="font-medium">Title</span>
              <input name="title" required maxLength={200}
                className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Short title (for the filename)</span>
              <input name="shortTitle" maxLength={60} placeholder="ClientOnboarding"
                className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Type</span>
              <select name="docType" required defaultValue=""
                className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]">
                <option value="" disabled>Choose…</option>
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>{t} — {DOC_TYPE_INFO[t].name}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Branch</span>
              <select name="entityId" defaultValue={member.entityId ?? "ORG-ES"}
                className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]">
                {ENTITY_IDS.map((e) => <option key={e} value={e}>{ENTITIES[e].country}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Department</span>
              <select name="departmentId" defaultValue={member.departmentId ?? "OPS"}
                className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]">
                {DEPARTMENT_IDS.map((d) => <option key={d} value={d}>{DEPARTMENTS[d].name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Classification</span>
              <select name="confidentiality" defaultValue="CONFIDENTIAL"
                className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]">
                {CONFIDENTIALITY.map((c) => <option key={c} value={c}>{c.toLowerCase()}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">File</span>
              <input name="file" type="file" required
                className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]" />
            </label>
            <button className="rounded-xl px-5 py-3 font-semibold [color:var(--on-accent)] [background:var(--accent)] sm:col-span-2 sm:justify-self-start">
              Upload
            </button>
          </form>
          <p className="mt-3 text-xs [color:var(--muted)]">
            Unclassified defaults to confidential. The identifier is generated from the branch,
            department, type and year — it is not yours to choose.
          </p>
        </details>
      )}

      {docs.length === 0 ? (
        <p className="rounded-2xl px-5 py-8 text-sm panel [color:var(--muted)]">
          {q ? "Nothing matched." : "No documents yet."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {docs.map((d) => (
            <li key={d.id}>
              <Link href={`/documents/${d.id}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl px-5 py-4 panel hover:[background:var(--overlay)]">
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{d.title}</span>
                  <span className="block font-mono text-xs [color:var(--muted)]">{d.docId}</span>
                </span>
                <span className="flex shrink-0 flex-wrap gap-2 text-xs">
                  <span className="rounded-full px-2.5 py-1 font-semibold [background:var(--overlay)]">
                    v{d.versionMajor}.{d.versionMinor}
                  </span>
                  <span className="rounded-full px-2.5 py-1 font-semibold [background:var(--overlay)]">
                    {d.state.toLowerCase().replace(/_/g, " ")}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 font-semibold [background:var(--overlay)] ${
                    d.confidentiality === "RESTRICTED" || d.confidentiality === "PRIVILEGED" ? "[color:var(--warn)]" : "[color:var(--muted)]"
                  }`}>
                    {d.confidentiality.toLowerCase()}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
