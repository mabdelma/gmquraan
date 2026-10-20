/**
 * Unskinned client subscription tiers. Ported from the upstream platform's lib/plans.ts shape
 * (FREE/PRO/AGENCY) and remapped to Unskinned's STARTER/GROWTH/ENTERPRISE.
 * Prices are placeholders pending confirmation (the live site shows none).
 */

export type PlanId = "STARTER" | "GROWTH" | "ENTERPRISE";
export type PriceCurrency = "EUR" | "USD";

export const PLAN_PRICES: Record<PlanId, Record<PriceCurrency, { cents: number; label: string }>> = {
  STARTER: {
    EUR: { cents: 0, label: "0 €" },
    USD: { cents: 0, label: "$0" },
  },
  GROWTH: {
    EUR: { cents: 9900, label: "99 €/mo" },
    USD: { cents: 10900, label: "$109/mo" },
  },
  ENTERPRISE: {
    EUR: { cents: 0, label: "Custom" },
    USD: { cents: 0, label: "Custom" },
  },
};

export const PLANS: Record<
  PlanId,
  {
    label: string;
    priceLabel: string;
    solutionLimit: number; // Infinity = unlimited (for partners/resellers)
    canWhiteLabel: boolean;
    blurb: string;
    perks: string[];
  }
> = {
  STARTER: {
    label: "Starter",
    priceLabel: "Free",
    solutionLimit: 3,
    canWhiteLabel: false,
    blurb: "Explore the marketplace and request demos.",
    perks: ["Browse all solutions", "Save & shortlist solutions", "Request up to 3 demos"],
  },
  GROWTH: {
    label: "Growth",
    priceLabel: "99 €/mo",
    solutionLimit: 25,
    canWhiteLabel: true,
    blurb: "For businesses deploying multiple solutions.",
    perks: ["Unlimited demos", "White-label licensing", "Priority partner matching", "Everything in Starter"],
  },
  ENTERPRISE: {
    label: "Enterprise",
    priceLabel: "Custom",
    solutionLimit: Infinity,
    canWhiteLabel: true,
    blurb: "For partners, resellers and at-scale rollouts.",
    perks: ["Unlimited solutions & seats", "Reseller / distribution rights", "Managed delivery & SLAs", "Everything in Growth"],
  },
};

export const PLAN_IDS: PlanId[] = ["STARTER", "GROWTH", "ENTERPRISE"];

/** Effective plan, accounting for an expired paid plan reverting to STARTER. */
export function effectivePlan(plan: string, planExpiresAt: Date | null): PlanId {
  if (plan !== "STARTER" && planExpiresAt && planExpiresAt < new Date()) return "STARTER";
  return (plan as PlanId) ?? "STARTER";
}
