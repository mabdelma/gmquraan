import { prisma } from "@app/db";
import { requireMember } from "@/lib/guard";
import { Shell } from "@/components/Shell";
import { LEAVE_TYPES, leaveRemaining } from "@app/core";

export const dynamic = "force-dynamic";

/** My leave: what is left, what is booked, and how to ask for more. */
export default async function LeavePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; done?: string }>;
}) {
  const { member } = await requireMember();
  const sp = await searchParams;
  const year = new Date().getFullYear();

  const [balance, requests, pending] = await Promise.all([
    prisma.leaveBalance.findFirst({ where: { memberId: member.id, year, type: "ANNUAL" } }),
    prisma.leaveRequest.findMany({
      where: { memberId: member.id },
      orderBy: { startDate: "desc" },
      take: 30,
      include: { decidedBy: { select: { name: true } } },
    }),
    prisma.leaveRequest.aggregate({
      where: { memberId: member.id, type: "ANNUAL", status: "REQUESTED" },
      _sum: { days: true },
    }),
  ]);

  const pendingDays = pending._sum.days ?? 0;
  const remaining = balance ? leaveRemaining({ ...balance, pendingDays }) : null;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Shell member={member}>
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Leave</h1>
        <p className="mt-1 text-sm [color:var(--muted)]">
          {balance
            ? `${remaining} of ${balance.entitledDays} annual leave days remaining for ${year}${
                pendingDays ? `, ${pendingDays} awaiting a decision` : ""
              }.`
            : "No leave balance has been opened for you yet — HR sets this from your contract."}
        </p>
      </header>

      {sp.done && (
        <p role="status" className="mb-6 rounded-2xl px-5 py-4 text-sm panel [color:var(--ok)]">
          Sent to your manager.
        </p>
      )}
      {sp.error && (
        <p role="alert" className="mb-6 rounded-2xl px-5 py-4 text-sm panel [color:var(--danger)]">
          {sp.error}
        </p>
      )}

      <section className="mb-8 rounded-2xl px-5 py-5 panel">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          Request leave
        </h2>
        <form action="/api/leave" method="post" className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Type</span>
            <select
              name="type"
              defaultValue="ANNUAL"
              className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
            >
              {LEAVE_TYPES.filter((t) => t !== "PUBLIC_HOLIDAY").map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0) + t.slice(1).toLowerCase().replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Reason (optional)</span>
            <input
              name="reason"
              maxLength={300}
              className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">From</span>
            <input
              name="startDate"
              type="date"
              required
              defaultValue={today}
              className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">To</span>
            <input
              name="endDate"
              type="date"
              required
              defaultValue={today}
              className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
            />
          </label>
          <button className="rounded-xl px-5 py-3 font-semibold [color:var(--on-accent)] [background:var(--accent)] sm:col-span-2 sm:justify-self-start">
            Request
          </button>
        </form>
        <p className="mt-3 text-xs [color:var(--muted)]">
          Counted in working days, excluding weekends. Public holidays are not deducted
          automatically — they differ by country and HR maintains that calendar.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          Your requests
        </h2>
        {requests.length === 0 ? (
          <p className="rounded-2xl px-5 py-6 text-sm panel [color:var(--muted)]">Nothing yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl px-5 py-4 panel"
              >
                <span className="min-w-0 flex-1">
                  <span className="font-medium">
                    {r.startDate.toISOString().slice(0, 10)} → {r.endDate.toISOString().slice(0, 10)}
                  </span>
                  <span className="[color:var(--muted)]">
                    {" "}
                    · {r.days} working day{r.days === 1 ? "" : "s"} · {r.type.toLowerCase()}
                  </span>
                </span>
                <span className="rounded-full px-2.5 py-1 text-xs font-semibold [background:var(--overlay)]">
                  {r.status.toLowerCase()}
                </span>
                {r.status === "REQUESTED" && (
                  <form action={`/api/leave/${r.id}`} method="post">
                    <input type="hidden" name="action" value="cancel" />
                    <button className="rounded-xl border px-3 py-2 text-xs [border-color:var(--hairline)]">
                      Cancel
                    </button>
                  </form>
                )}
                {r.decidedBy && (
                  <span className="w-full text-xs [color:var(--muted)]">
                    Decided by {r.decidedBy.name}
                    {r.decisionNote ? ` — ${r.decisionNote}` : ""}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Shell>
  );
}
