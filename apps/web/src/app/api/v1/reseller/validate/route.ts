import { prisma } from "@app/db";
import { authenticateProduct, apiError } from "@/lib/product-api";
import { RESELLER_DISCOUNT_PERCENT, RESELLER_COMMISSION_PERCENT } from "@/lib/reseller";

export const dynamic = "force-dynamic";

/**
 * Validate a Unskinned reseller referral code from an external product.
 *   GET /api/v1/reseller/validate?code=ABCD1234
 *   Authorization: Bearer <product key>   (or X-API-Key)
 * Returns the discount the buyer gets and the commission the reseller earns.
 */
export async function GET(req: Request) {
  const product = await authenticateProduct(req);
  if (!product) return apiError("Invalid or missing product API key", 401);

  const code = new URL(req.url).searchParams.get("code")?.trim().toUpperCase() || "";
  if (!code) return apiError("code is required", 400);

  const coupon = await prisma.coupon.findUnique({
    where: { code },
    include: { owner: { select: { id: true, name: true } } }
  });

  if (!coupon || !coupon.isReferral || !coupon.active || !coupon.ownerId) {
    return Response.json({ ok: true, valid: false });
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return Response.json({ ok: true, valid: false, reason: "expired" });
  }

  return Response.json({
    ok: true,
    valid: true,
    code: coupon.code,
    resellerId: coupon.ownerId,
    resellerName: coupon.owner?.name ?? null,
    discountPercent: RESELLER_DISCOUNT_PERCENT,
    commissionPercent: RESELLER_COMMISSION_PERCENT
  });
}
