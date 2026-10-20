/**
 * Payroll jurisdictions (HR-021, decision D-003).
 *
 * `CLAUDE.md`: "jurisdiction-specific payroll/tax/labor rules are configurable
 * and must not be invented". This is the configuration half — which regime
 * applies to whom, what a regime must supply before it can be used, and a
 * refusal to calculate anything until it has.
 *
 * There are no rates, bands or thresholds in this file, and there must never be
 * any. A payroll engine that computes a number under a rule somebody guessed is
 * worse than one that computes nothing, because the number looks authoritative
 * and lands in somebody's bank account.
 */

export const JURISDICTIONS = ["ES", "CA", "EG", "AE"] as const;
export type Jurisdiction = (typeof JURISDICTIONS)[number];

export const JURISDICTION_NAMES: Record<Jurisdiction, string> = {
  ES: "Spain",
  CA: "Canada",
  EG: "Example Country",
  AE: "United Arab Emirates",
};

/**
 * The company each jurisdiction is the default for.
 *
 * A default, not a rule. Where somebody is employed and which statutory regime
 * applies are usually the same answer and occasionally are not — a secondment,
 * a cross-border contract — so the person's own assignment always wins over
 * this map.
 */
export const DEFAULT_JURISDICTION_FOR_COMPANY: Record<string, Jurisdiction> = {
  "ORG-ES": "ES",
  "ORG-CA": "CA",
  "ORG-EG": "EG",
  "ORG-UAE": "AE",
};

/**
 * What a jurisdiction must supply before payroll may run under it.
 *
 * Each key is a policy somebody with authority has to provide. The list is
 * deliberately about *categories* rather than named taxes: naming "IRPF" or
 * "CPP" here would be the first step towards assuming how they work.
 */
export const REQUIRED_POLICIES = [
  "income_tax_withholding",
  "social_insurance_employee",
  "social_insurance_employer",
  "overtime_entitlement",
  "statutory_leave",
  "end_of_service",
  "payslip_requirements",
  "payroll_filing_calendar",
] as const;
export type PolicyKey = (typeof REQUIRED_POLICIES)[number];

export type PolicySource = {
  /** Where the rule comes from: an act, a circular, an advisor's written note. */
  authority: string;
  /** When it was supplied, so a stale rule is visible as stale. */
  suppliedAt: Date | string;
  /** When it stops being reliable, if known. */
  reviewBy?: Date | string | null;
};

export type JurisdictionConfig = {
  code: Jurisdiction;
  /** Policies actually supplied, keyed by policy. */
  policies: Partial<Record<PolicyKey, PolicySource>>;
  /** Set true only when somebody with authority has signed it off. */
  enabled: boolean;
};

/** Policies still missing for a jurisdiction. */
export function missingPolicies(c: JurisdictionConfig): PolicyKey[] {
  return REQUIRED_POLICIES.filter((k) => !c.policies[k]);
}

/**
 * Why payroll may not run under this jurisdiction, or null.
 *
 * The gate D-003 exists to enforce. It refuses on missing policy *and* on the
 * enabled flag, because a complete configuration is still not the same as
 * somebody having accepted responsibility for it.
 */
export function payrollBlocked(c: JurisdictionConfig, now = new Date()): string | null {
  const missing = missingPolicies(c);
  if (missing.length) {
    return `${JURISDICTION_NAMES[c.code]} payroll cannot run: ${missing.length} of ${REQUIRED_POLICIES.length} statutory policies have not been supplied (${missing.slice(0, 3).join(", ")}${missing.length > 3 ? "…" : ""}).`;
  }
  if (!c.enabled) {
    return `${JURISDICTION_NAMES[c.code]} payroll is configured but has not been signed off.`;
  }
  const stale = (Object.entries(c.policies) as [PolicyKey, PolicySource][]).filter(
    ([, p]) => p.reviewBy && new Date(p.reviewBy).getTime() < now.getTime()
  );
  if (stale.length) {
    return `${JURISDICTION_NAMES[c.code]} payroll is held: ${stale.map(([k]) => k).join(", ")} passed the review date.`;
  }
  return null;
}

/** The jurisdiction that applies to a person. */
export function jurisdictionFor(m: {
  jurisdiction?: string | null;
  entityId?: string | null;
}): Jurisdiction | null {
  if (m.jurisdiction && (JURISDICTIONS as readonly string[]).includes(m.jurisdiction)) {
    return m.jurisdiction as Jurisdiction;
  }
  return m.entityId ? (DEFAULT_JURISDICTION_FOR_COMPANY[m.entityId] ?? null) : null;
}

/**
 * A payroll figure, or the reason there isn't one.
 *
 * Everything that would compute pay goes through here. It returns a refusal
 * today for every jurisdiction, and it will keep returning one for any
 * jurisdiction whose policies are not supplied — which is the point. The shape
 * exists so the rest of payroll can be built and tested against a gate that is
 * already closed, rather than against a placeholder that quietly returns zero.
 */
export function computeStatutoryDeductions(
  c: JurisdictionConfig,
  _input: { grossMinorOrDecimal: unknown; period: string }
): { ok: false; reason: string } | { ok: true; lines: never[] } {
  const blocked = payrollBlocked(c);
  if (blocked) return { ok: false, reason: blocked };
  // Reachable only once a jurisdiction is fully supplied and signed off. The
  // per-jurisdiction calculators plug in here; none exists, and none may be
  // written from assumption.
  return { ok: false, reason: `No calculator is registered for ${JURISDICTION_NAMES[c.code]}.` };
}
