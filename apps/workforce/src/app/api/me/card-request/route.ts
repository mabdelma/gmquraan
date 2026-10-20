import { prisma } from "@app/db";
import { memberOr401 } from "@/lib/guard";
import { GATE_MIN_LEVEL, gateFor, isCardField } from "@app/core";

export const dynamic = "force-dynamic";

/**
 * Ask HR to correct a published card detail.
 *
 * The employee cannot change these directly, so this records the request and
 * raises the matching approval so it appears in HR's queue rather than sitting
 * in a table nobody reads. The gate comes from the autonomy matrix rather than
 * being hardcoded here, so declaring `card_correction` differently in the
 * controlled config changes this too.
 */
export async function POST(req: Request) {
  const auth = await memberOr401();
  if (!auth) return new Response(null, { status: 303, headers: { Location: "/" } });

  const form = await req.formData();
  const field = String(form.get("field") || "");
  const proposed = String(form.get("proposed") || "").trim().slice(0, 300);
  const reason = String(form.get("reason") || "").trim().slice(0, 300);

  const url = new URL("/me", req.url);
  if (!isCardField(field)) {
    url.searchParams.set("error", "That is not a business-card field.");
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  }
  if (!proposed) {
    url.searchParams.set("error", "Say what the value should be.");
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  }

  const existing = await prisma.cardChangeRequest.findFirst({
    where: { requesterId: auth.member.id, field, status: "PENDING" },
  });
  if (existing) {
    url.searchParams.set("error", `You already have a pending request for "${field}".`);
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  }

  const gate = gateFor("card_correction");
  await prisma.$transaction([
    prisma.cardChangeRequest.create({
      data: { requesterId: auth.member.id, field, proposed, reason: reason || null },
    }),
    prisma.approvalRequest.create({
      data: {
        action: "card_correction",
        gate,
        summary: `${auth.member.name} asks for their card "${field}" to read "${proposed}"`,
        minLevel: GATE_MIN_LEVEL[gate],
        requestedByKind: "HUMAN",
        requestedByRef: auth.member.id,
        payload: { field, proposed, reason },
      },
    }),
  ]);

  url.searchParams.set("requested", "1");
  return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
}
