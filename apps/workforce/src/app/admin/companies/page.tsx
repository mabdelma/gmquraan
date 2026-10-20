import { redirect } from "next/navigation";
import { prisma } from "@app/db";
import { requireMember } from "@/lib/guard";
import { Shell } from "@/components/Shell";
import {
  COMMON_CURRENCIES,
  COMPANY_STATUSES,
  COMPANY_TRANSITIONS,
  isGroupWide,
  isRegisteredCompanyStatus,
  type CompanyStatus,
} from "@app/core";

export const dynamic = "force-dynamic";

const field =
  "rounded-xl border px-4 py-2.5 text-sm [border-color:var(--hairline)] [background:var(--bg)] [color:var(--ink)]";
const primary =
  "rounded-xl px-4 py-2.5 text-sm font-semibold [color:var(--on-accent)] [background:var(--accent)]";
const quiet =
  "rounded-xl border px-4 py-2.5 text-sm font-semibold [border-color:var(--hairline)] [color:var(--ink)]";
const danger =
  "rounded-xl px-4 py-2.5 text-sm font-semibold [color:var(--on-danger)] [background:var(--danger)]";

/**
 * Companies and business groups — the editable organisation structure (ORG-01).
 *
 * The status select only offers transitions the lifecycle actually permits, so
 * the form cannot compose a move the server will refuse. The server refuses it
 * anyway; a select is a convenience, not a control.
 *
 * The code and base currency are shown as read-only once anything is filed
 * against the company, with the reason on screen rather than as a failure after
 * pressing save.
 */
