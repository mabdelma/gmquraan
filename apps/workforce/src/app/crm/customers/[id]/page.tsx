import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@app/db";
import { requireMember } from "@/lib/guard";
import { canSeeCustomer } from "@/lib/crm";
import { Shell } from "@/components/Shell";

export const dynamic = "force-dynamic";

/**
 * One customer, with the aggregated timeline.
 *
 * The timeline reads every activity linked to this customer, whichever
 * opportunity it belongs to. Nothing is copied between the two views — that is
 * the rule the module states, and it is why an activity carries both keys.
 */
export default async function CustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; done?: string }>;
}) {
  const { member, viewer } = await requireMember();
  const { id } = await params;
  const sp = await searchParams;

  const c = await prisma.customer.findUnique({
    where: { id },
    include: {
      owner: { select: { name: true } },
      opportunities: { orderBy: { updatedAt: "desc" } },
      activities: {
        orderBy: { occurredAt: "desc" },
        take: 50,
        include: { actor: { select: { name: true } }, opportunity: { select: { ref: true } } },
      },
      mergedInto: { select: { id: true, displayName: true } },
    },
  });
  if (!c || !canSeeCustomer(viewer, c)) notFound();

  const money = (minor: number | null, cur: string | null) =>
    minor && cur
      ? new Intl.NumberFormat("en", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(minor / 100)
      : "—";

  const TYPES = [
    "NEW_PROJECT",
    "VARIATION",
    "MAINTENANCE",
    "SUBSCRIPTION",
    "RENEWAL",
    "CONSULTANCY",
    "PRODUCT_SALE",
    "OTHER",
  ];

  return (
    <Shell member={member}>
      <nav className="mb-4 text-sm">
        <a href="/crm/customers" className="[color:var(--accent-text)]">
          ← Customers
        </a>
      </nav>

      {c.mergedInto && (
        <p className="mb-6 rounded-2xl px-5 py-4 text-sm panel [color:var(--warn)]">
          This record was merged into{" "}
          <Link href={`/crm/customers/${c.mergedInto.id}`} className="underline">
            {c.mergedInto.displayName}
          </Link>
          . It is kept because a merge preserves both identifiers and all history.
        </p>
      )}

      <header className="mb-6">
        <p className="font-mono text-xs [color:var(--muted)]">{c.ref}</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">{c.displayName}</h1>
        <p className="mt-1 text-sm [color:var(--muted)]">
          {c.status.toLowerCase().replace(/_/g, " ")} · owned by {c.owner.name}
          {c.country ? ` · ${c.country}` : ""}
        </p>
      </header>

      {sp.error && (
        <p role="alert" className="mb-6 rounded-2xl px-5 py-4 text-sm panel [color:var(--danger)]">
          {sp.error}
        </p>
      )}
      {sp.done && (
        <p role="status" className="mb-6 rounded-2xl px-5 py-4 text-sm panel [color:var(--ok)]">
          Recorded.
        </p>
      )}

      <section className="mb-8 grid gap-3 sm:grid-cols-2">
        <F label="Legal name" v={c.legalName ?? "—"} />
        <F label="Tax identifier" v={c.taxId ?? "—"} mono />
        <F label="Website" v={c.websiteDomain ?? "—"} />
        <F label="Email" v={c.primaryEmail ?? "—"} />
        <F label="Phone" v={c.primaryPhone ?? "—"} />
        <F label="Classification" v={c.classification.toLowerCase()} />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          Opportunities
        </h2>

        <details className="mb-3 rounded-2xl px-5 py-4 panel">
          <summary className="cursor-pointer text-sm font-semibold [color:var(--accent-text)]">
            Raise an opportunity
          </summary>
          <form action="/api/crm/opportunities" method="post" className="mt-4 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="customerId" value={c.id} />
            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
              <span className="font-medium">Name</span>
              <input
                name="name"
                required
                maxLength={200}
                className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Type</span>
              <select
                name="opportunityType"
                defaultValue="NEW_PROJECT"
                className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.toLowerCase().replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button className="rounded-xl px-5 py-3 text-sm font-semibold [color:var(--on-accent)] [background:var(--accent)]">
                Raise
              </button>
            </div>
          </form>
        </details>

        {c.opportunities.length === 0 ? (
          <p className="rounded-2xl px-5 py-6 text-sm panel [color:var(--muted)]">None yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {c.opportunities.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/crm/opportunities/${o.id}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl px-5 py-4 panel hover:[background:var(--overlay)]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{o.name}</span>
                    <span className="block font-mono text-xs [color:var(--muted)]">{o.ref}</span>
                  </span>
                  <span className="flex shrink-0 flex-wrap gap-2 text-xs">
                    <span className="rounded-full px-2.5 py-1 font-semibold [background:var(--overlay)]">
                      {o.stage.toLowerCase().replace(/_/g, " ")}
                    </span>
                    <span className="[color:var(--muted)]">{money(o.estimatedValueMinor, o.currency)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          Timeline
        </h2>
        <p className="mb-3 text-xs [color:var(--muted)]">
          Everything linked to this customer, across every opportunity. Nothing is copied — each
          entry belongs where it happened.
        </p>
        {c.activities.length === 0 ? (
          <p className="rounded-2xl px-5 py-6 text-sm panel [color:var(--muted)]">Nothing recorded.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {c.activities.map((a) => (
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
                  {a.opportunity ? ` · ${a.opportunity.ref}` : ""}
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

function F({ label, v, mono }: { label: string; v: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl px-5 py-4 panel">
      <dt className="text-xs uppercase tracking-wide [color:var(--muted)]">{label}</dt>
      <dd className={`mt-1 break-words text-sm ${mono ? "font-mono" : ""}`}>{v}</dd>
    </div>
  );
}
