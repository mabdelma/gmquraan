import { notFound } from "next/navigation";
import { prisma } from "@app/db";
import { requireMember } from "@/lib/guard";
import { Shell } from "@/components/Shell";
import {
  EMPLOYEE_AREAS,
  areaPath,
  canOpenArea,
  isGroupWide,
  workspaceRoot,
  type WorkspaceArea,
} from "@app/core";

export const dynamic = "force-dynamic";

/**
 * One employee's structure.
 *
 * The tree is rendered from the area definitions rather than read from a
 * filesystem, which is the blueprint's point about folders being a presentation
 * layer: nothing has to be moved when somebody changes department, and there is
 * no directory whose permissions can drift out of step with the record's.
 *
 * `?member=` lets HR and executives open somebody else's — filtered by the same
 * rules, so a line manager opening a report's workspace sees their work and not
 * their personal file.
 */
export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string }>;
}) {
  const { member, viewer } = await requireMember();
  const sp = await searchParams;

  const subjectId = sp.member || member.id;
  const subject = await prisma.teamMember.findUnique({
    where: { id: subjectId },
    include: { employeeRecord: true, position: true },
  });
  if (!subject) notFound();

  const isSelf = subject.id === member.id;
  const isLineManager = (viewer.reportIds ?? []).includes(subject.id);
  const isHr = member.departmentId === "PEO";
  const groupWide = isGroupWide(member.role);

  // Somebody with no relationship to this person sees nothing at all, rather
  // than an empty page that confirms the person exists.
  if (!isSelf && !isLineManager && !isHr && !groupWide) notFound();

  const ctx = { isSelf, isLineManager, isHr, isGroupWide: groupWide };
  const root = workspaceRoot({ employeeNo: subject.employeeRecord?.employeeNo, email: subject.email });

  const [ownedTasks, assignedTasks, ownedDocs, approvals, leave] = await Promise.all([
    prisma.task.count({ where: { ownerId: subject.id } }),
    prisma.task.count({
      where: { assigneeId: subject.id, state: { notIn: ["COMPLETED", "ARCHIVED", "CANCELLED"] } },
    }),
    prisma.controlledDocument.count({ where: { ownerId: subject.id } }),
    prisma.approvalRequest.count({ where: { requestedByRef: subject.id } }),
    prisma.leaveRequest.count({ where: { memberId: subject.id } }),
  ]);

  const counts: Record<string, string> = {
    "02_MY_WORK": `${assignedTasks} open · ${ownedTasks} owned`,
    "03_MY_DOCUMENTS": `${ownedDocs} record${ownedDocs === 1 ? "" : "s"}`,
    "04_APPROVALS": `${approvals} raised`,
    "05_LEAVE": `${leave} request${leave === 1 ? "" : "s"}`,
    "01_PERSONAL_RECORD": subject.employeeRecord ? "Open" : "No file yet",
  };

  const openable = EMPLOYEE_AREAS.filter((a) => canOpenArea(a, ctx));
  const withheld = EMPLOYEE_AREAS.length - openable.length;

  return (
    <Shell member={member}>
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {isSelf ? "My workspace" : `${subject.name}'s workspace`}
        </h1>
        <p className="mt-1 text-sm [color:var(--muted)]">
          {subject.position?.title ?? "No seat assigned"}
          {subject.entityId ? ` · ${subject.entityId}` : ""}
          {subject.departmentId ? ` · ${subject.departmentId}` : ""}
        </p>
        <p className="mt-2 break-all font-mono text-xs [color:var(--muted)]">{root}</p>
      </header>

      <ul className="mb-8 flex flex-col gap-2">
        {openable.map((a) => (
          <AreaRow
            key={a.code}
            area={a}
            path={areaPath({ employeeNo: subject.employeeRecord?.employeeNo, email: subject.email }, a)}
            detail={counts[a.code]}
            href={linkFor(a.code, isSelf)}
          />
        ))}
      </ul>

      {withheld > 0 && (
        <p className="mb-8 rounded-2xl px-5 py-4 text-sm panel [color:var(--muted)]">
          {withheld} area{withheld === 1 ? " is" : "s are"} not shown to you. Personal and
          performance records need an explicit group, and a line manager is deliberately excluded
          from a process that might concern them.
        </p>
      )}

      {(isHr || groupWide) && isSelf && (
        <section className="rounded-2xl px-5 py-4 panel">
          <h2 className="mb-3 text-sm font-bold">Open somebody else&rsquo;s</h2>
          <form method="get" className="flex flex-wrap gap-2">
            <select
              name="member"
              className="min-w-48 flex-1 rounded-xl border px-4 py-3 text-sm [border-color:var(--hairline)] [background:var(--bg)]"
            >
              {(
                await prisma.teamMember.findMany({
                  where: { status: "ACTIVE" },
                  orderBy: { name: "asc" },
                  select: { id: true, name: true },
                })
              ).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button className="rounded-xl px-5 py-3 text-sm font-semibold [color:var(--on-accent)] [background:var(--accent)]">
              Open
            </button>
          </form>
        </section>
      )}
    </Shell>
  );
}

/** Areas that have a real page behind them link to it; the rest are structure. */
function linkFor(code: string, isSelf: boolean): string | null {
  if (!isSelf) return null;
  if (code === "02_MY_WORK") return "/tasks";
  if (code === "05_LEAVE") return "/leave";
  if (code === "04_APPROVALS") return "/approvals";
  if (code === "01_PERSONAL_RECORD") return "/me";
  return null;
}

function AreaRow({
  area,
  path,
  detail,
  href,
}: {
  area: WorkspaceArea;
  path: string;
  detail?: string;
  href: string | null;
}) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="font-medium">{area.name}</span>
        <span className="block text-xs [color:var(--muted)]">{area.purpose}</span>
        <span className="mt-1 block break-all font-mono text-[11px] [color:var(--muted)]">{path}</span>
      </span>
      <span className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
        {detail && <span className="[color:var(--muted)]">{detail}</span>}
        <span
          className={`rounded-full px-2.5 py-1 font-semibold [background:var(--overlay)] ${
            area.classification === "RESTRICTED" ? "[color:var(--warn)]" : "[color:var(--muted)]"
          }`}
        >
          {area.classification.toLowerCase()}
        </span>
      </span>
    </>
  );

  return (
    <li>
      {href ? (
        <a
          href={href}
          className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl px-5 py-4 panel hover:[background:var(--overlay)]"
        >
          {body}
        </a>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl px-5 py-4 panel">{body}</div>
      )}
    </li>
  );
}
