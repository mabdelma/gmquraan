import { redirect } from "next/navigation";
import { prisma } from "@app/db";
import { requireMember } from "@/lib/guard";
import { Shell } from "@/components/Shell";
import { AGENTS, GROUP_CONFIG, assessPhases, isGroupWide, type AgentKey } from "@app/core";

export const dynamic = "force-dynamic";

/**
 * Administration — the state of the system, for the people accountable for it.
 *
 * The phase panel is derived from the database rather than declared. The
 * distinction between phase 4 and phase 5 is the one that matters and the one
 * most easily fudged in a status report: an agent that only proposes is
 * assistance, and an agent that acts unattended is autonomy. Here that is
 * whether `enabled` is true and whether any run has actually been applied.
 */
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; done?: string }>;
}) {
  const { member } = await requireMember();
  if (!isGroupWide(member.role)) redirect("/home");
  const sp = await searchParams;

  const [agents, runs, gated, tasksCreated, approvalsUsed, docs, hrRecords, reports, seats, seatsFilled, applied] =
    await Promise.all([
      prisma.agentRegistry.findMany({ orderBy: { key: "asc" } }),
      prisma.agentRun.findMany({ orderBy: { startedAt: "desc" }, take: 40 }),
      prisma.approvalRequest.count({ where: { outcome: "PENDING", requestedByKind: "AGENT" } }),
      prisma.task.count(),
      prisma.approvalRequest.count(),
      prisma.controlledDocument.count(),
      prisma.employeeRecord.count(),
      prisma.announcement.count({ where: { title: { startsWith: "GM-OS status" } } }),
      prisma.orgPosition.count(),
      prisma.teamMember.count({ where: { positionId: { not: null } } }),
      prisma.agentRun.count({ where: { outcome: "APPLIED" } }),
    ]);

  const phases = assessPhases({
    taxonomyLoaded: true,
    documentsRegistered: docs,
    tasksCreated,
    approvalsUsed,
    agentsRegistered: agents.length,
    agentsEnabled: agents.filter((a) => a.enabled).length,
    agentRunsApplied: applied,
    hrRecords,
    reportsGenerated: reports,
  });

  const total = runs.length;
  const gatedRuns = runs.filter((r) => r.outcome === "GATED" || r.outcome === "REJECTED").length;

  // A proposal from a disabled agent needs no formal approval — the policy says
  // the action is routine — but it still represents something somebody should
  // look at. Without this it would only ever appear in a scrolling log.
  const proposals = runs.filter((r) => r.outcome === "GATED" && (r.output as { summary?: string } | null)?.summary).slice(0, 15);

  return (
    <Shell member={member}>
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Administration</h1>
        <p className="mt-1 text-sm [color:var(--muted)]">
          {GROUP_CONFIG.groupName} · auto-file at {GROUP_CONFIG.aiConfidenceAutoFile}, human review below{" "}
          {GROUP_CONFIG.aiConfidenceHumanReview}.
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

      <nav className="mb-8 flex flex-wrap gap-2">
        <a
          href="/admin/people"
          className="rounded-xl px-4 py-2.5 text-sm font-semibold [color:var(--on-accent)] [background:var(--accent)]"
        >
          People and placement
        </a>
        <a href="/admin/structure" className="rounded-xl border px-4 py-2.5 text-sm [border-color:var(--hairline)]">
          Edit structure
        </a>
        <a href="/admin/companies" className="rounded-xl border px-4 py-2.5 text-sm [border-color:var(--hairline)]">
          Companies
        </a>
        <a href="/admin/audit" className="rounded-xl border px-4 py-2.5 text-sm [border-color:var(--hairline)]">
          Audit trail
        </a>
        <a href="/org" className="rounded-xl border px-4 py-2.5 text-sm [border-color:var(--hairline)]">
          Organisation chart
        </a>
        <a href="/departments" className="rounded-xl border px-4 py-2.5 text-sm [border-color:var(--hairline)]">
          Departments
        </a>
      </nav>

      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Seats filled" value={`${seatsFilled}/${seats}`} />
        <Stat label="Agent actions applied" value={applied} />
        <Stat label="Agent proposals waiting" value={gated} warn={gated > 0} />
        <Stat label="Controlled documents" value={docs} />
      </section>

      <section className="mb-10">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          Implementation phases
        </h2>
        <p className="mb-3 text-xs [color:var(--muted)]">
          Derived from what is in the database, not from a status report.
        </p>
        <ol className="flex flex-col gap-2">
          {phases.map((p) => (
            <li key={p.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 rounded-2xl px-5 py-4 panel">
              <span className="shrink-0 font-mono text-xs [color:var(--muted)]">{p.id}</span>
              <span className="min-w-0 flex-1">
                <span className="font-semibold">{p.name}</span>
                <span className="block text-xs [color:var(--muted)]">{p.outcome}</span>
                <span className="mt-1 block text-xs">{p.evidence}</span>
              </span>
              <PhaseChip state={p.state} />
            </li>
          ))}
        </ol>
      </section>

      <section className="mb-10">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          Agent register
        </h2>
        <p className="mb-3 text-xs [color:var(--muted)]">
          An agent absent from this table cannot run. One that is not enabled can only propose —
          every action it takes is recorded either way. Changing a ceiling is an access change and
          goes through the approvals queue.
        </p>
        <ul className="flex flex-col gap-2">
          {agents.map((a) => (
            <li key={a.key} className="rounded-2xl px-5 py-4 panel">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold">
                  <span className="font-mono text-xs [color:var(--muted)]">{a.key}</span> {a.name}
                </span>
                <span className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full px-2.5 py-1 font-semibold [background:var(--overlay)]">
                    ceiling: {a.maxGate.replace(/_/g, " ").toLowerCase()}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 font-semibold [background:var(--overlay)] ${
                      a.enabled ? "[color:var(--ok)]" : "[color:var(--muted)]"
                    }`}
                  >
                    {a.enabled ? "enabled" : "proposal only"}
                  </span>
                </span>
              </div>
              <p className="mt-1 text-sm [color:var(--muted)]">
                {AGENTS[a.key as AgentKey]?.purpose ?? a.purpose}
              </p>
              <form action="/api/admin/agents" method="post" className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="key" value={a.key} />
                <button
                  name="action"
                  value={a.enabled ? "disable" : "request-enable"}
                  className="rounded-xl border px-4 py-2.5 text-sm [border-color:var(--hairline)]"
                >
                  {a.enabled ? "Disable now" : "Request enabling"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          Proposals waiting on a person
        </h2>
        <p className="mb-3 text-xs [color:var(--muted)]">
          What the agents would have done. Anything needing a formal decision is in the approvals
          queue; the rest is here because the agent that suggested it is not enabled.
        </p>
        {proposals.length === 0 ? (
          <p className="rounded-2xl px-5 py-6 text-sm panel [color:var(--muted)]">
            Nothing outstanding.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {proposals.map((r) => {
              const out = r.output as { summary?: string } | null;
              return (
                <li key={r.id} className="rounded-2xl px-5 py-4 text-sm panel">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold">
                      <span className="font-mono text-xs [color:var(--muted)]">{r.agentKey}</span>{" "}
                      {out?.summary ?? r.outcome.toLowerCase()}
                    </span>
                    <time className="shrink-0 text-xs [color:var(--muted)]" dateTime={r.startedAt.toISOString()}>
                      {r.startedAt.toISOString().replace("T", " ").slice(0, 16)}
                    </time>
                  </div>
                  <div className="mt-1 text-xs [color:var(--muted)]">
                    {typeof r.confidence === "number" && <>confidence {r.confidence.toFixed(2)} · </>}
                    {r.gateReason}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          Recent agent activity
        </h2>
        <p className="mb-3 text-xs [color:var(--muted)]">
          {total === 0
            ? "No agent has run yet."
            : `${gatedRuns} of the last ${total} runs needed a human. A high number here means the agents are not earning their place.`}
        </p>
        <ul className="flex flex-col gap-2">
          {runs.map((r) => (
            <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-2 rounded-2xl px-5 py-3 text-sm panel">
              <span className="min-w-0 flex-1">
                <span className="font-mono text-xs">{r.agentKey}</span>{" "}
                <span className="font-semibold">{r.outcome.toLowerCase()}</span>
                {r.dryRun && <span className="ml-2 text-xs [color:var(--muted)]">nothing written</span>}
                {typeof r.confidence === "number" && (
                  <span className="ml-2 text-xs [color:var(--muted)]">confidence {r.confidence.toFixed(2)}</span>
                )}
                {r.gateReason && <span className="block text-xs [color:var(--muted)]">{r.gateReason}</span>}
                {r.error && <span className="block text-xs [color:var(--danger)]">{r.error}</span>}
              </span>
              <time className="shrink-0 text-xs [color:var(--muted)]" dateTime={r.startedAt.toISOString()}>
                {r.startedAt.toISOString().replace("T", " ").slice(0, 16)}
              </time>
            </li>
          ))}
        </ul>
      </section>
    </Shell>
  );
}

function PhaseChip({ state }: { state: "done" | "in_progress" | "not_started" }) {
  const tone =
    state === "done"
      ? "[color:var(--ok)]"
      : state === "in_progress"
        ? "[color:var(--warn)]"
        : "[color:var(--muted)]";
  const label = state === "done" ? "done" : state === "in_progress" ? "in progress" : "not started";
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold [background:var(--overlay)] ${tone}`}>
      {label}
    </span>
  );
}

function Stat({ label, value, warn }: { label: string; value: number | string; warn?: boolean }) {
  return (
    <div className="rounded-2xl px-5 py-4 panel">
      <div className={`text-2xl font-extrabold ${warn ? "[color:var(--warn)]" : ""}`}>{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide [color:var(--muted)]">{label}</div>
    </div>
  );
}