export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; done?: string }>;
}) {
  const { member } = await requireMember();
  if (!isGroupWide(member.role)) redirect("/home");
  const sp = await searchParams;

  const [companies, groups] = await Promise.all([
    prisma.company.findMany({ orderBy: { code: "asc" }, include: { group: true } }),
    prisma.businessGroup.findMany({ orderBy: { name: "asc" } }),
  ]);

  // How much is scoped against each company, which decides whether the code and
  // currency are still editable.
  const counts = new Map<string, number>();
  for (const c of companies) {
    counts.set(c.code, await prisma.teamMember.count({ where: { entityId: c.code } }));
  }

  return (
    <Shell member={member}>
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Companies</h1>
        <p className="mt-2 max-w-3xl text-sm [color:var(--muted)]">
          Legal entities and the groups they belong to. A company&rsquo;s code is the scope every
          record is filed against, so it is fixed once anything uses it.
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

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          {companies.length} {companies.length === 1 ? "company" : "companies"}
        </h2>

        <ul className="flex flex-col gap-3">
          {companies.map((c) => {
            const filed = counts.get(c.code) ?? 0;
            const locked = filed > 0;
            const status = c.status as CompanyStatus;
            const moves = COMPANY_TRANSITIONS[status] ?? [];

            return (
              <li key={c.id} className="rounded-2xl px-5 py-5 panel">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono text-sm font-bold">{c.code}</span>
                  <span className="font-medium">{c.legalName}</span>
                  <span className="text-xs [color:var(--muted)]">{c.country}</span>
                  <span className="rounded-full px-2.5 py-1 text-xs font-semibold [background:var(--overlay)]">
                    {c.baseCurrency}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold [background:var(--overlay)] ${
                      isRegisteredCompanyStatus(status) ? "" : "[color:var(--warn)]"
                    }`}
                  >
                    {status.toLowerCase().replace(/_/g, " ")}
                  </span>
                  <span className="ms-auto text-xs [color:var(--muted)]">
                    {filed} {filed === 1 ? "person" : "people"}
                  </span>
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-semibold [color:var(--muted)]">
                    Edit
                  </summary>

                  <form
                    action="/api/admin/companies"
                    method="post"
                    className="mt-4 grid gap-3 sm:grid-cols-2"
                  >
                    <input type="hidden" name="action" value="update" />
                    <input type="hidden" name="id" value={c.id} />

                    <label className="flex flex-col gap-1.5 text-sm">
                      <span className="font-medium">Code</span>
                      <input
                        name="code"
                        defaultValue={c.code}
                        readOnly={locked}
                        required
                        maxLength={24}
                        className={`${field} ${locked ? "opacity-60" : ""}`}
                      />
                      {locked && (
                        <span className="text-xs [color:var(--muted)]">
                          Fixed — {filed} record{filed === 1 ? " is" : "s are"} scoped against it.
                        </span>
                      )}
                    </label>

                    <label className="flex flex-col gap-1.5 text-sm">
                      <span className="font-medium">Base currency</span>
                      <input
                        name="baseCurrency"
                        defaultValue={c.baseCurrency}
                        readOnly={locked}
                        required
                        maxLength={3}
                        list="currencies"
                        className={`${field} ${locked ? "opacity-60" : ""}`}
                      />
                      {locked && (
                        <span className="text-xs [color:var(--muted)]">
                          Fixed — changing it would restate every figure recorded here.
                        </span>
                      )}
                    </label>

                    <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                      <span className="font-medium">Registered legal name</span>
                      <input name="legalName" defaultValue={c.legalName} required maxLength={200} className={field} />
                    </label>

                    <label className="flex flex-col gap-1.5 text-sm">
                      <span className="font-medium">Country</span>
                      <input name="country" defaultValue={c.country} required className={field} />
                    </label>

                    <label className="flex flex-col gap-1.5 text-sm">
                      <span className="font-medium">Status</span>
                      <select name="status" defaultValue={status} className={field}>
                        <option value={status}>{status.toLowerCase().replace(/_/g, " ")} (current)</option>
                        {/* Only the moves the lifecycle allows. The server checks
                            again — this just stops the form offering a dead end. */}
                        {moves.map((m) => (
                          <option key={m} value={m}>
                            {m.toLowerCase().replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                      <button className={primary}>Save</button>
                    </div>
                  </form>

                  <form action="/api/admin/companies" method="post" className="mt-3 flex items-center gap-3">
                    <input type="hidden" name="action" value="delete" />
                    <input type="hidden" name="id" value={c.id} />
                    <button className={filed === 0 ? danger : quiet} disabled={filed > 0}>
                      Delete
                    </button>
                    {filed > 0 && (
                      <span className="text-xs [color:var(--muted)]">
                        Close it instead — deleting it would orphan {filed} record
                        {filed === 1 ? "" : "s"}.
                      </span>
                    )}
                  </form>
                </details>
              </li>
            );
          })}
        </ul>
      </section>

      <details className="mb-8 rounded-2xl px-5 py-4 panel">
        <summary className="cursor-pointer text-sm font-semibold [color:var(--accent-text)]">
          Add a company
        </summary>
        <form action="/api/admin/companies" method="post" className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="action" value="create" />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Code</span>
            <input name="code" required maxLength={24} placeholder="ORG-XX" className={field} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Base currency</span>
            <input name="baseCurrency" required maxLength={3} defaultValue="EUR" list="currencies" className={field} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium">Registered legal name</span>
            <input name="legalName" required maxLength={200} className={field} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Country</span>
            <input name="country" required className={field} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Status</span>
            <select name="status" defaultValue="PLANNED" className={field}>
              {COMPANY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.toLowerCase().replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          {groups.length > 0 && (
            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
              <span className="font-medium">Group</span>
              <select name="groupId" defaultValue="" className={field}>
                <option value="">None</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="sm:col-span-2">
            <button className={primary}>Create company</button>
          </div>
        </form>
      </details>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          Business groups
        </h2>
        <ul className="mb-3 flex flex-col gap-2">
          {groups.map((g) => (
            <li key={g.id}>
              <form
                action="/api/admin/companies"
                method="post"
                className="flex flex-wrap items-end gap-2 rounded-2xl px-5 py-4 panel"
              >
                <input type="hidden" name="action" value="rename-group" />
                <input type="hidden" name="id" value={g.id} />
                <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs">
                  <span className="font-medium">Name</span>
                  <input name="name" defaultValue={g.name} required maxLength={160} className={field} />
                </label>
                <button className={quiet}>Rename</button>
              </form>
            </li>
          ))}
          {groups.length === 0 && (
            <li className="rounded-2xl px-5 py-5 text-sm panel [color:var(--muted)]">
              No groups yet. Companies can stand alone.
            </li>
          )}
        </ul>
        <form action="/api/admin/companies" method="post" className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="action" value="create-group" />
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs">
            <span className="font-medium">New group</span>
            <input name="name" required maxLength={160} className={field} />
          </label>
          <button className={quiet}>Add group</button>
        </form>
      </section>

      <datalist id="currencies">
        {COMMON_CURRENCIES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </Shell>
  );
}
