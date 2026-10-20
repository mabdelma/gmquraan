import { describe, expect, it } from "vitest";
import {
  NORMAL_BALANCE,
  accountBalance,
  accountCodeProblem,
  amendmentProblem,
  entryTotals,
  money,
  periodCloseProblem,
  periodOf,
  postingProblem,
  reversalOf,
  toDecimalString,
  trialBalanceProblem,
  zero,
  type Account,
  type JournalEntry,
} from "../index.js";

const eur = (s: string) => money(s, "EUR");
const Z = zero("EUR");

const account = (over: Partial<Account> = {}): Account => ({
  code: "1000",
  name: "Bank",
  type: "ASSET",
  postable: true,
  active: true,
  companyId: "ORG-ES",
  ...over,
});

const ACCOUNTS: Account[] = [
  account({ code: "1000", name: "Bank", type: "ASSET" }),
  account({ code: "4000", name: "Sales", type: "INCOME" }),
  account({ code: "6000", name: "Office costs", type: "EXPENSE" }),
  account({ code: "9999", name: "Headings", postable: false }),
  account({ code: "1001", name: "Closed account", active: false }),
  account({ code: "1002", name: "Other company", companyId: "ORG-CA" }),
  account({ code: "1003", name: "Dollar account", currency: "USD" }),
];

const entry = (over: Partial<JournalEntry> = {}): JournalEntry => ({
  companyId: "ORG-ES",
  date: "2026-08-12",
  currency: "EUR",
  lines: [
    { accountCode: "1000", debit: eur("100.00"), credit: Z },
    { accountCode: "4000", debit: Z, credit: eur("100.00") },
  ],
  ...over,
});

const open = { period: "2026-08", status: "OPEN" as const };

describe("account codes", () => {
  it("accepts a numeric code", () => {
    expect(accountCodeProblem("1000")).toBeNull();
    expect(accountCodeProblem("400010")).toBeNull();
  });

  it("refuses anything else", () => {
    for (const bad of ["", "abc", "10", "1000a", "10-00", " 1000"]) {
      expect(accountCodeProblem(bad)).toBeTruthy();
    }
  });
});

describe("a posting must balance", () => {
  it("accepts a balanced entry", () => {
    expect(postingProblem(entry(), { accounts: ACCOUNTS, period: open })).toBeNull();
  });

  it("refuses one that does not balance, exactly", () => {
    // Not "within tolerance". A ledger that balances approximately does not
    // balance.
    const e = entry({
      lines: [
        { accountCode: "1000", debit: eur("100.00"), credit: Z },
        { accountCode: "4000", debit: Z, credit: eur("99.9999") },
      ],
    });
    const why = postingProblem(e, { accounts: ACCOUNTS, period: open });
    expect(why).toMatch(/does not balance/i);
    // Reported as an amount, not raw minor units. Printing the bigint made
    // being one cent out read as "differ by 100", which sends somebody hunting
    // a hundred-euro error.
    expect(why).toContain("0.00 EUR");
    expect(why).toMatch(/debits exceed credits/i);
    expect(why).not.toMatch(/\d{3,}/);
  });

  it("names which side is heavier", () => {
    const e = entry({
      lines: [
        { accountCode: "1000", debit: eur("50.00"), credit: Z },
        { accountCode: "4000", debit: Z, credit: eur("75.50") },
      ],
    });
    const why = postingProblem(e, { accounts: ACCOUNTS, period: open });
    expect(why).toMatch(/credits exceed debits by 25\.50 EUR/i);
  });

  it("refuses a single-line entry", () => {
    const e = entry({ lines: [{ accountCode: "1000", debit: eur("100"), credit: Z }] });
    expect(postingProblem(e, { accounts: ACCOUNTS, period: open })).toMatch(/at least two lines/i);
  });

  it("refuses an entry of zero", () => {
    const e = entry({
      lines: [
        { accountCode: "1000", debit: Z, credit: Z },
        { accountCode: "4000", debit: Z, credit: Z },
      ],
    });
    expect(postingProblem(e, { accounts: ACCOUNTS, period: open })).toMatch(/no amount/i);
  });

  it("refuses an amount on both sides of one line", () => {
    const e = entry({
      lines: [
        { accountCode: "1000", debit: eur("100"), credit: eur("100") },
        { accountCode: "4000", debit: Z, credit: eur("100") },
      ],
    });
    expect(postingProblem(e, { accounts: ACCOUNTS, period: open })).toMatch(/one side, not both/i);
  });

  it("refuses a negative amount rather than treating it as the other side", () => {
    // Allowing both spellings makes every later sum ambiguous.
    const e = entry({
      lines: [
        { accountCode: "1000", debit: eur("-100"), credit: Z },
        { accountCode: "4000", debit: Z, credit: eur("-100") },
      ],
    });
    expect(postingProblem(e, { accounts: ACCOUNTS, period: open })).toMatch(/cannot be negative/i);
  });
});

