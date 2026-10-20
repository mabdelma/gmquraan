export const USER_ROLES = ["CLIENT", "PARTNER", "RESELLER", "ADMIN", "SUPER_ADMIN"] as const;
export const USER_PLANS = ["STARTER", "GROWTH", "ENTERPRISE"] as const;
export const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

export type UserRole = (typeof USER_ROLES)[number];

export const isAdminRole = (r: string) => ADMIN_ROLES.has(r);
export const isValidRole = (r: unknown): r is UserRole => USER_ROLES.includes(r as UserRole);
export const isValidPlan = (p: unknown): p is (typeof USER_PLANS)[number] =>
  USER_PLANS.includes(p as (typeof USER_PLANS)[number]);

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const isValidEmail = (e: string) => EMAIL_RE.test(e);
