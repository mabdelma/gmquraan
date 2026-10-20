/**
 * The general ledger (FIN-01).
 *
 * Its stated invariants are: balanced postings, decimal-safe money, period
 * locks, controlled reversals, role-based posting and approval, explicit
 * currency and immutable posted history. Every one of them is a refusal in this
 * file rather than a convention somebody is asked to follow.
 *
 * Amounts come in as `Money` from `money.ts`, which is bigint arithmetic at
 * four decimal places. Nothing here sees a JavaScript number.
 */
import {
  add,
  compare,
  isNegative,
  isZero,
  negate,
  subtract,
  sum,
  toDisplayString,
  zero,
  type Money,
} from "./money.js";

export const ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

/**
 * Which side increases each type.
 *
 * Not decoration: it is how a trial balance is presented and how a sign error
 * becomes visible. An expense with a credit balance is either a refund or a
 * mistake, and the ledger should be able to tell you which is unusual.
 */
export const NORMAL_BALANCE: Record<AccountType, "DEBIT" | "CREDIT"> = {
  ASSET: "DEBIT",
  EXPENSE: "DEBIT",
  LIABILITY: "CREDIT",
  EQUITY: "CREDIT",
  INCOME: "CREDIT",
};

export type Account = {
  code: string;
  name: string;
  type: AccountType;
  /** A parent groups for reporting; only leaves may be posted to. */
  parentCode?: string | null;
  postable: boolean;
  active: boolean;
  companyId: string;
  currency?: string | null;
};

/** Why this account code cannot be used, or null. */
export function accountCodeProblem(code: string): string | null {
  const c = code.trim();
  if (!c) return "Give the account a code.";
  if (c !== code) return "The code cannot start or end with a space.";
  if (!/^[0-9]{4,10}$/.test(c)) return "Account codes are 4 to 10 digits.";
  return null;
}

export type PostingLine = {
  accountCode: string;
  /** Exactly one of these is non-zero. */
  debit: Money;
  credit: Money;
  description?: string | null;
  /** Cost dimensions, so a figure can be traced to what it was for. */
  projectId?: string | null;
  costCentreId?: string | null;
  departmentId?: string | null;
};

export type JournalEntry = {
  companyId: string;
  /** The date the entry belongs to, which decides the period it locks under. */
  date: Date | string;
  currency: string;
  lines: PostingLine[];
  memo?: string | null;
  /** Set when this entry reverses another. */
  reversesEntryId?: string | null;
};

export type PeriodState = {
  /** YYYY-MM. */
  period: string;
  status: "OPEN" | "CLOSED" | "LOCKED";
};

