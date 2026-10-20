import { prisma } from "@app/db";
import { memberOr401 } from "@/lib/guard";
import { canApprove, canTransitionLeave, type LeaveStatus } from "@app/core";
import { leaveDecided } from "@/lib/notify";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Act on a leave request: cancel your own, or decide one belonging to somebody
 * who reports to you.
 *
 * Nobody decides their own leave, whatever their approval level — that check is
 * before the level check, so an executive cannot approve their own week off.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await memberOr401();
  if (!auth) return new Response(null, { status: 303, headers: { Location: "/" } });

  const { id } = await ctx.params;
  const form = await req.formData();
  const action = String(form.get("action") || "");
  const note = String(form.get("note") || "").trim().slice(0, 300);

  const leave = await prisma.leaveRequest.findUnique({ where: { id } });
  const url = new URL(action === "cancel" ? "/leave" : "/hr", req.url);
  const fail = (m: string) => {
    url.searchParams.set("error", m);
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  };

  if (!leave) return fail("That request no longer exists.");

  const isOwn = leave.memberId === auth.member.id;
  const managesThem = (auth.viewer.reportIds ?? []).includes(leave.memberId);

  let to: LeaveStatus;
  if (action === "cancel") {
    if (!isOwn) return fail("You can only cancel your own leave.");
    to = "CANCELLED";
  } else if (action === "approve" || action === "reject") {
    if (isOwn) return fail("You cannot decide your own leave request.");
    if (!managesThem && !canApprove(auth.viewer, "A2")) {
      return fail("Only their manager, or someone at A2 or above, can decide this.");
    }
    to = action === "approve" ? "APPROVED" : "REJECTED";
  } else {
    return fail("Unknown action.");
  }

  if (!canTransitionLeave(leave.status as LeaveStatus, to)) {
    return fail(`A ${leave.status.toLowerCase()} request cannot become ${to.toLowerCase()}.`);
  }

  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.leaveRequest.update({
      where: { id },
      data: {
        status: to,
        decidedById: isOwn ? null : auth.member.id,
        decidedAt: isOwn ? null : new Date(),
        decisionNote: note || null,
      },
    }),
  ];

  // Approval draws the days down straight away rather than when the leave is
  // actually taken. A balance that only moves after the fact lets the same days
  // be booked twice over.
  const year = leave.startDate.getFullYear();
  if (to === "APPROVED" && leave.type === "ANNUAL") {
    ops.push(
      prisma.leaveBalance.updateMany({
        where: { memberId: leave.memberId, year, type: "ANNUAL" },
        data: { takenDays: { increment: leave.days } },
      })
    );
  }
  // Cancelling something already approved hands the days back.
  if (to === "CANCELLED" && leave.status === "APPROVED" && leave.type === "ANNUAL") {
    ops.push(
      prisma.leaveBalance.updateMany({
        where: { memberId: leave.memberId, year, type: "ANNUAL" },
        data: { takenDays: { decrement: leave.days } },
      })
    );
  }

  await prisma.$transaction(ops);

  // A decision the requester is not told about is a decision they will chase.
  if (!isOwn && (to === "APPROVED" || to === "REJECTED")) {
    const range = `${leave.startDate.toISOString().slice(0, 10)} to ${leave.endDate
      .toISOString()
      .slice(0, 10)}`;
    leaveDecided(leave.memberId, to, range, auth.member.name, note || null);
  }

  url.searchParams.set("done", "1");
  return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
}