describe("accounts are checked, not assumed", () => {
  const bad = (code: string) =>
    postingProblem(
      entry({
        lines: [
          { accountCode: code, debit: eur("10"), credit: Z },
          { accountCode: "4000", debit: Z, credit: eur("10") },
        ],
      }),
      { accounts: ACCOUNTS, period: open }
    );

  it("refuses an account that does not exist", () => {
    expect(bad("7777")).toMatch(/does not exist/i);
  });

  it("refuses a heading", () => {
    expect(bad("9999")).toMatch(/heading, not a postable/i);
  });

  it("refuses an inactive account", () => {
    expect(bad("1001")).toMatch(/not active/i);
  });

  it("refuses an account belonging to another company", () => {
    // The accounting form of a cross-tenant write.
    expect(bad("1002")).toMatch(/another company/i);
  });

  it("refuses a currency mismatch against the account", () => {
    expect(bad("1003")).toMatch(/held in USD/i);
  });
});

describe("period locks", () => {
  it("refuses a posting into a closed period", () => {
    const p = { period: "2026-07", status: "CLOSED" as const };
    expect(postingProblem(entry(), { accounts: ACCOUNTS, period: p })).toMatch(/is closed/i);
  });

  it("refuses a posting into a locked period", () => {
    const p = { period: "2026-07", status: "LOCKED" as const };
    expect(postingProblem(entry(), { accounts: ACCOUNTS, period: p })).toMatch(/is locked/i);
  });

  it("derives the period from the entry date, in UTC", () => {
    expect(periodOf("2026-08-12T23:30:00Z")).toBe("2026-08");
    expect(periodOf("2026-01-01T00:00:00Z")).toBe("2026-01");
  });

  it("will not close over a draft or an unbalanced entry", () => {
    // A period closed over a draft produces a figure that changes the moment
    // somebody posts it.
    expect(periodCloseProblem({ period: open, draftEntries: 2, unbalanced: 0 })).toMatch(/2 draft/i);
    expect(periodCloseProblem({ period: open, draftEntries: 0, unbalanced: 1 })).toMatch(/does not balance/i);
    expect(periodCloseProblem({ period: open, draftEntries: 0, unbalanced: 0 })).toBeNull();
  });

  it("will not close a period twice", () => {
    expect(
      periodCloseProblem({ period: { period: "2026-07", status: "CLOSED" }, draftEntries: 0, unbalanced: 0 })
    ).toMatch(/already closed/i);
  });
});

describe("posted history is immutable", () => {
  it("refuses an edit and says what to do instead", () => {
    expect(amendmentProblem()).toMatch(/cannot be edited/i);
    expect(amendmentProblem()).toMatch(/reverse it/i);
  });

  it("reverses by swapping sides, not by negating", () => {
    // Amounts stay positive; the side carries the meaning.
    const original = { ...entry(), id: "je1" };
    const r = reversalOf(original, "2026-09-01");

    expect(r.reversesEntryId).toBe("je1");
    expect(toDecimalString(r.lines[0].credit)).toBe("100.0000");
    expect(toDecimalString(r.lines[0].debit)).toBe("0.0000");
    expect(postingProblem(r, { accounts: ACCOUNTS, period: { period: "2026-09", status: "OPEN" } })).toBeNull();
  });

  it("produces a reversal that nets the original to nothing", () => {
    const original = { ...entry(), id: "je1" };
    const r = reversalOf(original, "2026-09-01");
    const all = [...original.lines, ...r.lines];
    expect(trialBalanceProblem(all, "EUR")).toBeNull();
    expect(toDecimalString(accountBalance("ASSET", all.filter((l) => l.accountCode === "1000"), "EUR"))).toBe("0.0000");
  });
});

describe("balances and the trial balance", () => {
  it("signs a balance to the account's normal side", () => {
    const lines = [{ debit: eur("100"), credit: Z }, { debit: Z, credit: eur("30") }];
    expect(toDecimalString(accountBalance("ASSET", lines, "EUR"))).toBe("70.0000");
    // The same postings against an income account read the other way.
    expect(toDecimalString(accountBalance("INCOME", lines, "EUR"))).toBe("-70.0000");
  });

  it("knows which side increases each type", () => {
    expect(NORMAL_BALANCE.ASSET).toBe("DEBIT");
    expect(NORMAL_BALANCE.EXPENSE).toBe("DEBIT");
    expect(NORMAL_BALANCE.INCOME).toBe("CREDIT");
    expect(NORMAL_BALANCE.LIABILITY).toBe("CREDIT");
    expect(NORMAL_BALANCE.EQUITY).toBe("CREDIT");
  });

  it("reports a ledger that does not balance", () => {
    expect(trialBalanceProblem([{ debit: eur("10"), credit: Z }], "EUR")).toMatch(/does not balance/i);
  });

  it("totals an entry", () => {
    const t = entryTotals(entry());
    expect(toDecimalString(t.debits)).toBe("100.0000");
    expect(toDecimalString(t.credits)).toBe("100.0000");
  });
});
