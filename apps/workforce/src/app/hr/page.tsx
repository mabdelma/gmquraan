import { redirect } from "next/navigation";
import { prisma } from "@app/db";
import { requireMember } from "@/lib/guard";
import { Shell } from "@/components/Shell";
import { ENTITIES, JML_STEPS, isGroupWide, type EntityId } from "@app/core";

export const dynamic = "force-dynamic";

/**
 * The HR console.
 *
 * Open to the People department and to group-wide roles. Note what is not here:
 * no salary figures and no HR notes, even for someone who can reach this page.
 * Compensation is a separate record with its own access, and showing it on a
 * summary screen would defeat that separation entirely.
 */
export default async function HrPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; done?: string }>;
}) {
  const { member, viewer } = await requireMember();
  const mayView = isGroupWide(member.role) || member.departmentId === "PEO";
  if (!mayView) redirect("/home");

  const sp = await searchParams;

  const [pendingLeave, cardRequests, packToVerify, jml, byStatus, byEntity, noEntity] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { status: "REQUESTED" },
      orderBy: { startDate: "asc" },
      include: { member: { select: { id: true, name: true, entityId: true } } },
      take: 50,
    }),
    prisma.cardChangeRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { requester: { select: { name: true } } },
      take: 50,
    }),
    prisma.employeeDocument.findMany({
      where: { status: "PROVIDED" },
      orderBy: { providedAt: "asc" },
      include: { member: { select: { id: true, name: true } } },
      take: 50,
    }),
    prisma.jmlEvent.findMany({
      where: { status: "OPEN" },
      orderBy: { effectiveDate: "asc" },
      include: { member: { select: { name: true } } },
      take: 25,
    }),
    prisma.employeeRecord.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.teamMember.groupBy({
      by: ["entityId"],
      where: { status: "ACTIVE" },
      _count: { _all: true },
    }),
    prisma.teamMember.count({ where: { status: "ACTIVE", entityId: null } }),
  ]);

  return (
    <Shell member={member}>
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">People</h1>
        <p className="mt-1 text-sm [color:var(--muted)]">
          Leave decisions, card corrections and joiner/mover/leaver events.
        </p>
      </header>

      {sp.done && (
        <p role="status" className="mb-6 rounded-2xl px-5 py-4 text-sm panel [color:var(--ok)]">
          Recorded.
        </p>
      )}
      {sp.error && (
        <p role="alert" className="mb-6 rounded-2xl px-5 py-4 text-sm panel [color:var(--danger)]">
          {sp.error}
        </p>
      )}

      <nav className="mb-6 flex flex-wrap gap-2">
        <a href="/hr/compensation" className="rounded-xl border px-4 py-2.5 text-sm [border-color:var(--hairline)]">
          Compensation
        </a>
        <a href="/assets" className="rounded-xl border px-4 py-2.5 text-sm [border-color:var(--hairline)]">
          Equipment register
        </a>
        <a href="/admin/people" className="rounded-xl border px-4 py-2.5 text-sm [border-color:var(--hairline)]">
          People and placement
        </a>
      </nav>

      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {byStatus.map((s) => (
          <Stat key={s.status} label={s.status.replace(/_/g, " ").toLowerCase()} value={s._count._all} />
        ))}
        {noEntity > 0 && <Stat label="no entity assigned" value={noEntity} warn />}
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          Headcount by branch
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {byEntity.map((e) => (
            <li key={e.entityId ?? "none"} className="rounded-2xl px-4 py-3 text-sm panel">
              <div className="font-semibold">
                {e.entityId ? ENTITIES[e.entityId as EntityId]?.country ?? e.entityId : "Unassigned"}
              </div>
              <div className="[color:var(--muted)]">
                {e._count._all} {e._count._all === 1 ? "person" : "people"}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          Leave awaiting a decision
        </h2>
        {pendingLeave.length === 0 ? (
          <p className="rounded-2xl px-5 py-6 text-sm panel [color:var(--muted)]">Nothing pending.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pendingLeave.map((r) => {
              const isOwn = r.memberId === member.id;
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl px-5 py-4 panel">
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{r.member.name}</span>
                    <span className="[color:var(--muted)]">
                      {" "}
                      · {r.startDate.toISOString().slice(0, 10)} → {r.endDate.toISOString().slice(0, 10)} ·{" "}
                      {r.days} day{r.days === 1 ? "" : "s"} · {r.type.toLowerCase()}
                    </span>
                    {r.reason && <span className="block text-xs [color:var(--muted)]">{r.reason}</span>}
                  </span>
                  {isOwn ? (
                    <span className="text-xs [color:var(--muted)]">
                      Your own request — somebody else has to decide it.
                    </span>
                  ) : (
                    <form action={`/api/leave/${r.id}`} method="post" className="flex gap-2">
                      <button
                        name="action"
                        value="approve"
                        className="rounded-xl px-4 py-2.5 text-sm font-semibold [color:var(--on-accent)] [background:var(--accent)]"
                      >
                        Approve
                      </button>
                      <button
                        name="action"
                        value="reject"
                        className="rounded-xl border px-4 py-2.5 text-sm font-semibold [border-color:var(--hairline)] [color:var(--danger)]"
                      >
                        Reject
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          Card corrections requested
        </h2>
        {cardRequests.length === 0 ? (
          <p className="rounded-2xl px-5 py-6 text-sm panel [color:var(--muted)]">Nothing pending.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {cardRequests.map((c) => (
              <li key={c.id} className="rounded-2xl px-5 py-4 text-sm panel">
                <div className="font-medium">
                  {c.requester.name} — <span className="font-mono text-xs">{c.field}</span>
                </div>
                <div className="mt-1 [color:var(--muted)]">
                  Should read: <span className="[color:var(--ink)]">{c.proposed}</span>
                  {c.reason && <> · {c.reason}</>}
                </div>
                <div className="mt-2 text-xs [color:var(--muted)]">
                  Apply it in the central console under Workforce, then mark this done there.
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-10">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          Documents awaiting verification
        </h2>
        <p className="mb-3 text-xs [color:var(--muted)]">
          Somebody uploading a file is not somebody having looked at it. Nothing counts as held
          until it is verified here, and nobody may verify their own.
        </p>
        {packToVerify.length === 0 ? (
          <p className="rounded-2xl px-5 py-6 text-sm panel [color:var(--muted)]">Nothing waiting.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {packToVerify.map((i) => {
              const own = i.memberId === member.id;
              return (
                <li key={i.id} className="rounded-2xl px-5 py-4 text-sm panel">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">
                      {i.member.name} — {i.name}
                    </span>
                    <span className="text-xs [color:var(--muted)]">
                      supplied {i.providedAt?.toISOString().slice(0, 10)}
                    </span>
                  </div>
                  {i.documentId && (
                    <a
                      href={`/documents/${i.documentId}`}
                      className="mt-1 inline-block text-xs [color:var(--accent-text)]"
                    >
                      Open the document
                    </a>
                  )}
                  {own ? (
                    <p className="mt-2 text-xs [color:var(--muted)]">
                      Your own document — a colleague in People has to verify it.
                    </p>
                  ) : (
                    <form
                      action={`/api/hr/pack/${i.id}`}
                      method="post"
                      className="mt-3 flex flex-wrap items-end gap-2"
                    >
                      <label className="flex flex-col gap-1 text-xs">
                        <span className="[color:var(--muted)]">Expires (optional)</span>
                        <input
                          name="expiresAt"
                          type="date"
                          className="rounded-lg border px-3 py-2 [border-color:var(--hairline)] [background:var(--bg)]"
                        />
                      </label>
                      <input
                        name="note"
                        placeholder="Note"
                        maxLength={300}
                        className="min-w-40 flex-1 rounded-lg border px-3 py-2 text-xs [border-color:var(--hairline)] [background:var(--bg)]"
                      />
                      <button
                        name="action"
                        value="verify"
                        className="rounded-lg px-4 py-2 text-xs font-semibold [color:var(--on-accent)] [background:var(--accent)]"
                      >
                        Verify
                      </button>
                      <button
                        name="action"
                        value="reject"
                        className="rounded-lg border px-4 py-2 text-xs [border-color:var(--hairline)] [color:var(--danger)]"
                      >
                        Reject
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          Open joiner / mover / leaver events
        </h2>
        {jml.length === 0 ? (
          <p className="rounded-2xl px-5 py-6 text-sm panel [color:var(--muted)]">None open.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {jml.map((e) => {
              const done: string[] = Array.isArray(e.completedSteps) ? (e.completedSteps as string[]) : [];
              const steps = JML_STEPS[e.kind as keyof typeof JML_STEPS];
              return (
                <li key={e.id} className="rounded-2xl px-5 py-4 text-sm panel">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">
                      {e.kind.toLowerCase()} — {e.member.name}
                    </span>
                    <span className="text-xs [color:var(--muted)]">
                      effective {e.effectiveDate.toISOString().slice(0, 10)} · {done.length}/{steps.length} steps
                    </span>
                  </div>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {steps.map((st) => (
                      <li key={st.key}>
                        {st.automated ? (
                          <span
                            className="rounded-full px-2.5 py-1 text-xs [background:var(--overlay)] [color:var(--muted)]"
                            title={`${st.label} — done automatically when the event is closed`}
                          >
                            ⚙ {st.key}
                          </span>
                        ) : (
                          <form action="/api/hr/jml" method="post" className="inline">
                            <input type="hidden" name="action" value="step" />
                            <input type="hidden" name="eventId" value={e.id} />
                            <input type="hidden" name="step" value={st.key} />
                            <button
                              title={st.label}
                              className={`rounded-full px-2.5 py-1 text-xs [background:var(--overlay)] ${
                                done.includes(st.key) ? "[color:var(--ok)]" : "[color:var(--muted)]"
                              }`}
                            >
                              {done.includes(st.key) ? "✓ " : ""}
                              {st.key}
                            </button>
                          </form>
                        )}
                      </li>
                    ))}
                  </ul>
                  <form action="/api/hr/jml" method="post" className="mt-3">
                    <input type="hidden" name="action" value="close" />
                    <input type="hidden" name="eventId" value={e.id} />
                    <button className="rounded-xl px-4 py-2 text-xs font-semibold [color:var(--on-accent)] [background:var(--accent)]">
                      Close this event
                    </button>
                  </form>
                  {e.kind === "LEAVER" && (
                    <p className="mt-2 text-xs [color:var(--muted)]">
                      Closing revokes their sessions, burns any unused sign-in link and suspends the
                      account. The ⚙ steps happen then, rather than being ticked.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </Shell>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="rounded-2xl px-5 py-4 panel">
      <div className={`text-2xl font-extrabold ${warn ? "[color:var(--warn)]" : ""}`}>{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide [color:var(--muted)]">{label}</div>
    </div>
  );
}
