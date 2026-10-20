import { prisma } from "@app/db";
import { authenticateProduct, apiError } from "@/lib/product-api";
import { RESELLER_DISCOUNT_PERCENT, RESELLER_COMMISSION_PERCENT } from "@/lib/reseller";

export const dynamic = "force-dynamic";

/**
 * List all active reseller referral codes, for products to auto-sync into their
 * own coupon tables.
 *   GET /api/v1/reseller/codes        Authorization: Bearer <product key>
 * Returns every active code; products should upsert these and deactivate any
 * Unskinned-sourced coupon no longer present here (handles revoked/expired codes).
 */
export async function GET(req: Request) {
  const product = await authenticateProduct(req);
  if (!product) return apiError("Invalid or missing product API key", 401);

  const now = new Date();
  const coupons = await prisma.coupon.findMany({
    where: {
      isReferral: true,
      active: true,
      ownerId: { not: null },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { code: true, ownerId: true, owner: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return Response.json({
    ok: true,
    discountPercent: RESELLER_DISCOUNT_PERCENT,
    commissionPercent: RESELLER_COMMISSION_PERCENT,
    codes: coupons.map((c) => ({
      code: c.code,
      resellerId: c.ownerId,
      resellerName: c.owner?.name ?? null,
      discountPercent: RESELLER_DISCOUNT_PERCENT,
    })),
  });
}
