import {
  CONFIDENTIALITY,
  DOC_TYPES,
  DOC_TYPE_INFO,
  humanFolder,
  type Confidentiality,
  type DocType,
} from "@app/core";

const field =
  "rounded-xl border px-4 py-2.5 text-sm [border-color:var(--hairline)] [background:var(--bg)]";
const primary = "rounded-xl px-4 py-2.5 text-sm font-semibold [color:var(--on-accent)] [background:var(--accent)]";
const quiet =
  "rounded-xl border px-4 py-2.5 text-sm font-semibold [border-color:var(--hairline)] [color:var(--ink)]";
const danger = "rounded-xl px-4 py-2.5 text-sm font-semibold [color:var(--on-danger)] [background:var(--danger)]";

/**
 * Administering the repository, for the roles allowed to.
 *
 * Every control is a plain form post. No client-side state, so an action either
 * happened on the server or it did not — there is no optimistic tick to
 * contradict what is actually filed.
 */

export function NewFolderPanel({ here, canAddFile }: { here: string; canAddFile: boolean }) {
  return (
    <div className="mb-6 flex flex-wrap gap-3">
      <details className="min-w-0 flex-1 rounded-2xl px-5 py-4 panel">
        <summary className="cursor-pointer text-sm font-semibold [color:var(--accent-text)]">
          New folder
        </summary>
        <form action="/api/repository/folders" method="post" className="mt-4 grid gap-3">
          <input type="hidden" name="action" value="create" />
          <input type="hidden" name="parentPath" value={here} />
          <input type="hidden" name="back" value={here} />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Name</span>
            <input name="name" required maxLength={64} className={field} placeholder="2026_CONTRACTS" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">
              What belongs here <span className="[color:var(--muted)]">(optional)</span>
            </span>
            <input name="purpose" maxLength={300} className={field} />
          </label>
          <p className="text-xs [color:var(--muted)]">
            {here
              ? `Created inside ${here}.`
              : "Top-level folders are the access matrix itself — open a zone first."}
          </p>
          <div>
            <button className={primary} disabled={!here}>
              Create folder
            </button>
          </div>
        </form>
      </details>

      {canAddFile && (
        <details className="min-w-0 flex-1 rounded-2xl px-5 py-4 panel">
          <summary className="cursor-pointer text-sm font-semibold [color:var(--accent-text)]">
            Add a file here
          </summary>
          <form
            action="/api/documents"
            method="post"
            encType="multipart/form-data"
            className="mt-4 grid gap-3 sm:grid-cols-2"
          >
            <input type="hidden" name="sourcePath" value={here} />
            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
              <span className="font-medium">File</span>
              <input type="file" name="file" required className={field} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
              <span className="font-medium">Title</span>
              <input name="title" required maxLength={200} className={field} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Type</span>
              <select name="docType" required defaultValue="" className={field}>
                <option value="" disabled>
                  Choose…
                </option>
                {DOC_TYPES.map((t: DocType) => (
                  <option key={t} value={t}>
                    {t} — {DOC_TYPE_INFO[t].name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Confidentiality</span>
              <select name="confidentiality" defaultValue="CONFIDENTIAL" className={field}>
                {CONFIDENTIALITY.map((c: Confidentiality) => (
                  <option key={c} value={c}>
                    {c.toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs [color:var(--muted)] sm:col-span-2">
              It arrives as a draft. Nothing is approved by uploading it.
            </p>
            <div className="sm:col-span-2">
              <button className={primary}>Add file</button>
            </div>
          </form>
        </details>
      )}
    </div>
  );
}

export function FolderControls({
  path,
  name,
  here,
  destinations,
  empty,
}: {
  path: string;
  name: string;
  here: string;
  destinations: readonly string[];
  empty: boolean;
}) {
  return (
    <details className="mt-1 rounded-xl px-4 py-2">
      <summary className="cursor-pointer text-xs font-semibold [color:var(--muted)]">Manage</summary>
      <div className="mt-3 grid gap-3">
        <form action="/api/repository/folders" method="post" className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="action" value="rename" />
          <input type="hidden" name="path" value={path} />
          <input type="hidden" name="back" value={here} />
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs">
            <span className="font-medium">Rename</span>
            <input name="name" required defaultValue={name} maxLength={64} className={field} />
          </label>
          <button className={quiet}>Rename</button>
        </form>

        <form action="/api/repository/folders" method="post" className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="action" value="rename" />
          <input type="hidden" name="path" value={path} />
          <input type="hidden" name="name" value={name} />
          <input type="hidden" name="back" value={here} />
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs">
            <span className="font-medium">Move to</span>
            <select name="toParent" defaultValue="" required className={field}>
              <option value="" disabled>
                Choose a folder…
              </option>
              {destinations.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <button className={quiet}>Move</button>
        </form>

        <form action="/api/repository/folders" method="post" className="flex items-center gap-3">
          <input type="hidden" name="action" value="delete" />
          <input type="hidden" name="path" value={path} />
          <input type="hidden" name="back" value={here} />
          <button className={empty ? danger : quiet} disabled={!empty}>
            Delete folder
          </button>
          {!empty && (
            <span className="text-xs [color:var(--muted)]">
              Empty it first — deleting a folder must not dispose of what is in it.
            </span>
          )}
        </form>
      </div>
    </details>
  );
}

export function FileControls({
  id,
  title,
  state,
  legalHold,
  here,
  destinations,
  deleteProblem,
}: {
  id: string;
  title: string;
  state: string;
  legalHold: boolean;
  here: string;
  destinations: readonly string[];
  deleteProblem: string | null;
}) {
  return (
    <details className="mt-1 rounded-xl px-4 py-2">
      <summary className="cursor-pointer text-xs font-semibold [color:var(--muted)]">Manage</summary>
      <div className="mt-3 grid gap-3">
        <form action={`/api/documents/${id}/manage`} method="post" className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="action" value="rename" />
          <input type="hidden" name="back" value={here} />
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs">
            <span className="font-medium">Title</span>
            <input name="title" required defaultValue={title} maxLength={200} className={field} />
          </label>
          <button className={quiet}>Rename</button>
        </form>

        <form action={`/api/documents/${id}/manage`} method="post" className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="action" value="move" />
          <input type="hidden" name="back" value={here} />
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs">
            <span className="font-medium">Move to</span>
            <select name="destination" defaultValue="" required className={field}>
              <option value="" disabled>
                Choose a folder…
              </option>
              {destinations.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <button className={quiet}>Move</button>
        </form>

        <form action={`/api/documents/${id}/manage`} method="post" className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="action" value="delete" />
          <input type="hidden" name="back" value={here} />
          <button className={deleteProblem ? quiet : danger} disabled={Boolean(deleteProblem)}>
            Delete file
          </button>
          {deleteProblem && (
            <span className="max-w-md text-xs [color:var(--muted)]">
              {legalHold ? "Under legal hold." : `In ${state.toLowerCase()} — dispose of it from the record instead.`}
            </span>
          )}
        </form>
      </div>
    </details>
  );
}

/** Folder paths offered as a destination, shown readably. */
export function destinationLabel(path: string): string {
  return path
    .split("/")
    .map((p) => humanFolder(p))
    .join(" / ");
}
