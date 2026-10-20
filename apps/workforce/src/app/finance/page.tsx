import { redirect } from "next/navigation";
import { prisma } from "@app/db";
import { requireMember } from "@/lib/guard";
import { Shell } from "@/components/Shell";
import { mayKeepLedger } from "@/lib/ledger";
import { ACCOUNT_TYPES, NORMAL_BALANCE, periodOf } from "@app/core";

export const dynamic = "force-dynamic";

const field =
  "rounded-xl border px-3 py-2 text-sm [border-color:var(--hairline)] [background:var(--bg)] [color:var(--ink)]";
const primary =
  "rounded-xl px-4 py-2.5 text-sm font-semibold [color:var(--on-accent)] [background:var(--accent)]";
const quiet =
  "rounded-xl border px-4 py-2.5 text-sm font-semibold [border-color:var(--hairline)] [color:var(--ink)]";

/**
 * The ledger (FIN-01).
 *
 * Amounts are rendered from the stored `Decimal` via `toFixed`, never through
 * `Number()`. Turning a Decimal into a float to display it is the same defect
 * as storing one — it just happens later and looks like a rounding quirk.
 */
export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; done?: string }>;
}) {
  const { member } = await requireMember();
  if (!mayKeepLedger(member)) redirect("/home");
  const sp = await searchParams;

  const companyId = member.entityId ?? "";
  const [accounts, entries, periods] = await Promise.all([
    prisma.ledgerAccount.findMany({ where: { companyId }, orderBy: { code: "asc" } }),
    prisma.journalEntry.findMany({
      where: { companyId },
      orderBy: { date: "desc" },
      take: 25,
      include: { lines: { include: { account: true } } },
    }),
    prisma.accountingPeriod.findMany({ where: { companyId }, orderBy: { period: "desc" }, take: 6 }),
  ]);

  const postable = accounts.filter((a) => a.postable && a.active);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Shell member={member}>
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Ledger</h1>
        <p className="mt-2 max-w-3xl text-sm [color:var(--muted)]">
          {companyId} · amounts are held to four decimal places and shown to two. A posted entry is
          never edited — corrections are reversals, so both the error and the fix stay on the record.
        </p>
      </header>

      {sp.error && (
        <p role="alert" className="mb-4 rounded-2xl px-5 py-4 text-sm panel [color:var(--danger)]">
          {sp.error}
        </p>
      )}
      {sp.done && (
        <p role="status" className="mb-4 rounded-2xl px-5 py-4 text-sm panel [color:var(--ok)]">
          {sp.done}
        </p>
      )}

      {accounts.length === 0 && (
        <p className="mb-6 rounded-2xl px-5 py-5 text-sm panel [color:var(--muted)]">
          No chart of accounts yet. Which accounts this company needs is an accounting decision, so
          none were invented — add them below.
        </p>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          Chart of accounts · {accounts.length}
        </h2>
        {accounts.length > 0 && (
          <div className="mb-3 overflow-x-auto rounded-2xl panel">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="[color:var(--muted)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Code</th>
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Normal</th>
                  <th className="px-5 py-3 font-semibold">Posting</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className="border-t [border-color:var(--hairline)]">
                    <td className="px-5 py-2.5 font-mono text-xs">{a.code}</td>
                    <td className="px-5 py-2.5">{a.name}</td>
                    <td className="px-5 py-2.5 [color:var(--muted)]">{a.type.toLowerCase()}</td>
                    <td className="px-5 py-2.5 [color:var(--muted)]">
                      {NORMAL_BALANCE[a.type as keyof typeof NORMAL_BALANCE]?.toLowerCase()}
                    </td>
                    <td className="px-5 py-2.5 [color:var(--muted)]">
                      {!a.active ? "inactive" : a.postable ? "postable" : "heading"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <details className="rounded-2xl px-5 py-4 panel">
          <summary className="cursor-pointer text-sm font-semibold [color:var(--accent-text)]">
            Add an account
          </summary>
          <form action="/api/finance" method="post" className="mt-4 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="action" value="create-account" />
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Code</span>
              <input name="code" required placeholder="1000" className={field} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Name</span>
              <input name="name" required className={field} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Type</span>
              <select name="type" className={field} defaultValue="ASSET">
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.toLowerCase()} · normal {NORMAL_BALANCE[t].toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm sm:mt-7">
              <input type="checkbox" name="postable" defaultChecked />
              <span>Can be posted to (uncheck for a heading)</span>
            </label>
            <div className="sm:col-span-2">
              <button className={primary}>Add account</button>
            </div>
          </form>
        </details>
      </section>

      {postable.length >= 2 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
            Post a journal entry
          </h2>
          <form action="/api/finance" method="post" className="rounded-2xl px-5 py-5 panel">
            <input type="hidden" name="action" value="post-journal" />
            <div className="grid gap-3 sm:grid-cols-4">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Reference</span>
                <input name="reference" required placeholder="JE-0001" className={field} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Date</span>
                <input name="date" type="date" required defaultValue={today} className={field} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Currency</span>
                <input name="currency" required defaultValue="EUR" maxLength={3} className={field} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Memo</span>
                <input name="memo" className={field} />
              </label>
            </div>

            <table className="mt-4 w-full text-left text-sm">
              <thead className="[color:var(--muted)]">
                <tr>
                  <th className="py-2 pe-3 font-semibold">Account</th>
                  <th className="py-2 pe-3 font-semibold">Debit</th>
                  <th className="py-2 pe-3 font-semibold">Credit</th>
                  <th className="py-2 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2, 3].map((i) => (
                  <tr key={i}>
                    <td className="py-1 pe-3">
                      <select name="lineAccount" defaultValue="" className={field}>
                        <option value="">—</option>
                        {postable.map((a) => (
                          <option key={a.id} value={a.code}>
                            {a.code} {a.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pe-3">
                      <input name="lineDebit" inputMode="decimal" placeholder="0.00" className={field} />
                    </td>
                    <td className="py-1 pe-3">
                      <input name="lineCredit" inputMode="decimal" placeholder="0.00" className={field} />
                    </td>
                    <td className="py-1">
                      <input name="lineDescription" className={field} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="mt-3 text-xs [color:var(--muted)]">
              Debits must equal credits exactly. Put an amount on one side of a line, never both.
            </p>
            <button className={`${primary} mt-3`}>Post entry</button>
          </form>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          Recent entries
        </h2>
        {entries.length === 0 ? (
          <p className="rounded-2xl px-5 py-6 text-sm panel [color:var(--muted)]">Nothing posted yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {entries.map((e) => (
              <li key={e.id} className="rounded-2xl px-5 py-4 panel">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono text-sm font-semibold">{e.reference}</span>
                  <span className="text-xs [color:var(--muted)]">
                    {e.date.toISOString().slice(0, 10)} · {e.period}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold [background:var(--overlay)] ${
                      e.state === "REVERSED" ? "[color:var(--warn)]" : ""
                    }`}
                  >
                    {e.state.toLowerCase()}
                  </span>
                  <span className="ms-auto font-mono text-sm">
                    {/* toFixed on the Decimal, never Number(). */}
                    {e.totalDebit.toFixed(2)} {e.currency}
                  </span>
                </div>
                {e.memo && <p className="mt-1 text-sm [color:var(--muted)]">{e.memo}</p>}

                <table className="mt-2 w-full text-left text-xs">
                  <tbody>
                    {e.lines.map((l) => (
                      <tr key={l.id} className="border-t [border-color:var(--hairline)]">
                        <td className="py-1 pe-3 font-mono">{l.account.code}</td>
                        <td className="py-1 pe-3">{l.account.name}</td>
                        <td className="py-1 pe-3 text-right font-mono">
                          {l.debit.isZero() ? "" : l.debit.toFixed(2)}
                        </td>
                        <td className="py-1 text-right font-mono">
                          {l.credit.isZero() ? "" : l.credit.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {e.state === "POSTED" && (
                  <form action="/api/finance" method="post" className="mt-3 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="action" value="reverse-journal" />
                    <input type="hidden" name="entryId" value={e.id} />
                    <label className="flex flex-col gap-1 text-xs">
                      <span className="font-medium">Reversal reference</span>
                      <input name="reference" required placeholder={`${e.reference}-R`} className={field} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                      <span className="font-medium">On</span>
                      <input name="on" type="date" defaultValue={today} className={field} />
                    </label>
                    <button className={quiet}>Reverse</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          Periods
        </h2>
        <ul className="mb-3 flex flex-wrap gap-2">
          {periods.map((p) => (
            <li
              key={p.id}
              className="rounded-full px-3 py-1.5 text-xs font-semibold [background:var(--overlay)]"
            >
              {p.period} · {p.status.toLowerCase()}
            </li>
          ))}
          {periods.length === 0 && (
            <li className="text-sm [color:var(--muted)]">
              No period has been closed. Everything is open.
            </li>
          )}
        </ul>
        <form action="/api/finance" method="post" className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="action" value="close-period" />
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium">Close period</span>
            <input name="period" required defaultValue={periodOf(today)} placeholder="2026-08" className={field} />
          </label>
          <button className={quiet}>Close</button>
        </form>
      </section>
    </Shell>
  );
}
