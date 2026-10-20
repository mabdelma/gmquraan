import { prisma } from "@app/db";
import { requireMember } from "@/lib/guard";
import { Shell } from "@/components/Shell";
import { DEPARTMENTS, ENTITIES, isGroupWide } from "@app/core";

export const dynamic = "force-dynamic";

/**
 * The directory.
 *
 * Everyone sees name, title, photo, work email, entity and department — enough
 * to know who a colleague is and reach them. Nothing else: no approval level,
 * no clearance, no reporting line, and no tasks. Those are visible on the
 * individual pages, to the people entitled to them.
 */
export default async function TeamPage() {
  const { member } = await requireMember();

  const people = await prisma.teamMember.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ entityId: "asc" }, { name: "asc" }],
    // Selected explicitly rather than by exclusion — a new sensitive column
    // added to the model must not appear here by default.
    select: {
      id: true,
      name: true,
      title: true,
      photo: true,
      email: true,
      entityId: true,
      departmentId: true,
      role: true,
    },
  });

  const byEntity = new Map<string, typeof people>();
  for (const p of people) {
    const key = p.entityId ?? "Unassigned";
    byEntity.set(key, [...(byEntity.get(key) ?? []), p]);
  }

  return (
    <Shell member={member}>
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Team</h1>
        <p className="mt-1 text-sm [color:var(--muted)]">
          {people.length} {people.length === 1 ? "person" : "people"} across the group.
        </p>
      </header>

      {[...byEntity.entries()].map(([entity, list]) => (
        <section key={entity} className="mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
            {ENTITIES[entity as keyof typeof ENTITIES]?.legalName ?? entity}
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl px-4 py-4 panel">
                <Avatar name={p.name} photo={p.photo} />
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="truncate text-xs [color:var(--muted)]">
                    {p.title || p.role.replace(/_/g, " ").toLowerCase()}
                  </div>
                  <a href={`mailto:${p.email}`} className="truncate text-xs [color:var(--accent-text)]">
                    {p.email}
                  </a>
                  {p.departmentId && (
                    <div className="truncate text-xs [color:var(--muted)]">
                      {DEPARTMENTS[p.departmentId as keyof typeof DEPARTMENTS]?.name ?? p.departmentId}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {isGroupWide(member.role) && (
        <p className="text-xs [color:var(--muted)]">
          You hold a group-wide role, so you can see every task and record. Personal data marked
          restricted still needs you to be named on it.
        </p>
      )}
    </Shell>
  );
}

/** Initials when there is no photo — never a broken image. */
function Avatar({ name, photo }: { name: string; photo: string | null }) {
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />;
  }
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      aria-hidden="true"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold [background:var(--surface)] [color:var(--accent-text)]"
    >
      {initials}
    </span>
  );
}
