/**
 * Who may see pay.
 *
 * This needed a policy decision and there was nobody to ask, so the rule is
 * stated here rather than left implicit in a query somewhere. It errs narrow:
 * widening it later is a decision somebody makes on purpose, whereas narrowing
 * it after people have grown used to seeing salaries is a conversation nobody
 * wants to have.
 *
 * The rule: your own pay, always. Finance, because they run payroll. The chief
 * executive and the chief financial officer, because somebody has to be able to
 * answer for the total.
 *
 * Deliberately NOT the line manager. A manager needs a budget and a band to do
 * their job, not the individual figure for the person sitting next to them —
 * and "my manager can see my salary" is the assumption that makes pay data
 * leak sideways through an organisation.
 *
 * Deliberately NOT group-wide roles as a class. The CTO being able to read
 * every salary in the company is not something that falls out of being
 * technical; it is a separate decision, and this file is where somebody would
 * make it.
 */
import type { GmRole } from "./config.js";

export type PayViewer = {
  id: string;
  role: GmRole;
  departmentId?: string | null;
};

export type PaySubject = {
  memberId: string;
};

/** Roles that may read anybody's compensation. */
const PAY_ROLES: readonly GmRole[] = ["CEO", "CFO"];

export function canSeeCompensation(v: PayViewer, s: PaySubject): boolean {
  if (v.id === s.memberId) return true;
  if (PAY_ROLES.includes(v.role)) return true;
  // Finance run payroll, so they need the figures to do it.
  return v.departmentId === "FIN";
}

/** Who may change it. Narrower than reading, on purpose. */
export function canSetCompensation(v: PayViewer, s: PaySubject): boolean {
  // Nobody sets their own pay, whatever else they hold. The autonomy matrix
  // already rates payroll_change HUMAN_ONLY; this is the same idea applied to
  // the person rather than the machine.
  if (v.id === s.memberId) return false;
  return PAY_ROLES.includes(v.role) || v.departmentId === "FIN";
}

export const COMPENSATION_PERIODS = ["ANNUAL", "MONTHLY", "DAILY", "HOURLY"] as const;
export type CompensationPeriod = (typeof COMPENSATION_PERIODS)[number];

export type CompensationInput = {
  currency?: string | null;
  amountMinor?: number | null;
  period?: string | null;
  effectiveFrom?: Date | string | null;
};

/** Why this compensation record cannot be saved, or null. */
export function compensationProblem(c: CompensationInput): string | null {
  if (!c.currency || !/^[A-Z]{3}$/.test(c.currency)) return "Choose a currency.";
  if (typeof c.amountMinor !== "number" || !Number.isFinite(c.amountMinor)) return "Enter an amount.";
  if (c.amountMinor <= 0) return "An amount of zero or less is not a salary. Record unpaid separately.";
  // A figure with a fractional minor unit is a typo, not a salary.
  if (!Number.isInteger(c.amountMinor)) return "Amounts are held in whole minor units.";
  if (!c.period || !(COMPENSATION_PERIODS as readonly string[]).includes(c.period)) {
    return "Say whether that is annual, monthly, daily or hourly.";
  }
  if (!c.effectiveFrom) return "Every compensation record needs a date it takes effect.";
  return null;
}

/**
 * Annualised, for comparison only.
 *
 * Daily and hourly use 220 working days and 1,760 hours — a rough European
 * year net of holiday. Stated because any annualisation is a convention, and
 * one that is not written down gets quoted as though it were a fact.
 */
export function annualisedMinor(amountMinor: number, period: CompensationPeriod): number {
  switch (period) {
    case "ANNUAL":
      return amountMinor;
    case "MONTHLY":
      return amountMinor * 12;
    case "DAILY":
      return amountMinor * 220;
    case "HOURLY":
      return amountMinor * 1760;
  }
}

/** The record in force on a date, from a history ordered however it arrives. */
export function currentCompensation<T extends { effectiveFrom: Date | string; effectiveTo?: Date | string | null }>(
  records: readonly T[],
  on = new Date()
): T | null {
  const at = on.getTime();
  const live = records.filter((r) => {
    const from = new Date(r.effectiveFrom).getTime();
    const to = r.effectiveTo ? new Date(r.effectiveTo).getTime() : Infinity;
    return from <= at && at < to;
  });
  if (live.length === 0) return null;
  // If two overlap — which is a data error somebody should fix — the most
  // recently effective wins, rather than an arbitrary one.
  return live.sort(
    (a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()
  )[0];
}
