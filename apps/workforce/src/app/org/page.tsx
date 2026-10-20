import { prisma } from "@app/db";
import { requireMember } from "@/lib/guard";
import { Shell } from "@/components/Shell";
import {
  DEPARTMENTS,
  ENTITIES,
  ENTITY_IDS,
  TIERS,
  buildTree,
  flattenTree,
  isLateralTier,
  isRegisteredEntity,
  type EntityId,
  type OrgTier,
} from "@app/core";

export const dynamic = "force-dynamic";

/**
 * The organisation chart — the group, then one structure per branch.
 *
 * Vacant seats are shown as vacant. A chart that omits the roles nobody holds
 * gives a flattering and useless picture: the gaps are the most actionable
 * thing on the page.
 */
export default async function OrgPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string }>;
}) {
  const { member } = await requireMember();
  const sp = await searchParams;

  const positions = await prisma.orgPosition.findMany({
    include: { holder: { select: { id: true, name: true, email: true, title: true } } },
    orderBy: [{ tier: "asc" }, { departmentId: "asc" }],
  });

  const rows = positions.map((p) => ({
    code: p.code,
    parentCode: null as string | null,
    id: p.id,
    parentId: p.parentId,
    tier: p.tier as OrgTier,
    title: p.title,
    entityId: p.entityId,
    departmentId: p.departmentId,
    approvalLevel: p.approvalLevel,
    holder: p.holder,
  }));

  // Codes are what buildTree links on, so resolve parentId back to a code.
  const codeById = new Map(positions.map((p) => [p.id, p.code]));
  for (const r of rows) r.parentCode = r.parentId ? (codeById.get(r.parentId) ?? null) : null;

  const selected = (sp.branch as EntityId) || null;
  const branches: (EntityId | null)[] = selected ? [selected] : [null, ...ENTITY_IDS];

  const filled = rows.filter((r) => r.holder).length;

  return (
    <Shell member={member}>
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Organisation</h1>
        <p className="mt-1 text-sm [color:var(--muted)]">
          {filled} of {rows.length} seats filled across the group and {ENTITY_IDS.length} branches.
          Empty seats are shown so the gaps are visible.
        </p>
      </header>

      <nav className="mb-8 flex flex-wrap gap-2">
        <BranchLink href="/org" label="All" active={!selected} />
        {ENTITY_IDS.map((e) => (
          <BranchLink key={e} href={`/org?branch=${e}`} label={e} active={selected === e} />
        ))}
      </nav>

      {branches.map((b) => {
        const scoped = rows.filter(
          // Lateral seats are listed at the foot of the page, never drawn into
          // a tree — putting one under the CTO would read as a reporting line.
          (r) => !isLateralTier(r.tier) && (b === null ? r.entityId === null : r.entityId === b)
        );
        if (scoped.length === 0) return null;

        // Each branch is rendered as its own tree, so the group seats above it
        // do not repeat under every entity.
        const { roots, orphans } = buildTree(
          scoped.map((r) => ({
            ...r,
            parentCode: scoped.some((x) => x.code === r.parentCode) ? r.parentCode : null,
          }))
        );
        const ordered = flattenTree(roots);

        return (
          <section key={b ?? "group"} className="mb-10">
            <h2 className="mb-1 text-lg font-bold">
              {b === null ? "Group" : ENTITIES[b].legalName}
            </h2>
            <p className="mb-4 text-xs [color:var(--muted)]">
              {b === null ? (
                "Board, chief executive, executive committee and infrastructure custody."
              ) : (
                <>
                  {ENTITIES[b].country} · {ENTITIES[b].currency} ·{" "}
                  {isRegisteredEntity(b) ? "registered entity" : "operating location, not separately registered"}
                </>
              )}
            </p>

            <ul className="flex flex-col gap-1.5">
              {ordered.map((n) => (
                <SeatRow key={n.code} node={n} />
              ))}
            </ul>

            {orphans.length > 0 && (
              <p className="mt-3 text-xs [color:var(--danger)]">
                {orphans.length} seat(s) name a manager that does not exist and are shown detached.
              </p>
            )}
          </section>
        );
      })}

      <section className="rounded-2xl px-5 py-4 panel">
        <h2 className="text-sm font-bold">Beside the chain of command</h2>
        <p className="mt-1 mb-3 text-sm [color:var(--muted)]">
          Contractors, external counterparties, AI service agents and infrastructure administrators
          are recorded but never hold reports, and never hold business approval authority. An
          administrator who can restart a server cannot approve a payment.
        </p>
        <ul className="flex flex-col gap-1.5">
          {rows
            .filter((r) => isLateralTier(r.tier))
            .map((r) => (
              <SeatRow key={r.code} node={{ ...r, depth: 0 }} />
            ))}
        </ul>
      </section>
    </Shell>
  );
}

function BranchLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <a
      href={href}
      className={`rounded-xl border px-4 py-2.5 text-sm font-medium [border-color:var(--hairline)] ${
        active ? "[background:var(--accent)] [color:var(--on-accent)]" : "hover:[background:var(--overlay)]"
      }`}
    >
      {label}
    </a>
  );
}

type Seat = {
  code: string;
  depth: number;
  tier: OrgTier;
  title: string;
  departmentId: string | null;
  approvalLevel: string;
  holder: { id: string; name: string; email: string; title: string | null } | null;
};

function SeatRow({ node }: { node: Seat }) {
  const vacant = !node.holder;
  const lateral = isLateralTier(node.tier);

  return (
    <li
      // Indent tracks depth but stops at 4 so a deep branch does not run off a
      // phone screen.
      style={{ marginInlineStart: `${Math.min(node.depth, 4) * 18}px` }}
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl px-4 py-3 panel ${vacant ? "opacity-70" : ""}`}
    >
      <span className="min-w-0 flex-1">
        <span className="font-medium">{node.holder?.name ?? "Vacant"}</span>
        <span className="[color:var(--muted)]"> — {node.title}</span>
        {node.departmentId && (
          <span className="[color:var(--muted)]">
            {" "}
            ({DEPARTMENTS[node.departmentId as keyof typeof DEPARTMENTS]?.name ?? node.departmentId})
          </span>
        )}
      </span>

      <span className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full px-2.5 py-1 font-semibold [background:var(--overlay)]">
          {TIERS[node.tier].name}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 font-semibold [background:var(--overlay)] ${
            node.approvalLevel === "A0" ? "[color:var(--muted)]" : ""
          }`}
          title={lateral ? "Beside the chain of command — approves nothing" : undefined}
        >
          {node.approvalLevel}
        </span>
        {vacant && (
          <span className="rounded-full px-2.5 py-1 font-semibold [background:var(--overlay)] [color:var(--warn)]">
            vacant
          </span>
        )}
      </span>
    </li>
  );
}
