import { prisma } from "@app/db";
import { memberOr401 } from "@/lib/guard";
import { logActivity, nextOpportunityRef } from "@/lib/crm";
import { STAGE_PROBABILITY, roleCan } from "@app/core";

export const dynamic = "force-dynamic";

/** The opportunity_type enum from the module's schema. */
const TYPES = [
  "NEW_PROJECT",
  "VARIATION",
  "MAINTENANCE",
  "SUBSCRIPTION",
  "RENEWAL",
  "CONSULTANCY",
  "PRODUCT_SALE",
  "OTHER",
] as const;

/** Raise an opportunity against an existing customer. */
export async function POST(req: Request) {
  const auth = await memberOr401();
  if (!auth) return new Response(null, { status: 303, headers: { Location: "/" } });

  const form = await req.formData();
  const customerId = String(form.get("customerId") || "");
  const url = new URL(`/crm/customers/${customerId}`, req.url);
  const fail = (m: string) => {
    url.searchParams.set("error", m);
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  };

  if (!roleCan(auth.member.role, "create")) return fail("Your role cannot raise opportunities.");

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return fail("No such customer.");
  if (customer.mergedIntoId) return fail("That customer record was merged into another. Use the surviving record.");

  const name = String(form.get("name") || "").trim();
  if (name.length < 3) return fail("Give the opportunity a name.");

  const type = String(form.get("opportunityType") || "NEW_PROJECT");

  const created = await prisma.opportunity.create({
    data: {
      ref: await nextOpportunityRef(),
      customerId,
      name,
      opportunityType: ((TYPES as readonly string[]).includes(type) ? type : "NEW_PROJECT") as never,
      ownerId: auth.member.id,
      entityId: auth.member.entityId,
      stage: "NEW",
      probability: STAGE_PROBABILITY.new,
      stageEnteredAt: new Date(),
    },
  });

  await prisma.opportunityStageEvent.create({
    data: {
      opportunityId: created.id,
      toStage: "NEW",
      actorId: auth.member.id,
      actorName: auth.member.name,
    },
  });

  await logActivity({
    customerId,
    opportunityId: created.id,
    actorId: auth.member.id,
    activityType: "SYSTEM_EVENT",
    summary: `${created.ref} raised: ${name}`,
  });

  return new Response(null, { status: 303, headers: { Location: `/crm/opportunities/${created.id}` } });
}
