const CATEGORY_LABELS: Record<string, string> = {
  SAAS_PLATFORM: "White-Label SaaS",
  LAUNCH_KIT: "Launch Kit",
  AI_AUTOMATION: "AI & Automation",
  PRODUCTIZED_SERVICE: "Productized Service",
  MARKETPLACE_SOLUTION: "Marketplace Solution",
  MARKET_ENABLEMENT: "Market Enablement",
};

const LICENSE_LABELS: Record<string, string> = {
  SUBSCRIPTION: "Subscription",
  ONE_TIME: "One-time",
  REVENUE_SHARE: "Revenue share",
};

/** Optional `labels` overrides the English defaults (pass a localized map). */
export const categoryLabel = (c: string, labels?: Record<string, string>) =>
  labels?.[c] ?? CATEGORY_LABELS[c] ?? c;
export const licenseLabel = (m: string, labels?: Record<string, string>) =>
  labels?.[m] ?? LICENSE_LABELS[m] ?? m;

/** price is cents; 0 means "contact for pricing" (label localizable). */
export function formatPrice(cents: number, currency = "EUR", contactLabel = "Contact for pricing"): string {
  if (!cents) return contactLabel;
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}
