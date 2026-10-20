import { prisma } from "@app/db";
import { requireMember } from "@/lib/guard";
import { Shell } from "@/components/Shell";
import { isGroupWide } from "@app/core";

export const dynamic = "force-dynamic";

const CATEGORIES = ["LAPTOP", "PHONE", "MONITOR", "VEHICLE", "ACCESS_CARD", "OTHER"];

/**
 * Company property.
 *
 * Everybody sees what they hold; People, Operations and Finance see the whole
 * register. An asset outlives whoever currently has it, so the history is a row
 * per assignment rather than a name on the asset — the day somebody asks who
 * held a device in March, the answer has to survive it being reissued twice
 * since.
 */
export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; done?: string }>;
}) {
  const { member } = await requireMember();
  const sp = await searchParams;

  const mayManage =
    isGroupWide(member.role) || ["PEO", "OPS", "FIN"].includes(member.departmentId ?? "");

  const [mine, all, people] = await Promise.all([
    prisma.assetAssignment.findMany({
      where: { memberId: member.id, returnedAt: null },
      include: { asset: true },
      orderBy: { issuedAt: "desc" },
    }),
    mayManage
      ? prisma.asset.findMany({
          orderBy: [{ status: "asc" }, { ref: "asc" }],
          include: {
            assignments: {
              where: { returnedAt: null },
              include: { member: { select: { name: true } } },
              take: 1,
            },
          },
          take: 500,
        })
      : Promise.resolve([]),
    mayManage
      ? prisma.teamMember.findMany({
          where: { status: "ACTIVE" },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const field =
    "rounded-xl border px-4 py-3 text-sm [border-color:var(--hairline)] [background:var(--bg)]";

  return (
    <Shell member={member}>
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Equipment</h1>
        <p className="mt-1 text-sm [color:var(--muted)]">
          {mine.length === 0
            ? "Nothing is issued to you."
            : `${mine.length} item${mine.length === 1 ? "" : "s"} issued to you.`}
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

      {mine.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
            Issued to you
          </h2>
          <ul className="flex flex-col gap-2">
            {mine.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 rounded-2xl px-5 py-4 text-sm panel">
                <span>
                  <span className="font-medium">{a.asset.name}</span>
                  <span className="block font-mono text-xs [color:var(--muted)]">
                    {a.asset.ref}
                    {a.asset.serialNumber ? ` · ${a.asset.serialNumber}` : ""}
                  </span>
                </span>
                <span className="text-xs [color:var(--muted)]">
                  since {a.issuedAt.toISOString().slice(0, 10)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs [color:var(--muted)]">
            Returning it is recorded by People, Operations or Finance — not by you, so the register
            and the shelf agree.
          </p>
        </section>
      )}

      {mayManage && (
        <>
          <details className="mb-8 rounded-2xl px-5 py-4 panel">
            <summary className="cursor-pointer text-sm font-semibold [color:var(--accent-text)]">
              Add an asset
            </summary>
            <form action="/api/hr/assets" method="post" className="mt-4 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="action" value="create" />
              <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                <span className="font-medium">Name</span>
                <input name="name" required maxLength={200} className={field} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Category</span>
                <select name="category" defaultValue="LAPTOP" className={field}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.toLowerCase().replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Serial number</span>
                <input name="serialNumber" maxLength={120} className={field} />
              </label>
              <button className="rounded-xl px-5 py-3 text-sm font-semibold [color:var(--on-accent)] [background:var(--accent)] sm:col-span-2 sm:justify-self-start">
                Add
              </button>
            </form>
          </details>

          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
              Register
            </h2>
            {all.length === 0 ? (
              <p className="rounded-2xl px-5 py-6 text-sm panel [color:var(--muted)]">
                Nothing on the register yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {all.map((a) => {
                  const held = a.assignments[0];
                  return (
                    <li key={a.id} className="rounded-2xl px-5 py-4 text-sm panel">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span>
                          <span className="font-medium">{a.name}</span>
                          <span className="block font-mono text-xs [color:var(--muted)]">
                            {a.ref} · {a.category.toLowerCase().replace(/_/g, " ")}
                          </span>
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold [background:var(--overlay)] ${
                            a.status === "LOST" ? "[color:var(--danger)]" : a.status === "IN_REPAIR" ? "[color:var(--warn)]" : "[color:var(--muted)]"
                          }`}
                        >
                          {a.status.toLowerCase().replace(/_/g, " ")}
                          {held ? ` · ${held.member.name}` : ""}
                        </span>
                      </div>

                      {held ? (
                        <form action="/api/hr/assets" method="post" className="mt-3 flex flex-wrap items-end gap-2">
                          <input type="hidden" name="action" value="return" />
                          <input type="hidden" name="assignmentId" value={held.id} />
                          <label className="flex flex-col gap-1 text-xs">
                            <span className="[color:var(--muted)]">Condition on return</span>
                            <select name="condition" defaultValue="OK" className={field}>
                              <option value="OK">fine</option>
                              <option value="DAMAGED">damaged</option>
                              <option value="LOST">lost</option>
                            </select>
                          </label>
                          <button className="rounded-lg border px-4 py-2 text-xs [border-color:var(--hairline)]">
                            Record return
                          </button>
                        </form>
                      ) : (
                        a.status === "IN_STOCK" && (
                          <form action="/api/hr/assets" method="post" className="mt-3 flex flex-wrap items-end gap-2">
                            <input type="hidden" name="action" value="issue" />
                            <input type="hidden" name="assetId" value={a.id} />
                            <select name="memberId" required defaultValue="" className={field}>
                              <option value="" disabled>
                                Issue to…
                              </option>
                              {people.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                            <button className="rounded-lg px-4 py-2 text-xs font-semibold [color:var(--on-accent)] [background:var(--accent)]">
                              Issue
                            </button>
                          </form>
                        )
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </Shell>
  );
}
