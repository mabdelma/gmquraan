/** Server-side plan pricing (cents). ENTERPRISE is sales-led (no self-checkout). */
export type PlanId = "STARTER" | "GROWTH" | "ENTERPRISE";
export type PaidPlan = "GROWTH" | "ENTERPRISE";

export const PLAN_PRICE_CENTS: Record<PlanId, number> = {
  STARTER: 0,
  GROWTH: 9900,
  ENTERPRISE: 0,
};

export const STRIPE_PRICE_LOOKUP: Record<string, string> = {
  GROWTH: process.env.STRIPE_GROWTH_PRICE_ID ?? "",
  ENTERPRISE: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? "",
};

export function isPaidPlan(p: string): p is PaidPlan {
  return p === "GROWTH" || p === "ENTERPRISE";
}
