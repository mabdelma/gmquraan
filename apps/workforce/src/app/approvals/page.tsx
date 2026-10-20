import { prisma } from "@app/db";
import { requireMember } from "@/lib/guard";
import { waitingOn } from "@/lib/workflow";
import { escalationDue, isOverdue } from "@app/core";
import { Shell } from "@/components/Shell";
import { APPROVAL_LIMITS, canApprove, requiredApprovers, type ApprovalLevel, type Gate } from "@app/core";

export const dynamic = "force-dynamic";

/**
 * The human gates.
 *
 * Everything the autonomy matrix will not let the system do on its own arrives
 * here: external sends, payments, restricted access changes, permanent
 * deletion. A member sees every pending request — knowing what the organisation
 * is being asked to authorise is not itself sensitive — but can only decide the
 * ones their approval level reaches, and never one they raised themselves.
 */
export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; done?: string }>;
}) {
  const { member, viewer } = await requireMember();
  const sp = await searchParams;

  const pending = await prisma.approvalRequest.findMany({
    where: { outcome: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: {
      decisions: true,
      task: { select: { ref: true, title: true } },
      document: { select: { docId: true, title: true } },
    },
  });

  // Workflow stages waiting on this person. Scope, segregation of duties and
  // "have they already decided" are all applied inside waitingOn — an inbox
  // that listed things you may not act on would be a disclosure, not a list.
  const stages = await waitingOn(member.id, viewer.companyIds);

  return (
    <Shell member={member}>
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Approvals</h1>
        <p className="mt-1 text-sm [color:var(--muted)]">
          Decisions the system is not permitted to make on its own. You can decide requests at{" "}
          {member.approvalLevel} or below — {APPROVAL_LIMITS[member.approvalLevel].description.toLowerCase()}.
        </p>
      </header>

      {stages.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
            Waiting on you
          </h2>
          <ul className="flex flex-col gap-2">
            {stages.map(({ row, definition, stage }) => {
              const instance = {
                definitionCode: row.definitionCode,
                version: row.version,
                subjectRef: row.subjectRef,
                requestedById: row.requestedById,
                subjectMemberId: row.subjectMemberId,
                currentStageKey: row.currentStageKey,
                state: row.state as "RUNNING",
                startedAt: row.startedAt,
                stageEnteredAt: row.stageEnteredAt,
                decisions: [],
              };
              const late = isOverdue(definition, instance);
              const escalate = escalationDue(definition, instance);
              const approvals = row.decisions.filter(
                (d) => d.stageKey === stage.key && d.outcome === "APPROVE"
              ).length;
              const quorum = stage.quorum ?? 1;

              return (
                <li key={row.id} className="rounded-2xl px-5 py-4 panel">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-semibold">{definition.name}</span>
                    <span className="text-xs [color:var(--muted)]">
                      {row.subjectType}/{row.subjectRef}
                    </span>
                    <span className="rounded-full px-2.5 py-1 text-xs font-semibold [background:var(--overlay)]">
                      {stage.name}
                    </span>
                    {quorum > 1 && (
                      <span className="rounded-full px-2.5 py-1 text-xs font-semibold [background:var(--overlay)]">
                        {approvals} of {quorum} approvals
                      </span>
                    )}
                    {late && (
                      <span className="rounded-full px-2.5 py-1 text-xs font-semibold [background:var(--overlay)] [color:var(--warn)]">
                        past its {stage.slaHours}h target
                      </span>
                    )}
                    {escalate && (
                      <span className="rounded-full px-2.5 py-1 text-xs font-semibold [background:var(--overlay)] [color:var(--danger)]">
                        escalating to {escalate}
                      </span>
                    )}
                  </div>

                  <form
                    action="/api/workflow/decide"
                    method="post"
                    className="mt-3 flex flex-wrap items-end gap-2"
                  >
                    <input type="hidden" name="instanceId" value={row.id} />
                    <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs">
                      <span className="font-medium">Note (optional)</span>
                      <input
                        name="note"
                        maxLength={500}
                        className="rounded-xl border px-4 py-2.5 text-sm [border-color:var(--hairline)] [background:var(--bg)]"
                      />
                    </label>
                    <button
                      name="outcome"
                      value="APPROVE"
                      className="rounded-xl px-4 py-2.5 text-sm font-semibold [color:var(--on-accent)] [background:var(--accent)]"
                    >
                      Approve
                    </button>
                    <button
                      name="outcome"
                      value="REJECT"
                      className="rounded-xl border px-4 py-2.5 text-sm font-semibold [border-color:var(--hairline)]"
                    >
                      Reject
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      )}

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

      {pending.length === 0 ? (
        <p className="rounded-2xl px-5 py-8 text-sm panel [color:var(--muted)]">
          Nothing is waiting on a decision.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pending.map((r) => {
            const needed = requiredApprovers(r.gate as Gate);
            const votes = r.decisions.filter((d) => d.vote === "APPROVE").length;
            const alreadyVoted = r.decisions.some((d) => d.deciderId === member.id);
            const raisedByMe = r.requestedByKind === "HUMAN" && r.requestedByRef === member.id;
            const eligible = canApprove(viewer, r.minLevel as ApprovalLevel) && !alreadyVoted && !raisedByMe;

            return (
              <li key={r.id} className="rounded-2xl px-5 py-5 panel">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-semibold">{r.summary}</h2>
                  <span className="rounded-full px-2.5 py-1 text-xs font-semibold [background:var(--overlay)]">
                    {r.gate.replace(/_/g, " ").toLowerCase()}
                  </span>
                </div>

                <p className="mt-1 text-sm [color:var(--muted)]">
                  Action <span className="font-mono">{r.action}</span> · requires {r.minLevel} ·{" "}
                  {votes} of {needed} approval{needed === 1 ? "" : "s"}
                  {r.task && <> · task {r.task.ref}</>}
                  {r.document && <> · document {r.document.docId}</>}
                </p>

                {r.requestedByKind === "AGENT" && (
                  <p className="mt-1 text-xs [color:var(--muted)]">
                    Raised by agent {r.requestedByRef}. No agent can decide this.
                  </p>
                )}

                {eligible ? (
                  <form action={`/api/approvals/${r.id}`} method="post" className="mt-4 flex flex-wrap gap-2">
                    <button
                      name="vote"
                      value="APPROVE"
                      className="rounded-xl px-5 py-2.5 text-sm font-semibold [color:var(--on-accent)] [background:var(--accent)]"
                    >
                      Approve
                    </button>
                    <button
                      name="vote"
                      value="REJECT"
                      className="rounded-xl border px-5 py-2.5 text-sm font-semibold [border-color:var(--hairline)] [color:var(--danger)]"
                    >
                      Reject
                    </button>
                  </form>
                ) : (
                  <p className="mt-3 text-xs [color:var(--muted)]">
                    {raisedByMe
                      ? "You raised this, so someone else has to decide it."
                      : alreadyVoted
                        ? "You have already recorded a decision on this."
                        : `This needs ${r.minLevel}; your level is ${member.approvalLevel}.`}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Shell>
  );
}
