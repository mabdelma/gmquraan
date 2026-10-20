import { prisma } from "@app/db";
import { requireMember } from "@/lib/guard";
import { Shell } from "@/components/Shell";
import { DEPARTMENTS, DEPARTMENT_IDS, ENTITIES, ENTITY_IDS, canAssignTo, isGroupWide } from "@app/core";

export const dynamic = "force-dynamic";

/**
 * Raise a task.
 *
 * The assignee list is limited to people this person may actually assign work
 * to — themselves, and anyone in their reporting line. Offering the whole
 * company and refusing on submit would be a worse way to express the same rule.
 */
export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; title?: string }>;
}) {
  const { member, viewer } = await requireMember();
  const sp = await searchParams;

  const everyone = await prisma.teamMember.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, departmentId: true, entityId: true },
  });

  const assignable = everyone.filter((p) => canAssignTo(viewer, p.id));
  // Owners are the accountable party, so the same rule applies: you cannot make
  // somebody accountable for work unless they report to you.
  const ownable = assignable;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Shell member={member}>
      <nav className="mb-4 text-sm">
        <a href="/tasks" className="[color:var(--accent-text)]">
          ← Tasks
        </a>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">New task</h1>
        <p className="mt-1 text-sm [color:var(--muted)]">
          Capture it now with a title and an owner. The rest — acceptance criteria, expected
          outputs, destination — is required before it can leave triage, not before it exists.
        </p>
      </header>

      {sp.error && (
        <p role="alert" className="mb-6 rounded-2xl px-5 py-4 text-sm panel [color:var(--danger)]">
          {sp.error}
        </p>
      )}

      <form action="/api/tasks" method="post" className="flex flex-col gap-6">
        <section className="rounded-2xl px-5 py-5 panel">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
            What needs doing
          </h2>
          <div className="grid gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Title</span>
              <input
                name="title"
                required
                minLength={4}
                maxLength={200}
                defaultValue={sp.title ?? ""}
                placeholder="Renew the Example City licence before 12 March"
                className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Detail (optional)</span>
              <textarea
                name="description"
                rows={3}
                maxLength={2000}
                className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl px-5 py-5 panel">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
            Who and when
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Owner (accountable)</span>
              <select
                name="ownerId"
                required
                defaultValue={member.id}
                className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
              >
                {ownable.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.id === member.id ? " (you)" : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Assign to (optional)</span>
              <select
                name="assigneeId"
                defaultValue=""
                className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
              >
                <option value="">Leave for triage</option>
                {assignable.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.id === member.id ? " (you)" : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Priority</span>
              <select
                name="priority"
                defaultValue="P2"
                className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
              >
                <option value="P0">P0 — critical</option>
                <option value="P1">P1 — high</option>
                <option value="P2">P2 — normal</option>
                <option value="P3">P3 — low</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Due</span>
              <input
                name="dueAt"
                type="date"
                min={today}
                className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Branch</span>
              <select
                name="entityId"
                defaultValue={member.entityId ?? ""}
                className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
              >
                <option value="">Group</option>
                {ENTITY_IDS.map((e) => (
                  <option key={e} value={e}>
                    {ENTITIES[e].country}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Department</span>
              <select
                name="departmentId"
                defaultValue={member.departmentId ?? ""}
                className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
              >
                <option value="">Let triage decide</option>
                {DEPARTMENT_IDS.map((d) => (
                  <option key={d} value={d}>
                    {DEPARTMENTS[d].name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-2xl px-5 py-5 panel">
          <h2 className="mb-1 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
            Definition of done (optional now)
          </h2>
          <p className="mb-4 text-xs [color:var(--muted)]">
            Required before the task can move past triage. Filling it in now saves somebody asking.
          </p>
          <div className="grid gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Acceptance criteria</span>
              <input
                name="acceptanceCriteria"
                maxLength={500}
                placeholder="Renewed licence PDF filed and the expiry updated on the site"
                className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Expected outputs</span>
              <input
                name="expectedOutputs"
                maxLength={500}
                placeholder="One per comma: renewed licence PDF, updated content.ts"
                className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Destination</span>
              <input
                name="destination"
                maxLength={200}
                placeholder="02_LEGAL_ENTITIES/02_UAE_APP_UAE/02_LICENCES_AND_REGISTRATIONS"
                className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
              />
            </label>
          </div>
        </section>

        <button className="self-start rounded-xl px-6 py-3 font-semibold [color:var(--on-accent)] [background:var(--accent)]">
          Create task
        </button>
      </form>

      {!isGroupWide(member.role) && assignable.length === 1 && (
        <p className="mt-6 text-xs [color:var(--muted)]">
          Nobody reports to you, so tasks can only be owned by or assigned to you. A manager can
          reassign afterwards.
        </p>
      )}
    </Shell>
  );
}
