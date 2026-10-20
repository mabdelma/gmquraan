import { notFound } from "next/navigation";
import { requireMember } from "@/lib/guard";
import { mayActOnDocument, readableDocument, type DocRecord } from "@/lib/documents";
import { Shell } from "@/components/Shell";
import {
  DEPARTMENTS,
  DOC_TRANSITIONS,
  DOC_TYPE_INFO,
  ENTITIES,
  docTransitionProblem,
  isPreviewable,
  type DocState,
  type DocType,
  type EntityId,
} from "@app/core";

export const dynamic = "force-dynamic";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { member, viewer } = await requireMember();
  const { id } = await params;

  const doc = await readableDocument(viewer, id);
  if (!doc) notFound();

  const record = doc as unknown as DocRecord;
  const mayDownload = mayActOnDocument(viewer, record, "download");
  const previewable = isPreviewable(doc.mimeType ?? "") && Boolean(doc.storagePath);
  const mayEdit = mayActOnDocument(viewer, record, "edit");
  // Only the transitions the lifecycle actually permits from here, so the page
  // never offers a button that the endpoint will refuse.
  const next = (DOC_TRANSITIONS[doc.state as DocState] ?? []).filter(
    (st) => !docTransitionProblem(doc.state as DocState, st, {
      approverId: member.id,
      versionLocked: true,
      evidence: doc.sha256 ? [doc.sha256] : null,
      supersedesId: doc.supersedesId,
      retainUntil: doc.retainUntil,
      legalHold: doc.legalHold,
      deletionAuthorisers: [],
    })
  );

  return (
    <Shell member={member}>
      <nav className="mb-4 text-sm">
        <a href="/documents" className="[color:var(--accent-text)]">
          ← Documents
        </a>
      </nav>

      <header className="mb-6">
        <p className="font-mono text-xs [color:var(--muted)]">{doc.docId}</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">{doc.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <Chip>v{doc.versionMajor}.{doc.versionMinor}</Chip>
          <Chip>{doc.state.toLowerCase().replace(/_/g, " ")}</Chip>
          <Chip warn={doc.confidentiality === "RESTRICTED" || doc.confidentiality === "PRIVILEGED"}>
            {doc.confidentiality.toLowerCase()}
          </Chip>
          {doc.legalHold && <Chip warn>legal hold</Chip>}
        </div>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-2">
        <Field label="Type" value={`${doc.docType} — ${DOC_TYPE_INFO[doc.docType as DocType]?.name ?? ""}`} />
        <Field label="Owner" value={doc.owner.name} />
        <Field label="Custodian" value={doc.custodian?.name ?? "—"} />
        <Field
          label="Branch"
          value={doc.entityId ? (ENTITIES[doc.entityId as EntityId]?.legalName ?? doc.entityId) : "—"}
        />
        <Field
          label="Department"
          value={DEPARTMENTS[doc.departmentId as keyof typeof DEPARTMENTS]?.name ?? doc.departmentId}
        />
        <Field label="Retention" value={doc.retentionClass} />
        <Field label="Size" value={doc.sizeBytes ? `${(doc.sizeBytes / 1024).toFixed(1)} KB` : "—"} />
        <Field label="Checksum" value={doc.sha256 ? `${doc.sha256.slice(0, 16)}…` : "—"} mono />
        {doc.supersedes && (
          <Field label="Supersedes" value={`${doc.supersedes.docId} v${doc.supersedes.versionMajor}.${doc.supersedes.versionMinor}`} wide />
        )}
      </section>

      <section className="mb-8 flex flex-wrap gap-2">
        {previewable && (
          <a
            href={`/api/documents/${doc.id}/file`}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-xl border px-5 py-3 text-sm font-medium [border-color:var(--hairline)]"
          >
            Preview
          </a>
        )}
        {mayDownload.ok ? (
          <a
            href={`/api/documents/${doc.id}/file?download=1`}
            className="rounded-xl px-5 py-3 text-sm font-semibold [color:var(--on-accent)] [background:var(--accent)]"
          >
            Download
          </a>
        ) : (
          <span className="rounded-xl border px-5 py-3 text-sm [border-color:var(--hairline)] [color:var(--muted)]">
            Download not permitted — {mayDownload.reason}
          </span>
        )}
      </section>

      {mayEdit.ok && (
        <section className="mb-8 rounded-2xl px-5 py-5 panel">
          <h2 className="mb-1 text-sm font-bold">Lifecycle</h2>
          <p className="mb-3 text-xs [color:var(--muted)]">
            An approved version is never overwritten — a revision creates a new controlled version
            that supersedes this one, and nobody approves a record they own.
          </p>

          {next.length > 0 && (
            <form action={`/api/documents/${doc.id}/state`} method="post" className="flex flex-wrap gap-2">
              {next.map((st) => (
                <button
                  key={st}
                  name="to"
                  value={st}
                  className="rounded-xl border px-4 py-2.5 text-sm font-medium [border-color:var(--hairline)] hover:[background:var(--overlay)]"
                >
                  {st.toLowerCase().replace(/_/g, " ")}
                </button>
              ))}
            </form>
          )}

          <form
            action={`/api/documents/${doc.id}/version`}
            method="post"
            encType="multipart/form-data"
            className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4 [border-color:var(--hairline)]"
          >
            <input
              name="file"
              type="file"
              required
              className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-xs [border-color:var(--hairline)] [background:var(--bg)]"
            />
            <input
              name="note"
              placeholder="What changed"
              maxLength={300}
              className="min-w-40 flex-1 rounded-lg border px-3 py-2 text-xs [border-color:var(--hairline)] [background:var(--bg)]"
            />
            <button className="rounded-lg px-4 py-2 text-xs font-semibold [color:var(--on-accent)] [background:var(--accent)]">
              Upload new version
            </button>
          </form>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">History</h2>
        <ol className="flex flex-col gap-2">
          {doc.events.map((e) => (
            <li key={e.id} className="rounded-2xl px-5 py-3 text-sm panel">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span>
                  <span className="font-medium">{e.actorName || e.actorRef}</span>{" "}
                  <span className="[color:var(--muted)]">{e.action.replace(/_/g, " ")}</span>
                  {e.actorKind !== "HUMAN" && (
                    <span className="ml-2 rounded-full px-2 py-0.5 text-xs [background:var(--overlay)]">
                      {e.actorKind.toLowerCase()}
                    </span>
                  )}
                </span>
                <time className="text-xs [color:var(--muted)]" dateTime={e.at.toISOString()}>
                  {e.at.toISOString().replace("T", " ").slice(0, 16)}
                </time>
              </div>
              {e.note && <p className="mt-1 [color:var(--muted)]">{e.note}</p>}
            </li>
          ))}
        </ol>
      </section>
    </Shell>
  );
}

function Chip({ children, warn }: { children: React.ReactNode; warn?: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 font-semibold [background:var(--overlay)] ${warn ? "[color:var(--warn)]" : "[color:var(--muted)]"}`}
    >
      {children}
    </span>
  );
}

function Field({ label, value, mono, wide }: { label: string; value: string; mono?: boolean; wide?: boolean }) {
  return (
    <div className={`rounded-2xl px-5 py-4 panel ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="text-xs uppercase tracking-wide [color:var(--muted)]">{label}</dt>
      <dd className={`mt-1 break-words text-sm ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
