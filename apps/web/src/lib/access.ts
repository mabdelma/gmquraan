// Account types. The public site has no customer login — the group runs a
// marketing site plus the central console — so this file no longer carries
// route guards. It keeps the role predicates the central console's API routes
// use to decide what a User row is allowed to do.
export const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

export function isAdmin(role: string) {
  return ADMIN_ROLES.includes(role);
}