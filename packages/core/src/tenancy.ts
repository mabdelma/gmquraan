/**
 * Tenancy rules.
 *
 * Isolation is a property of the connection: each tenant's data lives in its
 * own Postgres schema and a query cannot name rows outside it. That holds only
 * while the schema name is something we generated. The moment a schema name can
 * be derived from a request — a subdomain, a form field, a header — the model
 * is back to trusting every call site, which is what it was chosen to avoid.
 *
 * So everything below treats the slug as hostile and the schema name as
 * something the control plane mints and stores.
 *
 * See docs/architecture/001-tenant-isolation.md.
 */

export const TENANT_STATUSES = [
  "PENDING",
  "PROVISIONING",
  "ACTIVE",
  "SUSPENDED",
  "CLOSING",
  "CLOSED",
] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];

export const PLANS = ["TRIAL", "TEAM", "BUSINESS", "ENTERPRISE"] as const;
export type Plan = (typeof PLANS)[number];

/** What each plan includes. Seats are a limit, not a promise of billing. */
export const PLAN_LIMITS: Record<Plan, { seats: number; storageGb: number; ownDatabase: boolean }> = {
  TRIAL: { seats: 5, storageGb: 1, ownDatabase: false },
  TEAM: { seats: 25, storageGb: 50, ownDatabase: false },
  BUSINESS: { seats: 200, storageGb: 500, ownDatabase: false },
  ENTERPRISE: { seats: 100000, storageGb: 10000, ownDatabase: true },
};

/**
 * Labels nobody may take.
 *
 * Two reasons, and they are different. The first group already resolves to
 * something of ours, so a tenant claiming it would shadow a real service. The
 * second group is the set people assume is official — a customer signing up as
 * "admin" or "security" gets a hostname that looks like it speaks for us.
 */
export const RESERVED_SLUGS: readonly string[] = [
  // Ours already.
  "www", "api", "mail", "smtp", "imap", "ns", "ns1", "ns2", "mta-sts", "autodiscover",
  "central", "workforce", "ai", "core", "passive", "ntfy", "app", "cdn", "static",
  // Reads as official.
  "admin", "administrator", "root", "system", "support", "help", "security",
  "billing", "account", "accounts", "login", "signin", "signup", "register",
  "status", "docs", "blog", "about", "legal", "privacy", "terms", "app", "gmos",
  "unskinned", "test", "staging", "demo", "sandbox", "internal",
];

const MIN_SLUG = 3;
const MAX_SLUG = 40;

/**
 * Why this slug cannot be used, or null.
 *
 * It becomes a hostname label, so it obeys RFC 1123: lowercase letters, digits
 * and hyphens, not starting or ending with one. It also becomes part of a
 * schema name, which is why the character set is this narrow — the generated
 * name is then identifier-safe by construction rather than by escaping.
 */
export function tenantSlugProblem(slug: string): string | null {
  const s = slug.trim();
  if (!s) return "Choose a name for your workspace address.";
  if (s !== slug) return "The address cannot start or end with a space.";
  if (s.length < MIN_SLUG) return `Use at least ${MIN_SLUG} characters.`;
  if (s.length > MAX_SLUG) return `Use at most ${MAX_SLUG} characters.`;
  if (s !== s.toLowerCase()) return "Use lowercase letters only.";
  if (!/^[a-z0-9-]+$/.test(s)) return "Use lowercase letters, numbers and hyphens only.";
  if (s.startsWith("-") || s.endsWith("-")) return "It cannot start or end with a hyphen.";
  // Before the double-hyphen rule, which would otherwise swallow this: every
  // xn-- contains --, so checking it second made this branch unreachable and
  // reported a style problem for what is actually a security one. xn-- is the
  // punycode prefix, and allowing it lets a slug render in the address bar as
  // something entirely different from what was registered.
  if (s.startsWith("xn--")) return "That prefix is reserved.";
  if (s.includes("--")) return "It cannot contain two hyphens in a row.";
  if (/^\d+$/.test(s)) return "It cannot be only numbers.";
  if (RESERVED_SLUGS.includes(s)) return "That address is reserved.";
  return null;
}

/**
 * The Postgres schema for a tenant.
 *
 * Prefixed and derived from the tenant's own id, not from the slug. A slug can
 * be changed later — a customer rebrands — and a schema name that tracked it
 * would mean renaming a live schema, or worse, two tenants disagreeing about
 * which schema is theirs. The id never changes.
 *
 * The result matches /^t_[a-z0-9]+$/, so it is a valid unquoted identifier and
 * needs no escaping when it reaches SQL.
 */
