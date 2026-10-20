import { redirect } from "next/navigation";
import { prisma } from "@app/db";
import { requireMember } from "@/lib/guard";
import { Shell } from "@/components/Shell";
import {
  APPROVAL_LEVELS,
  DEPARTMENTS,
  DEPARTMENT_IDS,
  ENTITIES,
  ENTITY_IDS,
  GM_ROLES,
  ORG_TIERS,
  ROLE_TIER,
  TIERS,
  buildTree,
  flattenTree,
  isLateralTier,
  memberCan,
  type GmRole,
  type OrgTier,
} from "@app/core";

export const dynamic = "force-dynamic";

/**
 * Editing the organisation structure — the seats themselves.
 *
 * Distinct from /admin/people, which puts somebody in a seat. This changes what
 * seats exist and how they report, which is what the access rules read from, so
 * every guard the org module applies when generating the default structure is
 * re-applied on save.
 */
export default async function StructurePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; done?: string; edit?: string }>;
}) {
  const { member } = await requireMember();
  const full = await prisma.teamMember.findUnique({
    where: { id: member.id },
    select: { role: true, grantedCapabilities: true },
  });
  const mayEdit = memberCan(
    { role: (full?.role ?? member.role) as GmRole, grantedCapabilities: full?.grantedCapabilities },
    "administer"
  );
  if (!mayEdit) redirect("/admin");

  const sp = await searchParams;

  const positions = await prisma.orgPosition.findMany({
    orderBy: [{ entityId: "asc" }, { tier: "asc" }, { departmentId: "asc" }],
    include: { holder: { select: { name: true } }, children: { select: { id: true } } },
  });

  const codeById = new Map(positions.map((p) => [p.id, p.code]));
  const rows = positions.map((p) => ({
    ...p,
    parentCode: p.parentId ? (codeById.get(p.parentId) ?? null) : null,
  }));

  const chain = rows.filter((r) => !isLateralTier(r.tier as OrgTier));
  const { roots } = buildTree(chain);
  const ordered = flattenTree(roots);
  const lateral = rows.filter((r) => isLateralTier(r.tier as OrgTier));

  const editing = sp.edit ? rows.find((r) => r.id === sp.edit) : null;

  return (
    <Shell member={member}>
      <nav className="mb-4 text-sm">
        <a href="/admin" className="[color:var(--accent-text)]">
          ← Administration
        </a>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Organisation structure</h1>
        <p className="mt-1 text-sm [color:var(--muted)]">
          {positions.length} seats. This changes what seats exist and how they report — putting
          somebody in one is on <a href="/admin/people" className="[color:var(--accent-text)]">People</a>.
        </p>
      </header>

      {sp.done && (
        <p role="status" className="mb-6 rounded-2xl px-5 py-4 text-sm panel [color:var(--ok)]">
          Saved.
        </p>
      )}
      {sp.error && (
        <p role="alert" className="mb-6 rounded-2xl px-5 py-4 text-sm panel [color:var(--danger)]">
          {sp.error}
        </p>
      )}

      <section className="mb-8 rounded-2xl px-5 py-5 panel">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          {editing ? `Edit ${editing.code}` : "Add a seat"}
        </h2>
        <SeatForm positions={rows} editing={editing} />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          Chain of command
        </h2>
        <ul className="flex flex-col gap-1.5">
          {ordered.map((n) => (
            <SeatRow key={n.id} seat={n} depth={n.depth} />
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest [color:var(--muted)]">
          Beside the chain
        </h2>
        <ul className="flex flex-col gap-1.5">
          {lateral.map((n) => (
            <SeatRow key={n.id} seat={n} depth={0} />
          ))}
        </ul>
      </section>
    </Shell>
  );
}

type Row = {
  id: string;
  code: string;
  tier: string;
  role: string;
  title: string;
  entityId: string | null;
  departmentId: string | null;
  approvalLevel: string;
  parentId: string | null;
  holder: { name: string } | null;
  children: { id: string }[];
};

function SeatRow({ seat, depth }: { seat: Row & { depth?: number }; depth: number }) {
  return (
    <li
      style={{ marginInlineStart: `${Math.min(depth, 4) * 18}px` }}
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl px-4 py-3 text-sm panel"
    >
      <span className="min-w-0 flex-1">
        <span className="font-medium">{seat.title}</span>
        <span className="block font-mono text-[11px] [color:var(--muted)]">{seat.code}</span>
      </span>
      <span className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full px-2.5 py-1 font-semibold [background:var(--overlay)]">
          {seat.approvalLevel}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 font-semibold [background:var(--overlay)] ${seat.holder ? "" : "[color:var(--warn)]"}`}
        >
          {seat.holder?.name ?? "vacant"}
        </span>
        <a href={`/admin/structure?edit=${seat.id}`} className="[color:var(--accent-text)]">
          Edit
        </a>
        {!seat.holder && seat.children.length === 0 && (
          <form action="/api/admin/structure" method="post" className="inline">
            <input type="hidden" name="action" value="delete" />
            <input type="hidden" name="positionId" value={seat.id} />
            <button className="[color:var(--danger)]">Delete</button>
          </form>
        )}
      </span>
    </li>
  );
}

function SeatForm({ positions, editing }: { positions: Row[]; editing: Row | null | undefined }) {
  const field = "rounded-xl border px-4 py-3 text-sm [border-color:var(--hairline)] [background:var(--bg)]";

  return (
    <form action="/api/admin/structure" method="post" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <input type="hidden" name="action" value={editing ? "update" : "create"} />
      {editing && <input type="hidden" name="positionId" value={editing.id} />}

      <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
        <span className="font-medium">Title</span>
        <input name="title" required defaultValue={editing?.title ?? ""} maxLength={120} className={field} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Tier</span>
        <select name="tier" defaultValue={editing?.tier ?? "DEPARTMENT_MANAGER"} className={field}>
          {ORG_TIERS.map((t) => (
            <option key={t} value={t}>
              {TIERS[t].name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Role</span>
        <select name="role" defaultValue={editing?.role ?? "MANAGER"} className={field}>
          {GM_ROLES.map((r) => (
            <option key={r} value={r}>
              {r.replace(/_/g, " ")} — {TIERS[ROLE_TIER[r]].name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Branch</span>
        <select name="entityId" defaultValue={editing?.entityId ?? ""} className={field}>
          <option value="">— group —</option>
          {ENTITY_IDS.map((e) => (
            <option key={e} value={e}>
              {ENTITIES[e].country}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Department</span>
        <select name="departmentId" defaultValue={editing?.departmentId ?? ""} className={field}>
          <option value="">— none —</option>
          {DEPARTMENT_IDS.map((d) => (
            <option key={d} value={d}>
              {DEPARTMENTS[d].name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Approval level</span>
        <select name="approvalLevel" defaultValue={editing?.approvalLevel ?? "A2"} className={field}>
          {APPROVAL_LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
        <span className="font-medium">Reports to</span>
        <select name="parentId" defaultValue={editing?.parentId ?? ""} className={field}>
          <option value="">— nobody (board, or beside the chain) —</option>
          {positions
            .filter((p) => p.id !== editing?.id && !isLateralTier(p.tier as OrgTier))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.title}
              </option>
            ))}
        </select>
      </label>

      <div className="flex items-end gap-2">
        <button className="rounded-xl px-5 py-3 text-sm font-semibold [color:var(--on-accent)] [background:var(--accent)]">
          {editing ? "Save seat" : "Add seat"}
        </button>
        {editing && (
          <a href="/admin/structure" className="rounded-xl border px-5 py-3 text-sm [border-color:var(--hairline)]">
            Cancel
          </a>
        )}
      </div>

      <p className="text-xs [color:var(--muted)] sm:col-span-2 lg:col-span-3">
        The code is generated from branch, department and tier — it is not yours to choose. A seat
        may only report upward, a lateral identity holds no approval level, and a change that would
        make the structure circular is refused.
      </p>
    </form>
  );
}
