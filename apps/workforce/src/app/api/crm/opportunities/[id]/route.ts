import { prisma } from "@app/db";
import { memberOr401 } from "@/lib/guard";
import { canSeeCustomer, logActivity } from "@/lib/crm";
import { GATE_MIN_LEVEL, gateFor, meetsLevel, stageMove, type OpportunityStage } from "@app/core";

export const dynamic = "force-dynamic";

/** Schema stage names are upper case; the rules module works in lower. */
const toRule = (s: string) => s.toLowerCase() as OpportunityStage;
const toDb = (s: OpportunityStage) => s.toUpperCase();

/**
 * Move an opportunity, or log an activity against it.
 *
 * Every rule the module defines is applied by @app/core rather than restated
 * here: which transitions exist, which fields each stage demands, that a
 * backward move needs a reason, and that reopening a lost opportunity needs a
 * sales manager.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await memberOr401();
  if (!auth) return new Response(null, { status: 303, headers: { Location: "/" } });

  const { id } = await ctx.params;
  const url = new URL(`/crm/opportunities/${id}`, req.url);
  const fail = (m: string) => {
    url.searchParams.set("error", m);
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  };

  const opp = await prisma.opportunity.findUnique({
    where: { id },
    include: { customer: { select: { id: true, ownerId: true, entityScope: true } } },
  });
  if (!opp) return fail("No such opportunity.");
  if (!canSeeCustomer(auth.viewer, opp.customer) && opp.ownerId !== auth.member.id) {
    return fail("That opportunity is not yours to change.");
  }

  const form = await req.formData();
  const action = String(form.get("action") || "");
  const str = (k: string) => String(form.get(k) || "").trim();

  if (action === "activity") {
    const summary = str("summary");
    if (summary.length < 3) return fail("Say what happened.");
    await logActivity({
      customerId: opp.customerId,
      opportunityId: opp.id,
      actorId: auth.member.id,
      activityType: (str("activityType") || "NOTE") as never,
      summary,
      detail: str("detail") || null,
    });
    url.searchParams.set("done", "1");
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  }

  if (action !== "stage") return fail("Unknown action.");

  const to = toRule(str("to"));
  const from = toRule(opp.stage);

  // Values the move itself supplies, merged over what is already recorded, so
  // a stage that demands a field can be satisfied in the same submission.
  const valueMinor = str("estimatedValue")
    ? Math.round(Number(str("estimatedValue")) * 100)
    : opp.estimatedValueMinor;
  const fields = {
    estimatedValue: valueMinor,
    currency: str("currency") || opp.currency,
    expectedCloseDate: str("expectedCloseDate") || opp.expectedCloseDate,
    probability: str("probability") ? Number(str("probability")) : opp.probability,
    lostReason: str("lostReason") || opp.lostReason,
    holdReason: str("holdReason") || opp.holdReason,
    followUpDate: str("followUpDate") || opp.followUpDate,
    closedAt: to === "won" || to === "lost" ? new Date() : opp.closedAt,
    handoverOwnerId: str("handoverOwnerId") || opp.handoverOwnerId,
    reason: str("reason") || null,
  };

  const verdict = stageMove(from, to, fields);
  if (!verdict.ok) return fail(verdict.reason);

  // Reopening a lost opportunity needs a sales manager. Enforced by approval
  // level rather than job title, because that is what the portal actually
  // knows and what every other gate uses.
  if (verdict.needsApproval === "sales_manager") {
    const gate = gateFor("external_send"); // HUMAN_APPROVAL — the same tier
    if (!meetsLevel(auth.member.approvalLevel, GATE_MIN_LEVEL[gate])) {
      return fail(
        `Reopening a lost opportunity needs a sales manager. Ask somebody at ${GATE_MIN_LEVEL[gate]} or above.`
      );
    }
  }

  await prisma.$transaction([
    prisma.opportunity.update({
      where: { id },
      data: {
        stage: toDb(to) as never,
        probability: verdict.probability,
        estimatedValueMinor: valueMinor ?? null,
        currency: fields.currency ?? null,
        expectedCloseDate: fields.expectedCloseDate ? new Date(fields.expectedCloseDate) : null,
        lostReason: fields.lostReason ?? null,
        lostReasonDetail: str("lostReasonDetail") || opp.lostReasonDetail,
        holdReason: fields.holdReason ?? null,
        followUpDate: fields.followUpDate ? new Date(fields.followUpDate) : null,
        handoverOwnerId: fields.handoverOwnerId ?? null,
        closedAt: to === "won" || to === "lost" ? new Date() : null,
        stageEnteredAt: new Date(),
        // A move is activity. Without this a busy opportunity would look
        // neglected to the inactivity rules the moment somebody advanced it.
        lastActivityAt: new Date(),
        // The clock restarts on a move, so a fixed problem stops escalating.
        breachCount: 0,
      },
    }),
    prisma.opportunityStageEvent.create({
      data: {
        opportunityId: id,
        fromStage: toDb(from) as never,
        toStage: toDb(to) as never,
        reason: fields.reason,
        actorId: auth.member.id,
        actorName: auth.member.name,
      },
    }),
  ]);

  await logActivity({
    customerId: opp.customerId,
    opportunityId: opp.id,
    actorId: auth.member.id,
    activityType: "STATUS_CHANGE",
    summary: `${opp.ref} moved from ${from} to ${to}`,
    detail: fields.reason,
  });

  url.searchParams.set("done", "1");
  return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
}
