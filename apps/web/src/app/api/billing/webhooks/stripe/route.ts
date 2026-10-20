import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BILLING = process.env.BILLING_URL_INTERNAL || "http://localhost:8083";

/**
 * Public Stripe webhook endpoint. Stripe POSTs here; we forward the EXACT raw
 * bytes + the stripe-signature header to the internal billing service, which
 * verifies the signature and processes the event. The raw body must be passed
 * through byte-for-byte — never parse/re-serialize it, or signature checks fail.
 *
 * Configure in Stripe → Developers → Webhooks:
 *   URL:    https://example.com/api/billing/webhooks/stripe
 *   Events: checkout.session.completed, invoice.payment_succeeded,
 *           invoice.payment_failed, customer.subscription.updated,
 *           customer.subscription.deleted
 */
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature") || "";
  const raw = Buffer.from(await req.arrayBuffer());

  const res = await fetch(`${BILLING}/v1/billing/webhooks/stripe`, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": sig },
    body: raw,
  }).catch(() => null);

  if (!res) return NextResponse.json({ error: "Billing service unavailable" }, { status: 502 });
  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { "content-type": "application/json" } });
}