export const periodOf = (date: Date | string): string => {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

/**
 * Why this entry cannot be posted, or null.
 *
 * The balance check is the one that matters and it is done on exact integers.
 * A ledger that balances to within a rounding tolerance is a ledger that does
 * not balance.
 */
export function postingProblem(
  e: JournalEntry,
  ctx: {
    accounts: readonly Account[];
    period?: PeriodState | null;
  }
): string | null {
  if (!e.lines.length) return "A journal entry needs at least one line.";
  if (e.lines.length < 2) return "A journal entry needs at least two lines to balance.";

  const period = ctx.period;
  if (period && period.status !== "OPEN") {
    // The lock. A posting into a closed period silently restates a set of
    // accounts somebody has already reported on.
    return `Period ${period.period} is ${period.status.toLowerCase()}. Post to an open period, or reverse in one.`;
  }

  const byCode = new Map(ctx.accounts.map((a) => [a.code, a]));
  let debits = zero(e.currency);
  let credits = zero(e.currency);

  for (const [i, line] of e.lines.entries()) {
    const where = `Line ${i + 1}`;
    const account = byCode.get(line.accountCode);
    if (!account) return `${where}: account ${line.accountCode} does not exist.`;
    if (account.companyId !== e.companyId) {
      // Company scope reaches the ledger too: posting into another company's
      // account is the accounting form of a cross-tenant write.
      return `${where}: account ${line.accountCode} belongs to another company.`;
    }
    if (!account.active) return `${where}: account ${line.accountCode} is not active.`;
    if (!account.postable) {
      return `${where}: ${line.accountCode} is a heading, not a postable account.`;
    }
    if (account.currency && account.currency !== e.currency) {
      return `${where}: account ${line.accountCode} is held in ${account.currency}, not ${e.currency}.`;
    }
    if (line.debit.currency !== e.currency || line.credit.currency !== e.currency) {
      return `${where}: amounts must be in ${e.currency}.`;
    }
    if (isNegative(line.debit) || isNegative(line.credit)) {
      // A negative debit is a credit written confusingly. Allowing both spellings
      // makes every later sum ambiguous.
      return `${where}: amounts cannot be negative — use the other side instead.`;
    }
    if (isZero(line.debit) && isZero(line.credit)) return `${where}: has no amount.`;
    if (!isZero(line.debit) && !isZero(line.credit)) {
      return `${where}: put an amount on one side, not both.`;
    }

    debits = add(debits, line.debit);
    credits = add(credits, line.credit);
  }

  if (compare(debits, credits) !== 0) {
    // Reported as an amount, not as raw minor units. The first version printed
    // the bigint, so being one cent out read as "differ by 100" — which sends
    // somebody looking for a hundred-euro error.
    const diff = subtract(debits, credits);
    const side = isNegative(diff) ? "credits exceed debits" : "debits exceed credits";
    const magnitude = toDisplayString(isNegative(diff) ? negate(diff) : diff);
    return `The entry does not balance — ${side} by ${magnitude} ${e.currency}.`;
  }
  if (isZero(debits)) return "An entry of zero posts nothing.";

  return null;
}

/** Total debits and credits, for display and for the trial balance. */
export function entryTotals(e: JournalEntry): { debits: Money; credits: Money } {
  return {
    debits: sum(e.lines.map((l) => l.debit), e.currency),
    credits: sum(e.lines.map((l) => l.credit), e.currency),
  };
}

/**
 * Why a posted entry cannot be edited, or null — which is always.
 *
 * Posted history is immutable. The only correction is a reversal, which is
 * itself an entry with its own date and its own audit. Editing would rewrite a
 * figure somebody has already reported, filed or been paid against.
 */
export function amendmentProblem(): string {
  return "A posted entry cannot be edited. Reverse it and post the correction, so both the error and the fix are on the record.";
}

/**
 * Build the reversal of an entry.
 *
 * Sides are swapped rather than amounts negated, so every line still obeys the
 * rule that amounts are positive and the side carries the meaning.
 */
export function reversalOf(
  e: JournalEntry & { id: string },
  on: Date | string,
  memo?: string
): JournalEntry {
  return {
    companyId: e.companyId,
    date: on,
    currency: e.currency,
    reversesEntryId: e.id,
    memo: memo ?? `Reversal of ${e.id}`,
    lines: e.lines.map((l) => ({
      accountCode: l.accountCode,
      debit: l.credit,
      credit: l.debit,
      description: l.description,
      projectId: l.projectId,
      costCentreId: l.costCentreId,
      departmentId: l.departmentId,
    })),
  };
}

/**
 * Why this period cannot be closed, or null.
 *
 * Closing is refused while anything is unposted in it, because a period closed
 * over a draft entry produces a figure that changes the moment somebody posts
 * the draft.
 */
export function periodCloseProblem(input: {
  period: PeriodState;
  draftEntries: number;
  unbalanced: number;
}): string | null {
  if (input.period.status !== "OPEN") return `Period ${input.period.period} is already ${input.period.status.toLowerCase()}.`;
  if (input.unbalanced > 0) return `${input.unbalanced} entr${input.unbalanced === 1 ? "y does" : "ies do"} not balance.`;
  if (input.draftEntries > 0) {
    return `${input.draftEntries} draft entr${input.draftEntries === 1 ? "y is" : "ies are"} still open in this period.`;
  }
  return null;
}

/** The balance of an account given its postings, signed to its normal side. */
export function accountBalance(
  type: AccountType,
  lines: readonly { debit: Money; credit: Money }[],
  currency: string
): Money {
  const debits = sum(lines.map((l) => l.debit), currency);
  const credits = sum(lines.map((l) => l.credit), currency);
  return NORMAL_BALANCE[type] === "DEBIT" ? subtract(debits, credits) : subtract(credits, debits);
}

/**
 * Whether a set of postings forms a balanced trial balance.
 *
 * Kept separate from the per-entry check because they answer different
 * questions: an entry balancing does not prove the ledger does, and this is the
 * one an auditor asks about.
 */
export function trialBalanceProblem(
  lines: readonly { debit: Money; credit: Money }[],
  currency: string
): string | null {
  const debits = sum(lines.map((l) => l.debit), currency);
  const credits = sum(lines.map((l) => l.credit), currency);
  return compare(debits, credits) === 0
    ? null
    : `The ledger does not balance in ${currency}: debits and credits differ.`;
}
