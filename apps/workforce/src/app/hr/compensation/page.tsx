import { redirect } from "next/navigation";
import { prisma } from "@app/db";
import { requireMember } from "@/lib/guard";
import { Shell } from "@/components/Shell";
import {
  COMPENSATION_PERIODS,
  annualisedMinor,
  canSeeCompensation,
  canSetCompensation,
  currentCompensation,
  type CompensationPeriod,
  type GmRole,
} from "@app/core";

export const dynamic = "force-dynamic";

/**
 * Compensation.
 *
 * Reachable only by the people the policy names — Finance, the CEO and the
 * CFO. Deliberately not the line manager, and deliberately not group-wide
 * roles as a class: being technical does not come with reading everybody's
 * salary. The reasoning lives in @app/core/compensation, where somebody can
 * change it on purpose rather than discovering it in a query.
 *
 * It is also kept off every summary screen. The HR console shows headcount and
 * leave and says nothing about pay, so reaching a figure is always a deliberate
 * navigation rather than something glimpsed in passing.
 */
export default async function CompensationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; done?: string }>;
}) {
  const { member } = await requireMember();
  const viewer = { id: member.id, role: member.role as GmRole, departmentId: member.departmentId };

  // Anybody who cannot see somebody else's pay has no business on this page at
  // all — their own figure is on their profile.
  const someoneElse = { memberId: "__anyone__" };
  if (!canSeeCompensation(viewer, someoneElse)) redirect("/home");

  const sp = await searchParams;

  const people = await prisma.teamMember.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    include: {
      employeeRecord: {
        include: { compensation: { orderBy: { effectiveFrom: "desc" } } },
      },
    },
  });

  const money = (minor: number, currency: string) =>
    new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(minor / 100);

  const field =
    "rounded-xl border px-4 py-3 text-sm [border-color:var(--hairline)] [background:var(--bg)]";

  return (
    <Shell member={member}>
      <nav className="mb-4 text-sm">
        <a href="/hr" className="[color:var(--accent-text)]">
          ← People
        </a>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Compensation</h1>
        <p className="mt-1 text-sm [color:var(--muted)]">
          Visible to Finance, the CEO and the CFO. Not to line managers, and not to group-wide roles
          as a class — that is a separate decision nobody has made.
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

      <ul className="flex flex-col gap-3">
        {people.map((p) => {
          const history = p.employeeRecord?.compensation ?? [];
          const live = currentCompensation(history);
          const mayEdit = canSetCompensation(viewer, { memberId: p.id });

          return (
            <li key={p.id} className="rounded-2xl px-5 py-5 panel">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="font-bold">{p.name}</h2>
                  <p className="text-xs [color:var(--muted)]">
                    {p.employeeRecord?.employeeNo ?? "no employee number"}
                    {p.title ? ` · ${p.title}` : ""}
                  </p>
                </div>
                <span className="text-sm">
                  {live ? (
                    <>
                      <span className="font-semibold">{money(live.amountMinor, live.currency)}</span>
                      <span className="[color:var(--muted)]"> {live.period.toLowerCase()}</span>
                      {live.period !== "ANNUAL" && (
                        <span className="block text-xs [color:var(--muted)]">
                          ≈ {money(annualisedMinor(live.amountMinor, live.period as CompensationPeriod), live.currency)} a year
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="[color:var(--muted)]">nothing recorded</span>
                  )}
                </span>
              </div>

              {history.length > 1 && (
                <ul className="mt-3 flex flex-col gap-1 text-xs [color:var(--muted)]">
                  {history.slice(1).map((h) => (
                    <li key={h.id}>
                      {money(h.amountMinor, h.currency)} {h.period.toLowerCase()} from{" "}
                      {h.effectiveFrom.toISOString().slice(0, 10)}
                      {h.effectiveTo ? ` to ${h.effectiveTo.toISOString().slice(0, 10)}` : ""}
                    </li>
                  ))}
                </ul>
              )}

              {mayEdit ? (
                <form action="/api/hr/compensation" method="post" className="mt-4 grid gap-3 sm:grid-cols-4">
                  <input type="hidden" name="memberId" value={p.id} />
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">Amount</span>
                    <input name="amount" type="number" step="0.01" min="0" required className={field} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">Currency</span>
                    <select name="currency" defaultValue={live?.currency ?? "EUR"} className={field}>
                      {["EUR", "USD", "AED", "CAD", "EGP"].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">Period</span>
                    <select name="period" defaultValue="ANNUAL" className={field}>
                      {COMPENSATION_PERIODS.map((x) => (
                        <option key={x} value={x}>
                          {x.toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">From</span>
                    <input name="effectiveFrom" type="date" required className={field} />
                  </label>
                  <button className="rounded-xl px-5 py-3 text-sm font-semibold [color:var(--on-accent)] [background:var(--accent)] sm:col-span-4 sm:justify-self-start">
                    Record
                  </button>
                </form>
              ) : (
                <p className="mt-3 text-xs [color:var(--muted)]">
                  {p.id === member.id
                    ? "Your own — nobody sets their own pay, including you."
                    : "You can see this but not change it."}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}
