import { prisma } from "@app/db";
import { memberOr401 } from "@/lib/guard";
import { checkForDuplicates, logActivity, nextCustomerRef } from "@/lib/crm";
import { roleCan } from "@app/core";

export const dynamic = "force-dynamic";

/**
 * Create a customer, or link to the one that already exists.
 *
 * The canonical-customer rule is enforced here rather than hoped for. A
 * matching tax identifier blocks creation outright — that is the same legal
 * entity, and a second record for it is the duplicate the whole module exists
 * to prevent. Weaker signals ask for a decision instead of guessing.
 */
export async function POST(req: Request) {
  const auth = await memberOr401();
  if (!auth) return new Response(null, { status: 303, headers: { Location: "/" } });

  const url = new URL("/crm/customers", req.url);
  const fail = (m: string) => {
    url.searchParams.set("error", m);
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  };

  if (!roleCan(auth.member.role, "create")) return fail("Your role cannot create customers.");

  const form = await req.formData();
  const str = (k: string) => String(form.get(k) || "").trim();

  const displayName = str("displayName");
  if (displayName.length < 2) return fail("Give the customer a name.");

  const proposed = {
    displayName,
    legalName: str("legalName") || null,
    taxId: str("taxId") || null,
    websiteDomain: str("websiteDomain") || null,
    primaryEmail: str("primaryEmail") || null,
    primaryPhone: str("primaryPhone") || null,
  };

  // Unless the person has already looked at the candidates and said "no, this
  // is a different company" — which is a decision they are allowed to make for
  // the weaker signals, but never for a matching tax identifier.
  const confirmedDistinct = str("confirmedDistinct") === "1";
  const verdict = await checkForDuplicates(proposed);

  if (verdict.decision === "block_create_and_link_existing") {
    url.searchParams.set("error", verdict.because);
    url.searchParams.set("existing", verdict.matchId);
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  }

  if (verdict.decision === "request_review" && !confirmedDistinct) {
    url.searchParams.set(
      "review",
      verdict.candidates.map((c) => `${c.id}|${c.because}`).join("~~")
    );
    for (const [k, v] of Object.entries(proposed)) if (v) url.searchParams.set(k, String(v));
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  }

  const created = await prisma.customer.create({
    data: {
      ref: await nextCustomerRef(),
      displayName,
      legalName: proposed.legalName,
      taxId: proposed.taxId,
      websiteDomain: proposed.websiteDomain,
      primaryEmail: proposed.primaryEmail,
      primaryPhone: proposed.primaryPhone,
      country: str("country") || null,
      customerType: str("customerType") === "INDIVIDUAL" ? "INDIVIDUAL" : "ORGANIZATION",
      ownerId: auth.member.id,
      entityScope: auth.member.entityId ? [auth.member.entityId] : undefined,
    },
  });

  await logActivity({
    customerId: created.id,
    actorId: auth.member.id,
    activityType: "SYSTEM_EVENT",
    summary: `Customer record created by ${auth.member.name}`,
    detail: confirmedDistinct ? "Created after reviewing possible duplicates and confirming it is distinct." : null,
  });

  return new Response(null, { status: 303, headers: { Location: `/crm/customers/${created.id}` } });
}
