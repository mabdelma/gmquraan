import Link from "next/link";
import { requireMember } from "@/lib/guard";
import { visibleTasks } from "@/lib/tasks";
import { Shell } from "@/components/Shell";
import { DueLabel, PriorityChip, StateChip } from "@/components/chips";

export const dynamic = "force-dynamic";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string }>;
}) {
  const { member, viewer } = await requireMember();
  const showAll = (await searchParams).all === "1";
  const tasks = await visibleTasks(viewer, { open: !showAll, limit: 200 });

  return (
    <Shell member={member}>
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm [color:var(--muted)]">
            Everything you own, are assigned, or oversee.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={showAll ? "/tasks" : "/tasks?all=1"}
            className="rounded-xl border px-4 py-2.5 text-sm [border-color:var(--hairline)]"
          >
            {showAll ? "Open only" : "Include closed"}
          </Link>
          <Link
            href="/tasks/new"
            className="rounded-xl px-4 py-2.5 text-sm font-semibold [color:var(--on-accent)] [background:var(--accent)]"
          >
            New task
          </Link>
        </div>
      </header>

      {tasks.length === 0 ? (
        <p className="rounded-2xl px-5 py-8 text-sm panel [color:var(--muted)]">
          No tasks to show.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((t) => (
            <li key={t.id}>
              <Link
                href={`/tasks/${t.id}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl px-5 py-4 panel hover:[background:var(--overlay)]"
              >
                <PriorityChip priority={t.priority} />
                <span className="min-w-0 flex-1 font-medium">{t.title}</span>
                <StateChip state={t.state} />
                <DueLabel due={t.dueAt} />
                <span className="flex w-full flex-wrap gap-x-3 text-xs [color:var(--muted)]">
                  <span className="font-mono">{t.ref}</span>
                  <span>Owner: {t.owner.name}</span>
                  {t.assignee && <span>Doing: {t.assignee.name}</span>}
                  {t.agentKey && <span>Agent: {t.agentKey}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
