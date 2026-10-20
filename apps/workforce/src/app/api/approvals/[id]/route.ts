import { prisma } from "@app/db";
import { memberOr401 } from "@/lib/guard";
import { approvalSatisfied, canApprove, type ApprovalLevel, type Gate } from "@app/core";

export const dynamic = "force-dynamic";

/**
 * Record a decision on a gate.
 *
 * The separation-of-duties checks are here, not in the page: the page decides
 * what to show, this decides what is allowed. A requester cannot approve their
 * own request, nobody votes twice, and a request only resolves once
 * approvalSatisfied agrees the votes are sufficient — which for a dual gate
 * means two distinct people at the required level.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await memberOr401();
  if (!auth) return new Response(null, { status: 303, headers: { Location: "/" } });

  const { id } = await ctx.params;
  const form = await req.formData();
  const vote = String(form.get("vote") || "");
  const note = String(form.get("note") || "").slice(0, 500);

  const url = new URL("/approvals", req.url);
  const fail = (message: string) => {
    url.searchParams.set("error", message);
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  };

  if (vote !== "APPROVE" && vote !== "REJECT") return fail("Choose approve or reject.");

  const request = await prisma.approvalRequest.findUnique({
    where: { id },
    include: { decisions: true },
  });
  if (!request) return fail("That request no longer exists.");
  if (request.outcome !== "PENDING") return fail("That request has already been decided.");
  if (request.expiresAt && request.expiresAt.getTime() < Date.now()) {
    await prisma.approvalRequest.update({ where: { id }, data: { outcome: "EXPIRED" } });
    return fail("That request expired before it was decided.");
  }

  if (!canApprove(auth.viewer, request.minLevel as ApprovalLevel)) {
    return fail(`That decision needs ${request.minLevel}; your level is ${auth.member.approvalLevel}.`);
  }
  if (request.requestedByKind === "HUMAN" && request.requestedByRef === auth.member.id) {
    return fail("You cannot decide a request you raised yourself.");
  }
  if (request.decisions.some((d) => d.deciderId === auth.member.id)) {
    return fail("You have already recorded a decision on this request.");
  }

  await prisma.approvalDecision.create({
    data: {
      requestId: id,
      deciderId: auth.member.id,
      vote,
      level: auth.member.approvalLevel,
      note: note || null,
    },
  });

  // Re-read rather than append to the copy in memory: another approver may have
  // voted between the read above and this write, and for a dual gate that is
  // exactly the vote that completes it.
  const votes = await prisma.approvalDecision.findMany({ where: { requestId: id } });
  const verdict = approvalSatisfied(
    request.gate as Gate,
    votes.map((v) => ({ deciderId: v.deciderId, vote: v.vote, level: v.level as ApprovalLevel }))
  );

  if (vote === "REJECT") {
    await prisma.approvalRequest.update({
      where: { id },
      data: { outcome: "REJECTED", decidedAt: new Date(), decidedById: auth.member.id },
    });
  } else if (verdict.ok) {
    await prisma.approvalRequest.update({
      where: { id },
      data: { outcome: "APPROVED", decidedAt: new Date(), decidedById: auth.member.id },
    });
  }

  url.searchParams.set("done", "1");
  return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
}
