/** Cross-service DTOs (the contracts services agree on) — Unskinned digital-solutions marketplace. */

export type PlanId = "STARTER" | "GROWTH" | "ENTERPRISE";

export type Role =
  | "CLIENT" // a business buying / subscribing to solutions
  | "PARTNER" // a vetted technology provider that owns a partner org
  | "VENDOR" // an individual creator publishing solutions
  | "RESELLER" // white-label reseller / distributor
  | "ADMIN"
  | "SUPER_ADMIN";

export type SolutionCategory =
  | "SAAS_PLATFORM"
  | "LAUNCH_KIT"
  | "AI_AUTOMATION"
  | "PRODUCTIZED_SERVICE"
  | "MARKETPLACE_SOLUTION"
  | "MARKET_ENABLEMENT";

export type LicenseModel = "SUBSCRIPTION" | "ONE_TIME" | "REVENUE_SHARE";

export interface UserDTO {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  plan: PlanId;
  locale: string | null;
}

export interface SolutionDTO {
  id: string;
  slug: string;
  title: string;
  summary: string;
  price: number; // cents; 0 = "contact for pricing"
  currency: string;
  category: SolutionCategory;
  licenseModel: LicenseModel;
  status: string;
  region: string; // "GCC" | "EUROPE" | "GLOBAL"
  vendor: string; // partner / creator name
  whiteLabel: boolean;
  tags: string[];
  images: string[];
  demoMedia: string[]; // walkthrough / product-tour media URLs
}

export interface EmailRequest {
  to: string;
  /** Optional sender display name (the address part stays the configured mailbox). */
  fromName?: string;
  template:
    | "verify"
    | "reset"
    | "partnerDemoRequest"
    | "demoUpdate"
    | "alertDigest"
    | "adminInvite"
    | "invite"
    | "solutionApproved"
    | "payoutSent"
    | "leadReply"
    | "systemAlert";
  locale?: string;
  /** template-specific variables (url, name, counts, …) */
  vars: Record<string, unknown>;
}

/** Domain events on the bus (Phase: async). */
export type DomainEvent =
  | { type: "user.registered"; userId: string; email: string; locale?: string }
  | { type: "demo.requested"; demoRequestId: string; partnerEmail: string; locale?: string }
  | { type: "payment.succeeded"; userId: string; plan: PlanId; couponId?: string }
  | { type: "coupon.redeemed"; couponId: string };
