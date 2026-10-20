/**
 * Companies and business groups (ORG-01).
 *
 * The specification wants `core.business_group` and `core.company` with a base
 * currency, and company scope as a mandatory authorization axis. GM-OS already
 * had the same information as a compile-time constant, `ENTITIES` in config.ts,
 * keyed by codes like `ORG-ES` that are written onto records as `entityId` and
 * referenced across the domain layer.
 *
 * So this promotes that constant to rows rather than inventing a parallel
 * identifier. The code stays the natural key, which means every existing
 * `entityId` on every existing record keeps pointing at the right company with
 * no backfill and no rewrite. `packages/gmos/src/access.ts` already scopes on
 * `entityId`; this gives that axis something to join to.
 *
 * `Branch` is deliberately left alone. It is the public site's office card —
 * slug, flag, published — and not the specification's operational branch. It
 * gains an optional link to a company so the two reconcile instead of drifting.
 */

/** ISO 4217 is three uppercase letters. The list is not enumerated here — a
 *  hard-coded currency list goes stale and is not ours to be authoritative
 *  about. Format is validated; the value is configuration. */
const ISO_4217 = /^[A-Z]{3}$/;

/** Common currencies, offered in pickers only. Not a restriction. */
export const COMMON_CURRENCIES = ["EUR", "USD", "GBP", "AED", "CAD", "EGP", "SAR", "CHF"] as const;

export const COMPANY_STATUSES = ["ACTIVE", "PLANNED", "OPERATING_LOCATION", "DORMANT", "CLOSED"] as const;
export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

/**
 * Statuses that are a registered legal entity.
 *
 * Named for the status, not the entity, because `org.ts` already exports
 * `isRegisteredEntity(entityId)` which answers the same question about a
 * specific company. Two exports with one name and different arguments is how
 * a barrel file silently changes what a call site means — which is exactly
 * what happened when this shipped as `isRegisteredEntity`, and org.test.ts
 * caught it.
 *
 * Example Country is the reason this distinction exists: there are staff in North City and
 * Alexandria but no registration, so it is an operating location. It gets a
 * hierarchy like anywhere else; it does not get a legal status it lacks, and
 * nothing may be filed against it as though it were a company.
 */
export function isRegisteredCompanyStatus(status: CompanyStatus): boolean {
  return status === "ACTIVE" || status === "PLANNED" || status === "DORMANT";
}

const MAX_CODE = 24;

/**
 * Why this company code cannot be used, or null.
 *
 * The code is written onto records as `entityId` and is compared in the
 * authorization path, so it is narrow on purpose: uppercase, digits and a
 * single hyphen as a separator. Anything looser and two codes that differ only
 * by case or a stray space become two companies that the scope check treats as
 * different while a person reads them as the same.
 */
export function companyCodeProblem(code: string): string | null {
  const c = code.trim();
  if (!c) return "Give the company a code.";
  if (c !== code) return "The code cannot start or end with a space.";
  if (c.length > MAX_CODE) return `Codes stop at ${MAX_CODE} characters.`;
  if (c !== c.toUpperCase()) return "Use uppercase only — the code is compared exactly.";
  if (!/^[A-Z0-9-]+$/.test(c)) return "Use letters, numbers and hyphens only.";
  if (c.startsWith("-") || c.endsWith("-")) return "It cannot start or end with a hyphen.";
  if (c.includes("--")) return "It cannot contain two hyphens in a row.";
  return null;
}

export type CompanyInput = {
  code: string;
  legalName: string;
  country: string;
  baseCurrency: string;
  status: CompanyStatus;
  /** Codes already taken, for the uniqueness check. */
  existingCodes?: readonly string[];
  /** The code being edited, so it does not clash with itself. */
  currentCode?: string | null;
};

/** Why this company cannot be saved, or null. */
export function companyProblem(input: CompanyInput): string | null {
  const codeIssue = companyCodeProblem(input.code);
  if (codeIssue) return codeIssue;

  const code = input.code.trim();
  const taken = (input.existingCodes ?? []).filter((c) => c !== input.currentCode);
  if (taken.includes(code)) return "A company already uses that code.";

  if (!input.legalName.trim()) return "Give the company its registered legal name.";
  if (input.legalName.trim().length > 200) return "The legal name is too long.";
  if (!input.country.trim()) return "Give the country.";

  const cur = input.baseCurrency.trim();
  if (!cur) return "Give the base currency.";
  if (!ISO_4217.test(cur)) return "The base currency must be a three-letter ISO 4217 code, e.g. EUR.";

  if (!COMPANY_STATUSES.includes(input.status)) return "Choose a status.";
  return null;
}

/**
 * Why the base currency cannot be changed, or null.
 *
 * Separate from the general edit because it is not a general edit. The base
 * currency is the unit every posted figure for that company is denominated in;
 * changing it after anything has been posted silently restates history. It is
 * refused rather than warned about.
 */
export function currencyChangeProblem(from: string, to: string, hasPostedRecords: boolean): string | null {
  if (from === to) return null;
  if (hasPostedRecords) {
    return "The base currency cannot be changed once figures have been recorded against this company — it would restate every one of them.";
  }
  return ISO_4217.test(to) ? null : "The base currency must be a three-letter ISO 4217 code.";
}

export const COMPANY_TRANSITIONS: Record<CompanyStatus, readonly CompanyStatus[]> = {
  PLANNED: ["ACTIVE", "CLOSED"],
  ACTIVE: ["DORMANT", "CLOSED"],
  OPERATING_LOCATION: ["ACTIVE", "CLOSED"],
  DORMANT: ["ACTIVE", "CLOSED"],
  CLOSED: [],
};

/** Why a company cannot move to this status, or null. */
export function companyTransitionProblem(from: CompanyStatus, to: CompanyStatus): string | null {
  if (from === to) return "The company is already in that state.";
  const allowed = COMPANY_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    return allowed.length
      ? `A ${from.toLowerCase().replace(/_/g, " ")} company can only move to ${allowed.join(", ")}.`
      : `${from} is terminal.`;
  }
  return null;
}

export type GroupInput = { name: string; existingNames?: readonly string[]; currentName?: string | null };

/** Why this business group cannot be saved, or null. */
export function groupProblem(input: GroupInput): string | null {
  const n = input.name.trim();
  if (!n) return "Give the group a name.";
  if (n.length > 160) return "The name is too long.";
  const taken = (input.existingNames ?? []).filter((x) => x !== input.currentName);
  if (taken.includes(n)) return "A group already uses that name.";
  return null;
}

/**
 * Why this company cannot be deleted, or null.
 *
 * Refused whenever anything is filed against it. A company code is written onto
 * records as `entityId`, so removing the row leaves those records pointing at a
 * company that no longer exists — and the authorization check then compares
 * against nothing. Closing it is the supported route; the row stays and the
 * scope check keeps working.
 */
export function companyDeleteProblem(attached: { records: number; branches: number }): string | null {
  if (attached.records > 0) {
    return `${attached.records} record${attached.records === 1 ? " is" : "s are"} filed against this company. Close it instead — deleting it would orphan them.`;
  }
  if (attached.branches > 0) {
    return `${attached.branches} branch${attached.branches === 1 ? " is" : "es are"} attached. Detach them first.`;
  }
  return null;
}
