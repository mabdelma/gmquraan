import { prisma } from "@app/db";
import { requireMember } from "@/lib/guard";
import { Shell } from "@/components/Shell";
import { ENTITIES, ENTITY_IDS } from "@app/core";

export const dynamic = "force-dynamic";

/**
 * The nine departments, and who runs each one in each branch.
 *
 * The manager seats come from the org structure rather than being listed
 * separately, so a vacancy here is the same vacancy shown on the org chart —
 * there is no second version of the answer to drift out of step.
 */
export default async function DepartmentsPage() {
  const { member } = await requireMember();

  const [departments, seats, headcount] = await Promise.all([
    prisma.department.findMany({
      orderBy: { position: "asc" },
      include: { head: { select: { name: true } } },
    }),
    prisma.orgPosition.findMany({
      where: { tier: { in: ["DEPARTMENT_MANAGER", "FUNCTIONAL_DIRECTOR"] } },
      include: { holder: { select: { name: true } } },
    }),
    prisma.teamMember.groupBy({
      by: ["departmentId"],
      where: { status: "ACTIVE" },
      _count: { _all: true },
    }),
  ]);

  const countByDept = new Map(headcount.map((h) => [h.departmentId, h._count._all]));

  return (
    <Shell member={member}>
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Departments</h1>
        <p className="mt-1 text-sm [color:var(--muted)]">
          {departments.length} functions across {ENTITY_IDS.length} branches. Each has a manager seat
          per branch and a director seat where the structure calls for one.
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        {departments.map((d) => {
          const mine = seats.filter((s) => s.departmentId === d.code);
          const filled = mine.filter((s) => s.holder).length;
          const people = countByDept.get(d.code) ?? 0;

          return (
            <li key={d.code} className="rounded-2xl px-5 py-5 panel">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-bold">
                  <span className="font-mono text-xs [color:var(--muted)]">{d.code}</span> {d.name}
                </h2>
                <span className="text-xs [color:var(--muted)]">
                  {people} {people === 1 ? "person" : "people"} · {filled}/{mine.length} seats filled ·
                  executive owner {d.executiveOwner}
                </span>
              </div>

              {d.purpose && <p className="mt-2 text-sm [color:var(--muted)]">{d.purpose}</p>}

              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {ENTITY_IDS.map((e) => {
                  const director = mine.find((s) => s.entityId === e && s.tier === "FUNCTIONAL_DIRECTOR");
                  const manager = mine.find((s) => s.entityId === e && s.tier === "DEPARTMENT_MANAGER");
                  return (
                    <div key={e} className="rounded-xl px-4 py-3 text-sm [background:var(--overlay)]">
                      <div className="text-xs font-semibold">{ENTITIES[e].country}</div>
                      {director && (
                        <div className="mt-1 truncate text-xs">
                          <span className="[color:var(--muted)]">Director: </span>
                          {director.holder?.name ?? <span className="[color:var(--warn)]">vacant</span>}
                        </div>
                      )}
                      <div className="mt-0.5 truncate text-xs">
                        <span className="[color:var(--muted)]">Manager: </span>
                        {manager?.holder?.name ?? <span className="[color:var(--warn)]">vacant</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}
