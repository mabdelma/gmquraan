import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@app/db";
import { requireMember } from "@/lib/guard";
import { canSeeCustomer } from "@/lib/crm";
import { Shell } from "@/components/Shell";
import {
  STAGE_PROBABILITY,
  STAGE_TRANSITIONS,
  inactivityBreach,
  missingStageFields,
  type OpportunityStage,
} from "@app/core";

export const dynamic = "force-dynamic";

/**
 * One opportunity, with its own workflow.
 *
 * The move form asks for whatever the target stage requires and nothing else,
 * so the fields appear when they become relevant rather than sitting empty
 * from the start. The endpoint re-checks all of it — the form is a courtesy,
 * not the control.
 */
export default async function OpportunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; done?: string; to?: string }>;
}) {
  const { member, viewer } = await requireMember();
  const { id } = await params;
  const sp = await searchParams;

  const o = await prisma.opportunity.findUnique({
    where: { id },
    include: {
      owner: { select: { name: true } },
      customer: { select: { id: true, displayName: true, ownerId: true, entityScope: true } },
      stages: { orderBy: { at: "desc" }, take: 30 },
      activities: {
        orderBy: { occurredAt: "desc" },
        take: 30,
        include: { actor: { select: { name: true } } },
      },
    },
  });
  if (!o || (!canSeeCustomer(viewer, o.customer) && o.ownerId !== member.id)) notFound();

  const stage = o.stage.toLowerCase() as OpportunityStage;
  const next = STAGE_TRANSITIONS[stage];
  const target = (sp.to?.toLowerCase() as OpportunityStage) || null;
  const needed = target ? missingStageFields(target, {}) : [];

  const breach = inactivityBreach({
    stage,
    lastActivityAt: o.lastActivityAt,
    stageEnteredAt: o.stageEnteredAt,
    followUpDate: o.followUpDate,
    priorBreaches: o.breachCount,
  });

  const money = (minor: number | null, cur: string | null) =>
    minor && cur
      ? new Intl.NumberFormat("en", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(minor / 100)
      : "not set";

  const field =
    "rounded-xl border px-4 py-3 text-sm [border-color:var(--hairline)] [background:var(--bg)]";

  return (
    <Shell member={member}>
      <nav className="mb-4 text-sm">
        <Link href={`/crm/customers/${o.customer.id}`} className="[color:var(--accent-text)]">
          ← {o.customer.displayName}
        </Link>
      </nav>

      <header className="mb-6">
        <p className="font-mono text-xs [color:var(--muted)]">{o.ref}</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">{o.name}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full px-2.5 py-1 font-semibold [background:var(--overlay)]">
            {stage.replace(/_/g, " ")}
          </span>
          <span className="rounded-full px-2.5 py-1 font-semibold [background:var(--overlay)]">
            {o.probability ?? STAGE_PROBABILITY[stage]}%
          </span>
          <span className="[color:var(--muted)]">
            {money(o.estimatedValueMinor, o.currency)} · owned by {o.owner.name}
          </span>
        </div>
      </header>

      {sp.error && (
        <p role="alert" className="mb-6 rounded-2xl px-5 py-4 text-sm panel [color:var(--danger)]">
          {sp.error}
        </p>
      )}
      {breach.breached && (
        <p className="mb-6 rounded-2xl px-5 py-4 text-sm panel [color:var(--warn)]">
          {breach.reason}
          {breach.escalate && " This is a repeat, so it has been escalated."}
        </p>
      )}

      {next.length > 0 && (
        <section className="mb-8 rounded-2xl px-5 py-5 panel">
          <h2 className="mb-3 text-sm font-bold">Move this opportunity</h2>

          <div className="mb-4 flex flex-wrap gap-2">
            {next.map((s) => (
              <Link
                key={s}
                href={`/crm/opportunities/${o.id}?to=${s}`}
                className={`rounded-xl border px-4 py-2.5 text-sm font-medium [border-color:var(--hairline)] ${
                  target === s ? "[background:var(--overlay)]" : ""
                }`}
              >
                {s.replace(/_/g, " ")}
              </Link>
            ))}
          </div>

          {target && (
            <form action={`/api/crm/opportunities/${o.id}`} method="post" className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="action" value="stage" />
              <input type="hidden" name="to" value={target} />

              {needed.includes("estimated value") && (
                <L label="Estimated value">
                  <input name="estimatedValue" type="number" step="0.01" min="0" required className={field} />
                </L>
              )}
              {needed.includes("currency") && (
                <L label="Currency">
                  <select name="currency" defaultValue="EUR" className={field}>
                    <option>EUR</option>
                    <option>USD</option>
                    <option>AED</option>
                    <option>CAD</option>
                    <option>EGP</option>
                  </select>
                </L>
              )}
              {needed.includes("expected close date") && (
                <L label="Expected close">
                  <input name="expectedCloseDate" type="date" required className={field} />
                </L>
              )}
              {needed.includes("probability") && (
                <L label="Probability %">
                  <input
                    name="probability"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={STAGE_PROBABILITY[target]}
                    required
                    className={field}
                  />
                </L>
              )}
              {needed.includes("hold reason") && (
                <L label="Why on hold">
                  <input name="holdReason" required maxLength={300} className={field} />
                </L>
              )}
              {needed.includes("follow-up date") && (
                <L label="Follow up on">
                  <input name="followUpDate" type="date" required className={field} />
                </L>
              )}
              {needed.includes("lost reason") && (
                <>
                  <L label="Lost reason">
                    <select name="lostReason" required defaultValue="" className={field}>
                      <option value="" disabled>
                        Choose…
                      </option>
                      <option>Price</option>
                      <option>Timing</option>
                      <option>Lost to competitor</option>
                      <option>No budget</option>
                      <option>No decision</option>
                      <option>Requirement changed</option>
                      <option>No response</option>
                      <option>Other</option>
                    </select>
                  </L>
                  <L label="Detail">
                    <input name="lostReasonDetail" maxLength={300} className={field} />
                  </L>
                </>
              )}
              {needed.includes("delivery handover owner") && (
                <L label="Delivery handover owner">
                  <select name="handoverOwnerId" required defaultValue="" className={field}>
                    <option value="" disabled>
                      Choose…
                    </option>
                    {(
                      await prisma.teamMember.findMany({
                        where: { status: "ACTIVE" },
                        orderBy: { name: "asc" },
                        select: { id: true, name: true },
                      })
                    ).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </L>
              )}

              <L label="Reason (required when moving backwards)" wide>
                <input name="reason" maxLength={300} className={field} />
              </L>

              <button className="rounded-xl px-5 py-3 text-sm font-semibold [color:var(--on-accent)] [background:var(--accent)] sm:col-span-2 sm:justify-self-start">
                Move to {target.replace(/_/g, " ")}
              </button>
            </form>
          )}
        </section>
      )}

      <section className="mb-8 rounded-2xl px-5 py-5 panel">
        <h2 className="mb-3 text-sm font-bold">Log an activity</h2>
        <form action={`/api/crm/opportunities/${o.id}`} method="post" className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="action" value="activity" />
          <L label="What">
            <select name="activityType" defaultValue="CALL" className={field}>
              {["CALL", "MEETING", "EMAIL", "WHATSAPP", "NOTE", "PROPOSAL", "DOCUMENT"].map((t) => (
                <option key={t} value={t}>
                  {t.toLowerCase()}
                </option>
              ))}
            </select>
          </L>
          <L label="Summary">
            <input name="summary" required maxLength={200} className={field} />
          </L>
          <L label="Detail" wide>
            <input name="detail" maxLength={1000} className={field} />
          </L>
          <button className="rounded-xl px-5 py-3 text-sm font-semibold [color:var(--on-accent)] [background:var(--accent)] sm:col-span-2 sm:justify-self-start">
            Record
          </button>
        </form>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          Stage history
        </h2>
        <ol className="flex flex-col gap-2">
          {o.stages.map((s) => (
            <li key={s.id} className="rounded-2xl px-5 py-3 text-sm panel">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span>
                  <span className="font-medium">{s.actorName ?? s.actorId}</span>{" "}
                  <span className="[color:var(--muted)]">
                    {s.fromStage
                      ? `moved it from ${s.fromStage.toLowerCase()} to ${s.toStage.toLowerCase()}`
                      : `opened it at ${s.toStage.toLowerCase()}`}
                  </span>
                </span>
                <time className="text-xs [color:var(--muted)]" dateTime={s.at.toISOString()}>
                  {s.at.toISOString().slice(0, 10)}
                </time>
              </div>
              {s.reason && <p className="mt-1 text-xs [color:var(--muted)]">{s.reason}</p>}
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          Activity
        </h2>
        {o.activities.length === 0 ? (
          <p className="rounded-2xl px-5 py-6 text-sm panel [color:var(--muted)]">Nothing recorded.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {o.activities.map((a) => (
              <li key={a.id} className="rounded-2xl px-5 py-3 text-sm panel">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span>
                    <span className="rounded-full px-2 py-0.5 text-xs [background:var(--overlay)]">
                      {a.activityType.toLowerCase().replace(/_/g, " ")}
                    </span>{" "}
                    <span className="font-medium">{a.summary}</span>
                  </span>
                  <time className="text-xs [color:var(--muted)]" dateTime={a.occurredAt.toISOString()}>
                    {a.occurredAt.toISOString().slice(0, 10)}
                  </time>
                </div>
                <p className="mt-1 text-xs [color:var(--muted)]">
                  {a.actor.name}
                  {a.detail ? ` — ${a.detail}` : ""}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </Shell>
  );
}

function L({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${wide ? "sm:col-span-2" : ""}`}>
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}