export function schemaNameFor(tenantId: string): string {
  const cleaned = tenantId.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!cleaned) throw new Error("Cannot derive a schema name from an empty tenant id.");
  return `t_${cleaned}`.slice(0, 63);
}

/**
 * Whether a string is a schema name this system generated.
 *
 * The last line of defence before a schema name reaches SQL. Anything that did
 * not come out of schemaNameFor fails here, so a value that somehow arrived
 * from a request cannot be used even if every other check were bypassed.
 */
export function isGeneratedSchemaName(name: string): boolean {
  return /^t_[a-z0-9]{1,61}$/.test(name);
}

/** The hostname a tenant's portal is served on. */
export function tenantHostname(slug: string, root = "example.com"): string {
  return `${slug}.${root}`;
}

/**
 * The tenant slug for an incoming hostname, or null.
 *
 * Returns null for the root domain and for every subdomain that is one of ours,
 * so a request to central. or workforce. is never mistaken for a tenant called
 * "central". Resolution still has to look the slug up — this only says which
 * label to look for.
 */
export function slugFromHostname(hostname: string, root = "example.com"): string | null {
  const host = hostname.toLowerCase().split(":")[0];
  if (host === root || host === `www.${root}`) return null;
  if (!host.endsWith(`.${root}`)) return null;

  const label = host.slice(0, -(root.length + 1));
  // Only a single label is a tenant. a.b.root is not.
  if (label.includes(".")) return null;
  if (RESERVED_SLUGS.includes(label)) return null;
  return tenantSlugProblem(label) === null ? label : null;
}

export type TenantState = {
  status: TenantStatus;
  trialEndsAt?: Date | string | null;
};

/** Whether the portal should serve this tenant at all. */
export function tenantIsReachable(t: TenantState): boolean {
  return t.status === "ACTIVE" || t.status === "SUSPENDED" || t.status === "CLOSING";
}

/**
 * Why this tenant cannot be written to, or null.
 *
 * Suspension is deliberately readable rather than dark. A customer who has not
 * paid, or who is winding down, still has records they are legally required to
 * be able to produce — locking them out of their own employment files to chase
 * an invoice is not a lever we should have built.
 */
export function tenantWriteProblem(t: TenantState): string | null {
  if (t.status === "ACTIVE") return null;
  if (t.status === "PENDING" || t.status === "PROVISIONING") {
    return "This workspace is still being set up.";
  }
  if (t.status === "SUSPENDED") {
    return "This workspace is read-only. Your records remain available to export.";
  }
  if (t.status === "CLOSING") {
    return "This workspace is closing and is read-only. Export anything you still need.";
  }
  return "This workspace has been closed.";
}

/** Whether a trial has run out. */
export function trialExpired(t: TenantState, now = new Date()): boolean {
  if (!t.trialEndsAt) return false;
  return new Date(t.trialEndsAt).getTime() <= now.getTime();
}

export type SeatCheck = { plan: Plan; seats: number; activeMembers: number };

/** Why another person cannot be added, or null. */
export function seatProblem(c: SeatCheck): string | null {
  const limit = Math.min(c.seats, PLAN_LIMITS[c.plan].seats);
  if (c.activeMembers < limit) return null;
  return `Your plan covers ${limit} ${limit === 1 ? "person" : "people"}. Add seats to invite more.`;
}

export const TENANT_TRANSITIONS: Record<TenantStatus, readonly TenantStatus[]> = {
  PENDING: ["PROVISIONING", "CLOSED"],
  PROVISIONING: ["ACTIVE", "PENDING"],
  ACTIVE: ["SUSPENDED", "CLOSING"],
  SUSPENDED: ["ACTIVE", "CLOSING"],
  CLOSING: ["ACTIVE", "CLOSED"],
  CLOSED: [],
};

/**
 * Why a tenant cannot move to this status, or null.
 *
 * CLOSED is terminal and it is the one that drops a schema, so it is reachable
 * only from CLOSING. There is no path from ACTIVE straight to CLOSED: deleting a
 * customer's records should take two deliberate steps, the same way deleting one
 * of their documents does.
 */
export function tenantTransitionProblem(from: TenantStatus, to: TenantStatus): string | null {
  if (from === to) return "The workspace is already in that state.";
  const allowed = TENANT_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    return allowed.length
      ? `A workspace in ${from} can only move to ${allowed.join(", ")}.`
      : `${from} is terminal.`;
  }
  return null;
}
