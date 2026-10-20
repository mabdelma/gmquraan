import Link from "next/link";
import { requireMember } from "@/lib/guard";
import { visibleCustomers, visibleOpportunities } from "@/lib/crm";
import { Shell } from "@/components/Shell";
import { INACTIVITY_DAYS, STAGE_PROBABILITY, inactivityBreach, type OpportunityStage } from "@app/core";

export const dynamic = "force-dynamic";

const PIPELINE: OpportunityStage[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "on_hold",
];

/**
 * The commercial pipeline.
 *
 * Weighted value is shown beside gross because a pipeline totalled at face
 * value is a wish list — a hundred thousand at five percent is not a hundred
 * thousand, and reporting it as though it were is how forecasts stop being
 * believed.
 */
export default async function CrmPage() {
  const { member, viewer } = await requireMember();

  const [customers, open] = await Promise.all([
    visibleCustomers(viewer, 500),
    visibleOpportunities(viewer, { open: true, limit: 500 }),
  ]);

  const byStage = new Map<OpportunityStage, typeof open>();
  for (const o of open) {
    const s = o.stage.toLowerCase() as OpportunityStage;
    byStage.set(s, [...(byStage.get(s) ?? []), o]);
  }

  const money = (minor: number, currency: string) =>
    new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(minor / 100);

  const gross = open.reduce((n, o) => n + (o.estimatedValueMinor ?? 0), 0);
  const weighted = open.reduce(
    (n, o) => n + ((o.estimatedValueMinor ?? 0) * (o.probability ?? 0)) / 100,
    0
  );
  const currency = open.find((o) => o.currency)?.currency ?? "EUR";

  // Anything gone quiet longer than its stage allows. This is the number that
  // makes a pipeline honest — deals do not die loudly.
  const stale = open
    .map((o) => ({
      o,
      verdict: inactivityBreach({
        stage: o.stage.toLowerCase() as OpportunityStage,
        lastActivityAt: o.lastActivityAt,
        stageEnteredAt: o.stageEnteredAt,
        followUpDate: o.followUpDate,
        priorBreaches: o.breachCount,
      }),
    }))
    .filter((x) => x.verdict.breached);

  return (
    <Shell member={member}>
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Pipeline</h1>
          <p className="mt-1 text-sm [color:var(--muted)]">
            {open.length} open · {customers.length} customer{customers.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/crm/customers"
          className="rounded-xl px-4 py-2.5 text-sm font-semibold [color:var(--on-accent)] [background:var(--accent)]"
        >
          Customers
        </Link>
      </header>

      <section className="mb-8 grid gap-3 sm:grid-cols-3">
        <Stat label="Gross pipeline" value={money(gross, currency)} />
        <Stat label="Weighted by probability" value={money(Math.round(weighted), currency)} />
        <Stat label="Gone quiet" value={String(stale.length)} warn={stale.length > 0} />
      </section>

      {stale.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
            Needs attention
          </h2>
          <ul className="flex flex-col gap-2">
            {stale.map(({ o, verdict }) => (
              <li key={o.id}>
                <Link
                  href={`/crm/opportunities/${o.id}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl px-5 py-4 panel hover:[background:var(--overlay)]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{o.name}</span>
                    <span className="block text-xs [color:var(--muted)]">
                      {o.customer.displayName} · {o.ref}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs [color:var(--warn)]">
                    {verdict.breached && verdict.reason}
                    {verdict.breached && verdict.escalate && " · escalated"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          By stage
        </h2>
        <div className="grid gap-3 lg:grid-cols-3">
          {PIPELINE.map((stage) => {
            const items = byStage.get(stage) ?? [];
            const total = items.reduce((n, o) => n + (o.estimatedValueMinor ?? 0), 0);
            return (
              <div key={stage} className="rounded-2xl px-4 py-4 panel">
                <div className="mb-3 flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-bold">
                    {stage.replace(/_/g, " ")}
                    <span className="ml-2 font-normal [color:var(--muted)]">
                      {STAGE_PROBABILITY[stage]}%
                    </span>
                  </h3>
                  <span className="text-xs [color:var(--muted)]">
                    {items.length}
                    {total > 0 && ` · ${money(total, currency)}`}
                  </span>
                </div>
                {items.length === 0 ? (
                  <p className="text-xs [color:var(--muted)]">Nothing here.</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {items.map((o) => (
                      <li key={o.id}>
                        <Link
                          href={`/crm/opportunities/${o.id}`}
                          className="block rounded-xl px-3 py-2 text-sm [background:var(--overlay)] hover:[color:var(--accent-text)]"
                        >
                          <span className="block truncate font-medium">{o.name}</span>
                          <span className="block truncate text-xs [color:var(--muted)]">
                            {o.customer.displayName}
                            {o.estimatedValueMinor && o.currency
                              ? ` · ${money(o.estimatedValueMinor, o.currency)}`
                              : ""}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {INACTIVITY_DAYS[stage] !== undefined && (
                  <p className="mt-2 text-[11px] [color:var(--muted)]">
                    Chased after {INACTIVITY_DAYS[stage]} quiet days.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </Shell>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-2xl px-5 py-4 panel">
      <div className={`text-2xl font-extrabold ${warn ? "[color:var(--warn)]" : ""}`}>{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide [color:var(--muted)]">{label}</div>
    </div>
  );
}
