import { prisma } from "@app/db";
import { authenticateProduct, apiError } from "@/lib/product-api";
import { RESELLER_COMMISSION_PERCENT } from "@/lib/reseller";

export const dynamic = "force-dynamic";

/**
 * Report a sale in an external product attributed to a Unskinned reseller's code.
 *   POST /api/v1/reseller/sales
 *   Authorization: Bearer <product key>
 *   { "code":"ABCD1234", "amountCents":12000, "currency":"EUR",
 *     "externalId":"order_123", "customerRef":"cust_9" }
 * Records the reseller's commission. Idempotent on externalId.
 */
export async function POST(req: Request) {
  const product = await authenticateProduct(req);
  if (!product) return apiError("Invalid or missing product API key", 401);

  const b = await req.json().catch(() => ({}));
  const code = String(b.code || "").trim().toUpperCase();
  const amount = Math.round(Number(b.amountCents ?? b.amount));
  const currency = String(b.currency || "EUR").toUpperCase().slice(0, 3);
  const externalId = b.externalId ? String(b.externalId).slice(0, 190) : null;
  const customerRef = b.customerRef ? String(b.customerRef).slice(0, 190) : null;

  if (!code) return apiError("code is required", 400);
  if (!Number.isFinite(amount) || amount <= 0) return apiError("amountCents must be a positive integer", 400);

  // Idempotency: same externalId returns the existing record.
  if (externalId) {
    const existing = await prisma.resellerSale.findUnique({ where: { externalId } });
    if (existing) {
      return Response.json({ ok: true, idempotent: true, id: existing.id, commissionCents: existing.commission });
    }
  }

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.isReferral || !coupon.active || !coupon.ownerId) {
    return apiError("Unknown or inactive reseller code", 404);
  }

  const commission = Math.round((amount * RESELLER_COMMISSION_PERCENT) / 100);
  const sale = await prisma.resellerSale.create({
    data: {
      resellerId: coupon.ownerId,
      couponId: coupon.id,
      source: product.name,
      productKeyId: product.id,
      amount,
      currency,
      commission,
      customerRef,
      externalId,
      status: "COMPLETED",
    },
  });

  return Response.json({
    ok: true,
    id: sale.id,
    resellerId: coupon.ownerId,
    commissionCents: commission,
    commissionPercent: RESELLER_COMMISSION_PERCENT,
  });
}
