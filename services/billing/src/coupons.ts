import { prisma } from "@app/db";
import type { Coupon } from "@app/db";
import type { PaidPlan } from "./plans.js";

export type CouponValidation =
  | { ok: true; coupon: Coupon; discountCents: number; finalCents: number }
  | { ok: false; error: string };

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export function computeDiscount(coupon: Pick<Coupon, "discountType" | "amount">, priceCents: number): number {
  if (coupon.discountType === "PERCENT") {
    return Math.min(priceCents, Math.round((priceCents * coupon.amount) / 100));
  }
  return Math.min(priceCents, coupon.amount);
}

export async function validateCoupon(
  rawCode: string,
  plan: PaidPlan,
  priceCents: number,
  userId: string
): Promise<CouponValidation> {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, error: "Enter a coupon code" };

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.active) return { ok: false, error: "Invalid or inactive coupon" };
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return { ok: false, error: "This coupon has expired" };
  if (coupon.maxRedemptions != null && coupon.redemptions >= coupon.maxRedemptions)
    return { ok: false, error: "This coupon has reached its redemption limit" };
  if (coupon.appliesToPlan && coupon.appliesToPlan !== plan)
    return { ok: false, error: "This coupon doesn't apply to the selected plan" };
  if (coupon.assignedToUserId && coupon.assignedToUserId !== userId)
    return { ok: false, error: "This coupon is assigned to another account" };

  const discountCents = computeDiscount(coupon, priceCents);
  return { ok: true, coupon, discountCents, finalCents: Math.max(0, priceCents - discountCents) };
}

export async function recordRedemption(couponId: string): Promise<void> {
  await prisma.coupon.update({ where: { id: couponId }, data: { redemptions: { increment: 1 } } });
}

export function discountLabel(coupon: Pick<Coupon, "discountType" | "amount">, currency = "EUR"): string {
  const sym = currency === "USD" ? "$" : "€";
  return coupon.discountType === "PERCENT"
    ? `${coupon.amount}% off`
    : `${sym}${(coupon.amount / 100).toFixed(2)} off`;
}
