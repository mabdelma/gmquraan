import Link from "next/link";
import { prisma } from "@app/db";
import { requireMember } from "@/lib/guard";
import { visibleTasks } from "@/lib/tasks";
import { Shell } from "@/components/Shell";
import { StateChip, PriorityChip, DueLabel } from "@/components/chips";
import {
  DEPARTMENTS,
  DEPARTMENT_IDS,
  ENTITIES,
  ENTITY_IDS,
  isGroupWide,
  type EntityId,
} from "@app/core";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { member, viewer } = await requireMember();
  const sp = await searchParams;

  // Who may address whom. A group-wide role reaches everybody; anybody else is
  // limited to their own branch or department, which is also all the form
  // offers them — the endpoint checks the same thing rather than trusting it.
  const mayPost = isGroupWide(member.role) || Boolean(member.entityId || member.departmentId);
  const audiences = isGroupWide(member.role)
    ? [
        { value: "ALL", label: "Everybody" },
        ...ENTITY_IDS.map((e) => ({ value: e as string, label: ENTITIES[e].country })),
        ...DEPARTMENT_IDS.map((d) => ({ value: d as string, label: DEPARTMENTS[d].name })),
      ]
    : [
        ...(member.entityId
          ? [
              {
                value: member.entityId,
                label: ENTITIES[member.entityId as EntityId]?.country ?? member.entityId,
              },
            ]
          : []),
        ...(member.departmentId
          ? [
              {
                value: member.departmentId,
                label:
                  DEPARTMENTS[member.departmentId as keyof typeof DEPARTMENTS]?.name ??
                  member.departmentId,
              },
            ]
          : []),
      ];

  const [tasks, announcements, pendingApprovals] = await Promise.all([
    visibleTasks(viewer, { open: true, limit: 50 }),
    prisma.announcement.findMany({
      where: {
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        AND: [
          {
            OR: [
              { audience: "ALL" },
              ...(member.entityId ? [{ audience: member.entityId }] : []),
              ...(member.departmentId ? [{ audience: member.departmentId }] : []),
            ],
          },
        ],
      },
      orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
      take: 6,
    }),
    prisma.approvalRequest.count({ where: { outcome: "PENDING" } }),
  ]);

  const mine = tasks.filter((t) => t.assigneeId === member.id || t.ownerId === member.id);
  const startOfTomorrow = new Date();
  startOfTomorrow.setHours(24, 0, 0, 0);
  const today = mine.filter((t) => t.dueAt && t.dueAt < startOfTomorrow);
  const rest = mine.filter((t) => !today.includes(t));

  return (
    <Shell member={member}>
      {sp.done && (
        <p role="status" className="mb-6 rounded-2xl px-5 py-4 text-sm panel [color:var(--ok)]">
          {sp.done}
        </p>
      )}
      {sp.error && (
        <p role="alert" className="mb-6 rounded-2xl px-5 py-4 text-sm panel [color:var(--danger)]">
          {sp.error}
        </p>
      )}
      <header className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {greeting()}, {member.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm [color:var(--muted)]">
          {mine.length === 0
            ? "Nothing is assigned to you right now."
            : `${today.length} due today or overdue · ${mine.length} open in total`}
        </p>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          Due today
        </h2>
        {today.length === 0 ? (
          <p className="rounded-2xl px-5 py-6 text-sm panel [color:var(--muted)]">
            Nothing due today. {rest.length > 0 && `${rest.length} other open task${rest.length === 1 ? "" : "s"} below.`}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {today.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </ul>
        )}
      </section>

      {rest.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
            Also open
          </h2>
          <ul className="flex flex-col gap-2">
            {rest.slice(0, 8).map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </ul>
          {rest.length > 8 && (
            <Link href="/tasks" className="mt-3 inline-block text-sm [color:var(--accent-text)]">
              See all {mine.length} open tasks →
            </Link>
          )}
        </section>
      )}

      {pendingApprovals > 0 && (
        <section className="mb-10">
          <Link
            href="/approvals"
            className="block rounded-2xl px-5 py-4 text-sm panel hover:[background:var(--overlay)]"
          >
            <span className="font-semibold">{pendingApprovals} decision{pendingApprovals === 1 ? "" : "s"} waiting</span>
            <span className="[color:var(--muted)]"> — approvals the system cannot make on its own.</span>
          </Link>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          What&rsquo;s new
        </h2>
        {mayPost && audiences.length > 0 && (
          <details className="mb-4 rounded-2xl px-5 py-4 panel">
            <summary className="cursor-pointer text-sm font-semibold [color:var(--accent-text)]">
              Post an announcement
            </summary>
            <form action="/api/announcements" method="post" className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                <span className="font-medium">Title</span>
                <input
                  name="title"
                  required
                  maxLength={200}
                  className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                <span className="font-medium">Body</span>
                <textarea
                  name="body"
                  required
                  rows={4}
                  maxLength={4000}
                  className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Audience</span>
                <select
                  name="audience"
                  defaultValue={audiences[0].value}
                  className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
                >
                  {audiences.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Expires after</span>
                <select
                  name="days"
                  defaultValue="14"
                  className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
                >
                  <option value="7">a week</option>
                  <option value="14">two weeks</option>
                  <option value="30">a month</option>
                  <option value="90">three months</option>
                </select>
              </label>
              <button className="rounded-xl px-5 py-3 text-sm font-semibold [color:var(--on-accent)] [background:var(--accent)] sm:col-span-2 sm:justify-self-start">
                Post
              </button>
            </form>
            <p className="mt-3 text-xs [color:var(--muted)]">
              Everything expires. A notice board nobody prunes stops being read, and the oldest
              item is usually the one still shouting loudest.
            </p>
          </details>
        )}

        {announcements.length === 0 ? (
          <p className="rounded-2xl px-5 py-6 text-sm panel [color:var(--muted)]">
            No announcements yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {announcements.map((a) => (
              <li key={a.id} className="rounded-2xl px-5 py-4 panel">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-semibold">
                    {a.pinned && <span aria-label="Pinned">📌 </span>}
                    {a.title}
                  </h3>
                  <time className="shrink-0 text-xs [color:var(--muted)]" dateTime={a.publishedAt.toISOString()}>
                    {a.publishedAt.toISOString().slice(0, 10)}
                  </time>
                </div>
                <p className="mt-1 text-sm [color:var(--muted)]">{a.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Shell>
  );
}

function TaskRow({ task }: { task: { id: string; ref: string; title: string; state: string; priority: string; dueAt: Date | null } }) {
  return (
    <li>
      <Link
        href={`/tasks/${task.id}`}
        className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl px-5 py-4 panel hover:[background:var(--overlay)]"
      >
        <PriorityChip priority={task.priority} />
        <span className="min-w-0 flex-1 font-medium">{task.title}</span>
        <StateChip state={task.state} />
        <DueLabel due={task.dueAt} />
        <span className="w-full font-mono text-xs [color:var(--muted)]">{task.ref}</span>
      </Link>
    </li>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
