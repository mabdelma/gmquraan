import { notFound } from "next/navigation";
import { requireMember } from "@/lib/guard";
import { offeredStates, readableTask } from "@/lib/tasks";
import { Shell } from "@/components/Shell";
import { DueLabel, PriorityChip, StateChip, humanState } from "@/components/chips";
import { canAssignTo, canWrite, missingControls, type TaskState } from "@app/core";
import { prisma } from "@app/db";

export const dynamic = "force-dynamic";

export default async function TaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { member, viewer } = await requireMember();
  const { id } = await params;
  const sp = await searchParams;

  const task = await readableTask(viewer, id);
  if (!task) notFound();

  const controls = {
    ownerId: task.ownerId,
    dueAt: task.dueAt,
    priority: task.priority,
    inputs: task.inputs,
    expectedOutputs: task.expectedOutputs,
    acceptanceCriteria: task.acceptanceCriteria,
    destination: task.destination,
  };
  const missing = missingControls(controls);
  const editable = canWrite(viewer, {
    ownerId: task.ownerId,
    assigneeId: task.assigneeId,
    requesterId: task.requesterId,
    entityId: task.entityId,
    departmentId: task.departmentId,
    confidentiality: task.confidentiality,
  });
  const next = editable ? offeredStates(task.state as TaskState, controls) : [];

  // Only people this viewer may actually give work to. Offering the whole
  // company and refusing on submit expresses the same rule far worse.
  const assignable = editable
    ? (
        await prisma.teamMember.findMany({
          where: { status: "ACTIVE" },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      ).filter((p) => canAssignTo(viewer, p.id))
    : [];

  return (
    <Shell member={member}>
      <nav className="mb-4 text-sm">
        <a href="/tasks" className="[color:var(--accent-text)]">
          ← Tasks
        </a>
      </nav>

      <header className="mb-6">
        <p className="font-mono text-xs [color:var(--muted)]">{task.ref}</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">{task.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <StateChip state={task.state} />
          <PriorityChip priority={task.priority} />
          <DueLabel due={task.dueAt} />
        </div>
      </header>

      {sp.error && (
        <p role="alert" className="mb-6 rounded-2xl px-5 py-4 text-sm panel [color:var(--danger)]">
          {sp.error}
        </p>
      )}

      {task.description && (
        <section className="mb-6 rounded-2xl px-5 py-4 panel">
          <p className="whitespace-pre-wrap text-sm">{task.description}</p>
        </section>
      )}

      <section className="mb-6 grid gap-3 sm:grid-cols-2">
        <Field label="Owner" value={task.owner.name} />
        <Field label="Requested by" value={task.requester.name} />
        <Field label="Doing" value={task.assignee?.name ?? task.agentKey ?? "Nobody yet"} />
        <Field label="Entity" value={task.entityId ?? "—"} />
        <Field label="Department" value={task.departmentId ?? "—"} />
        <Field label="Classification" value={humanState(task.confidentiality)} />
        <Field label="Acceptance criteria" value={task.acceptanceCriteria ?? "Not set"} wide />
        <Field label="Destination" value={task.destination ?? "Not set"} wide />
      </section>

      {missing.length > 0 && (
        <section className="mb-6 rounded-2xl px-5 py-4 panel">
          <h2 className="text-sm font-bold">Required controls still missing</h2>
          <p className="mt-1 text-sm [color:var(--muted)]">
            The task cannot move past triage until these are filled in: {missing.join(", ")}.
          </p>
        </section>
      )}

      {editable && next.length > 0 && (
        <section className="mb-8 rounded-2xl px-5 py-4 panel">
          <h2 className="mb-3 text-sm font-bold">Move this task</h2>
          <form action={`/api/tasks/${task.id}/state`} method="post" className="flex flex-wrap gap-2">
            {next.map((s) => (
              <button
                key={s}
                name="to"
                value={s}
                className="rounded-xl border px-4 py-2.5 text-sm font-medium [border-color:var(--hairline)] hover:[background:var(--overlay)]"
              >
                {humanState(s)}
              </button>
            ))}
          </form>
        </section>
      )}

      {editable && assignable.length > 0 && (
        <section className="mb-8 rounded-2xl px-5 py-4 panel">
          <h2 className="mb-3 text-sm font-bold">Who is doing it</h2>
          <form action={`/api/tasks/${task.id}/assign`} method="post" className="flex flex-wrap gap-2">
            <select
              name="assigneeId"
              defaultValue={task.assigneeId ?? ""}
              className="min-w-48 flex-1 rounded-xl border px-4 py-3 text-sm [border-color:var(--hairline)] [background:var(--bg)]"
            >
              <option value="">Nobody — return to the pool</option>
              {assignable.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.id === member.id ? " (you)" : ""}
                </option>
              ))}
            </select>
            <button className="rounded-xl px-5 py-3 text-sm font-semibold [color:var(--on-accent)] [background:var(--accent)]">
              Save
            </button>
          </form>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          History
        </h2>
        <ol className="flex flex-col gap-2">
          {task.events.map((e) => (
            <li key={e.id} className="rounded-2xl px-5 py-3 text-sm panel">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span>
                  <span className="font-medium">{e.actorName || e.actorRef}</span>{" "}
                  <span className="[color:var(--muted)]">
                    {e.fromState && e.toState
                      ? `moved it from ${humanState(e.fromState)} to ${humanState(e.toState)}`
                      : e.action.replace(/_/g, " ")}
                  </span>
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
          {task.events.length === 0 && (
            <li className="rounded-2xl px-5 py-4 text-sm panel [color:var(--muted)]">
              Nothing recorded yet.
            </li>
          )}
        </ol>
      </section>
    </Shell>
  );
}

function Field({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-2xl px-5 py-4 panel ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="text-xs uppercase tracking-wide [color:var(--muted)]">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}
