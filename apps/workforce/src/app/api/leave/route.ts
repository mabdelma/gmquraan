import { prisma } from "@app/db";
import { memberOr401 } from "@/lib/guard";
import { LEAVE_TYPES, leaveRequestProblem, workingDays, type LeaveType } from "@app/core";

export const dynamic = "force-dynamic";

/**
 * Request leave.
 *
 * The day count is computed here and frozen onto the row rather than derived at
 * read time. Recalculating later would silently restate a balance that has
 * already been approved and reconciled — if the counting rules change, they
 * change for new requests only.
 */
export async function POST(req: Request) {
  const auth = await memberOr401();
  if (!auth) return new Response(null, { status: 303, headers: { Location: "/" } });

  const form = await req.formData();
  const type = String(form.get("type") || "ANNUAL") as LeaveType;
  const startDate = new Date(String(form.get("startDate") || ""));
  const endDate = new Date(String(form.get("endDate") || ""));
  const reason = String(form.get("reason") || "").trim().slice(0, 300);

  const url = new URL("/leave", req.url);
  const fail = (m: string) => {
    url.searchParams.set("error", m);
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  };

  if (!LEAVE_TYPES.includes(type)) return fail("Choose a leave type.");
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return fail("Enter both dates.");
  }

  const year = startDate.getFullYear();
  const [balance, pending] = await Promise.all([
    prisma.leaveBalance.findFirst({ where: { memberId: auth.member.id, year, type: "ANNUAL" } }),
    prisma.leaveRequest.aggregate({
      where: { memberId: auth.member.id, type: "ANNUAL", status: "REQUESTED" },
      _sum: { days: true },
    }),
  ]);

  const problem = leaveRequestProblem({
    from: startDate,
    to: endDate,
    type,
    entitledDays: balance?.entitledDays ?? 0,
    takenDays: balance?.takenDays ?? 0,
    pendingDays: pending._sum.days ?? 0,
  });
  if (problem) return fail(problem);

  await prisma.leaveRequest.create({
    data: {
      memberId: auth.member.id,
      type,
      status: "REQUESTED",
      startDate,
      endDate,
      days: workingDays(startDate, endDate),
      reason: reason || null,
    },
  });

  url.searchParams.set("done", "1");
  return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
}
