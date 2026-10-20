import { redirect } from "next/navigation";
import { prisma } from "@app/db";
import { requireMember } from "@/lib/guard";
import { Shell } from "@/components/Shell";
import {
  APPROVAL_LEVELS,
  CONFIDENTIALITY,
  DEPARTMENTS,
  DEPARTMENT_IDS,
  ENTITIES,
  ENTITY_IDS,
  GM_ROLES,
  ROLE_DEFAULT_LEVEL,
  isGroupWide,
  packGaps,
  requiredDocumentsForRole,
  type GmRole,
} from "@app/core";

export const dynamic = "force-dynamic";

/**
 * Placing people into the organisation.
 *
 * The structure has existed since the org chart was generated; what was missing
 * was any way to put somebody in it. Everything on this page is one form per
 * person, posting the whole placement at once — role, level, clearance, branch,
 * department, seat and reporting line — because those move together. Changing
 * somebody's role without their approval level is how a manager ends up unable
 * to approve anything, or an employee able to approve everything.
 */
export default async function AdminPeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; done?: string }>;
}) {
  const { member } = await requireMember();
  const mayEdit = isGroupWide(member.role) || member.departmentId === "PEO";
  if (!mayEdit) redirect("/home");
  const sp = await searchParams;

  const [people, seats] = await Promise.all([
    prisma.teamMember.findMany({
      where: { status: { not: "OFFBOARDED" } },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      include: { employeeRecord: true, position: true, packItems: true },
    }),
    prisma.orgPosition.findMany({
      orderBy: [{ entityId: "asc" }, { tier: "asc" }],
      include: { holder: { select: { id: true, name: true } } },
    }),
  ]);

  const managers = people.filter((p) => p.role !== "EMPLOYEE" && p.role !== "EXTERNAL");
  const neverSignedIn = people.filter((p) => !p.lastLoginAt);

  return (
    <Shell member={member}>
      <nav className="mb-4 text-sm">
        <a href="/admin" className="[color:var(--accent-text)]">
          ← Administration
        </a>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">People and placement</h1>
        <p className="mt-1 text-sm [color:var(--muted)]">
          {people.length} people · {seats.filter((s) => s.holder).length} of {seats.length} seats filled.
          Role, level, clearance and seat move together — they are one decision, so they are one form.
        </p>
      </header>

      {sp.done && (
        <p role="status" className="mb-6 rounded-2xl px-5 py-4 text-sm panel [color:var(--ok)]">
          {sp.done === "1" ? "Saved." : sp.done}
        </p>
      )}
      {sp.error && (
        <p role="alert" className="mb-6 rounded-2xl px-5 py-4 text-sm panel [color:var(--danger)]">
          {sp.error}
        </p>
      )}

      {neverSignedIn.length > 0 && (
        <section className="mb-6 rounded-2xl px-5 py-5 panel">
          <h2 className="text-sm font-bold">
            {neverSignedIn.length} {neverSignedIn.length === 1 ? "person has" : "people have"} never
            signed in
          </h2>
          <p className="mt-1 text-sm [color:var(--muted)]">
            {neverSignedIn.map((p) => p.name).join(", ")}. Their accounts exist; nobody has told
            them. Everything else in the portal is waiting on this.
          </p>
          <form action="/api/admin/invite" method="post" className="mt-4">
            <input type="hidden" name="all" value="1" />
            <button className="rounded-xl px-5 py-3 text-sm font-semibold [color:var(--on-accent)] [background:var(--accent)]">
              Invite all {neverSignedIn.length}
            </button>
          </form>
        </section>
      )}

      <ul className="flex flex-col gap-3">
        {people.map((p) => {
          const required = requiredDocumentsForRole(p.role as GmRole, p.employeeRecord?.employmentType ?? "FULL_TIME");
          const gaps = packGaps(
            required,
            p.packItems.map((i) => ({ code: i.code, status: i.status, expiresAt: i.expiresAt }))
          );
          const mandatoryGaps = gaps.filter((g) => g.mandatory).length;

          // Seats this person could take: their own, plus anything vacant that
          // matches the role they are being given.
          const openSeats = seats.filter((s) => !s.holder || s.holder.id === p.id);

          return (
            <li key={p.id} className="rounded-2xl px-5 py-5 panel">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="font-bold">{p.name}</h2>
                  <p className="text-xs [color:var(--muted)]">
                    {p.email}
                    {p.title ? ` · ${p.title}` : ""}
                  </p>
                </div>
                <span className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full px-2.5 py-1 font-semibold [background:var(--overlay)]">
                    {p.employeeRecord?.employeeNo ?? "no employee number"}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 font-semibold [background:var(--overlay)] ${
                      p.lastLoginAt ? "[color:var(--ok)]" : "[color:var(--warn)]"
                    }`}
                  >
                    {p.lastLoginAt
                      ? `signed in ${p.lastLoginAt.toISOString().slice(0, 10)}`
                      : p.invitedAt
                        ? `invited ${p.invitedAt.toISOString().slice(0, 10)}, not yet in`
                        : "never invited"}
                  </span>
                  {p.totpEnabled && (
                    <span className="rounded-full px-2.5 py-1 font-semibold [background:var(--overlay)] [color:var(--ok)]">
                      2FA on
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-1 font-semibold [background:var(--overlay)] ${
                      mandatoryGaps ? "[color:var(--warn)]" : "[color:var(--ok)]"
                    }`}
                  >
                    {mandatoryGaps
                      ? `${mandatoryGaps} document(s) outstanding`
                      : `file complete (${required.length} items)`}
                  </span>
                </span>
              </div>

              <form action="/api/admin/people" method="post" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <input type="hidden" name="memberId" value={p.id} />

                <Select name="role" label="Role" value={p.role}>
                  {GM_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.replace(/_/g, " ")} (default {ROLE_DEFAULT_LEVEL[r]})
                    </option>
                  ))}
                </Select>

                <Select name="approvalLevel" label="Approval level" value={p.approvalLevel}>
                  {APPROVAL_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </Select>

                <Select name="clearance" label="Clearance" value={p.clearance}>
                  {CONFIDENTIALITY.map((c) => (
                    <option key={c} value={c}>
                      {c.toLowerCase()}
                    </option>
                  ))}
                </Select>

                <Select name="entityId" label="Branch" value={p.entityId ?? ""}>
                  <option value="">— none —</option>
                  {ENTITY_IDS.map((e) => (
                    <option key={e} value={e}>
                      {ENTITIES[e].country}
                    </option>
                  ))}
                </Select>

                <Select name="departmentId" label="Department" value={p.departmentId ?? ""}>
                  <option value="">— none —</option>
                  {DEPARTMENT_IDS.map((d) => (
                    <option key={d} value={d}>
                      {DEPARTMENTS[d].name}
                    </option>
                  ))}
                </Select>

                <Select name="managerId" label="Reports to" value={p.managerId ?? ""}>
                  <option value="">— nobody —</option>
                  {managers
                    .filter((m) => m.id !== p.id)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                </Select>

                <Select name="positionId" label="Seat" value={p.positionId ?? ""}>
                  <option value="">— unplaced —</option>
                  {openSeats.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code}
                    </option>
                  ))}
                </Select>

                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium">Employee number</span>
                  <input
                    name="employeeNo"
                    defaultValue={p.employeeRecord?.employeeNo ?? ""}
                    placeholder="leave blank to auto-issue"
                    className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
                  />
                </label>

                <div className="flex items-end">
                  <button className="w-full rounded-xl px-5 py-3 text-sm font-semibold [color:var(--on-accent)] [background:var(--accent)]">
                    Save placement
                  </button>
                </div>
              </form>

              <form action="/api/admin/invite" method="post" className="mt-3">
                <input type="hidden" name="memberId" value={p.id} />
                <button className="rounded-xl border px-4 py-2.5 text-sm [border-color:var(--hairline)]">
                  {p.lastLoginAt ? "Send a fresh sign-in link" : p.invitedAt ? "Invite again" : "Invite"}
                </button>
              </form>

              {gaps.length > 0 && (
                <p className="mt-3 text-xs [color:var(--muted)]">
                  Outstanding: {gaps.map((g) => `${g.name} (${g.reason})`).join(" · ")}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}

function Select({
  name,
  label,
  value,
  children,
}: {
  name: string;
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <select
        name={name}
        defaultValue={value}
        className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
      >
        {children}
      </select>
    </label>
  );
}
