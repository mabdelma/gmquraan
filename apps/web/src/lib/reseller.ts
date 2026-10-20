import { prisma } from "@app/db";
import { notifyProductsResellerChange } from "./reseller-sync-notify";

export const RESELLER_DISCOUNT_PERCENT = 10; // discount the client gets
export const RESELLER_COMMISSION_PERCENT = 15; // reseller's cut of attributed revenue

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
function rnd(n = 4): string {
  let s = "";
  for (let i = 0; i < n; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

/** Get the reseller's referral coupon, creating a unique one on first access. */
export async function getOrCreateReferralCoupon(userId: string, name: string | null, email: string) {
  const existing = await prisma.coupon.findFirst({ where: { ownerId: userId, isReferral: true } });
  if (existing) return existing;

  const base =
    (name || email || "Unskinned")
      .split("@")[0]
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 8) || "Unskinned";

  let code = `REF${rnd(8)}`;
  for (let i = 0; i < 6; i++) {
    const candidate = `${base}${rnd(4)}`;
    if (!(await prisma.coupon.findUnique({ where: { code: candidate } }))) {
      code = candidate;
      break;
    }
  }

  const created = await prisma.coupon.create({
    data: {
      code,
      description: `Reseller referral — ${name || email}`,
      discountType: "PERCENT",
      amount: RESELLER_DISCOUNT_PERCENT,
      ownerId: userId,
      isReferral: true,
      active: true,
    },
  });

  // Instant cross-product sync: tell connected products to pull the new code now.
  await notifyProductsResellerChange();
  return created;
}
