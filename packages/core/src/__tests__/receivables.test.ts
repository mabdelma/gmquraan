import { describe, expect, it } from "vitest";
import {
  ageBand,
  aging,
  allocationProblem,
  grossTotal,
  issueProblem,
  money,
  netTotal,
  outstanding,
  postingFor,
  stateAfter,
  taxTotal,
  toDecimalString,
  voidProblem,
  type Allocation,
  type Invoice,
} from "../index.js";

const eur = (s: string) => money(s, "EUR");

const invoice = (over: Partial<Invoice> = {}): Invoice => ({
  side: "RECEIVABLE",
  companyId: "ORG-ES",
  currency: "EUR",
  partyRef: "CUST-1",
  issuedOn: "2026-08-01",
  dueOn: "2026-08-31",
  state: "ISSUED",
  lines: [{ description: "Consulting", quantity: "10", unitPrice: eur("100.00"), accountCode: "4100" }],
  ...over,
});

const alloc = (ref: string, amount: string): Allocation => ({
  paymentRef: ref,
  amount: eur(amount),
  on: "2026-09-01",
});

describe("issuing", () => {
  it("accepts a well-formed invoice", () => {
    expect(issueProblem(invoice({ state: "DRAFT" }))).toBeNull();
  });

  it("refuses a negative price rather than treating it as a credit note", () => {
    // Conflating the two makes every aging report wrong.
    const inv = invoice({
      state: "DRAFT",
      lines: [{ description: "Refund", quantity: "1", unitPrice: eur("-50"), accountCode: "4100" }],
    });
    expect(issueProblem(inv)).toMatch(/credit note/i);
  });

  it("refuses a due date before the invoice date", () => {
    expect(issueProblem(invoice({ state: "DRAFT", dueOn: "2026-07-01" }))).toMatch(/before the invoice date/i);
  });

  it("refuses an empty or zero invoice", () => {
    expect(issueProblem(invoice({ state: "DRAFT", lines: [] }))).toMatch(/at least one line/i);
    const zeroInv = invoice({
      state: "DRAFT",
      lines: [{ description: "Nothing", quantity: "0", unitPrice: eur("100"), accountCode: "4100" }],
    });
    expect(issueProblem(zeroInv)).toMatch(/for nothing/i);
  });

  it("refuses issuing something already issued", () => {
    expect(issueProblem(invoice({ state: "ISSUED" }))).toMatch(/only a draft/i);
  });

  it("refuses a bad quantity", () => {
    const inv = invoice({
      state: "DRAFT",
      lines: [{ description: "X", quantity: "-1", unitPrice: eur("10"), accountCode: "4100" }],
    });
    expect(issueProblem(inv)).toMatch(/not a positive number/i);
  });
});

describe("totals", () => {
  it("multiplies quantity by unit price exactly", () => {
    expect(toDecimalString(netTotal(invoice()))).toBe("1000.0000");
  });

  it("handles fractional quantities without drift", () => {
    const inv = invoice({
      lines: [{ description: "Hours", quantity: "7.25", unitPrice: eur("83.33"), accountCode: "4100" }],
    });
    expect(toDecimalString(netTotal(inv))).toBe("604.1425");
  });

  it("computes tax per line, not on the total", () => {
    // Rounding once on the total and rounding each line then adding give
    // different answers, and the tax authority cares which.
    const inv = invoice({
      lines: [
        { description: "A", quantity: "1", unitPrice: eur("0.05"), taxRatePercent: "21", accountCode: "4100" },
        { description: "B", quantity: "1", unitPrice: eur("0.05"), taxRatePercent: "21", accountCode: "4100" },
      ],
    });
    // Each line: 0.05 × 21% = 0.0105 → summed 0.0210.
    expect(toDecimalString(taxTotal(inv))).toBe("0.0210");
    expect(toDecimalString(grossTotal(inv))).toBe("0.1210");
  });

  it("is zero tax when no rate is supplied", () => {
    // Rates are configuration. None is assumed.
    expect(toDecimalString(taxTotal(invoice()))).toBe("0.0000");
  });
});

describe("allocation", () => {
  const inv = invoice();

  it("allows a part payment and reports what is left", () => {
    expect(allocationProblem(inv, [], alloc("RCT-1", "400"))).toBeNull();
    expect(toDecimalString(outstanding(inv, [alloc("RCT-1", "400")]))).toBe("600.0000");
  });

  it("refuses more than is outstanding", () => {
    // An invoice paid to a negative balance is a duplicate receipt or a refund,
    // and both are their own document.
    expect(allocationProblem(inv, [alloc("RCT-1", "900")], alloc("RCT-2", "200"))).toMatch(
      /more than the 100.00 EUR still outstanding/i
    );
  });

  it("refuses the same payment twice", () => {
    // The classic double-count when a webhook is redelivered.
    expect(allocationProblem(inv, [alloc("RCT-1", "100")], alloc("RCT-1", "100"))).toMatch(
      /already been allocated/i
    );
  });

  it("refuses a negative or zero allocation", () => {
    expect(allocationProblem(inv, [], alloc("RCT-1", "0"))).toMatch(/changes nothing/i);
    expect(allocationProblem(inv, [], alloc("RCT-1", "-5"))).toMatch(/cannot be negative/i);
  });

  it("refuses allocating to a draft, void or written-off invoice", () => {
    expect(allocationProblem(invoice({ state: "DRAFT" }), [], alloc("R", "1"))).toMatch(/draft/i);
    expect(allocationProblem(invoice({ state: "VOID" }), [], alloc("R", "1"))).toMatch(/voided/i);
    expect(allocationProblem(invoice({ state: "WRITTEN_OFF" }), [], alloc("R", "1"))).toMatch(/written off/i);
  });

  it("refuses a currency mismatch", () => {
    const other: Allocation = { paymentRef: "R", amount: money("10", "USD"), on: "2026-09-01" };
    expect(allocationProblem(inv, [], other)).toMatch(/must be in EUR/i);
  });
});

describe("state follows the balance", () => {
  const inv = invoice();

  it("stays issued with nothing allocated", () => {
    expect(stateAfter(inv, [])).toBe("ISSUED");
  });

  it("is part paid after some of it", () => {
    expect(stateAfter(inv, [alloc("R1", "400")])).toBe("PART_PAID");
  });

  it("is paid when nothing is left, to the last unit", () => {
    expect(stateAfter(inv, [alloc("R1", "400"), alloc("R2", "600")])).toBe("PAID");
  });

  it("does not resurrect a void or written-off invoice", () => {
    expect(stateAfter(invoice({ state: "VOID" }), [alloc("R", "1")])).toBe("VOID");
    expect(stateAfter(invoice({ state: "WRITTEN_OFF" }), [])).toBe("WRITTEN_OFF");
  });
});

describe("voiding", () => {
  it("allows voiding an untouched invoice", () => {
    expect(voidProblem(invoice(), [])).toBeNull();
  });

  it("refuses once something has been paid against it", () => {
    // The payment really happened; voiding would leave it attached to a
    // document that no longer exists.
    expect(voidProblem(invoice(), [alloc("R1", "10")])).toMatch(/credit note/i);
  });

  it("tells you to delete a draft rather than void it", () => {
    expect(voidProblem(invoice({ state: "DRAFT" }), [])).toMatch(/delete it/i);
  });
});

describe("aging", () => {
  const asAt = new Date("2026-10-01T00:00:00Z");

  it("bands by days past due", () => {
    expect(ageBand("2026-10-15", asAt)).toBe("current");
    expect(ageBand("2026-09-20", asAt)).toBe("1-30");
    expect(ageBand("2026-08-20", asAt)).toBe("31-60");
    expect(ageBand("2026-07-20", asAt)).toBe("61-90");
    expect(ageBand("2026-01-01", asAt)).toBe("90+");
  });

  it("totals by band and ignores settled invoices", () => {
    const bands = aging(
      [
        { dueOn: "2026-10-15", outstanding: eur("100") },
        { dueOn: "2026-09-20", outstanding: eur("250") },
        { dueOn: "2026-09-25", outstanding: eur("50") },
        { dueOn: "2026-01-01", outstanding: eur("0") },
      ],
      "EUR",
      asAt
    );
    expect(toDecimalString(bands.current)).toBe("100.0000");
    expect(toDecimalString(bands["1-30"])).toBe("300.0000");
    expect(toDecimalString(bands["90+"])).toBe("0.0000");
  });
});

describe("the posting an invoice produces", () => {
  it("debits the customer and credits income, and balances", () => {
    const lines = postingFor(invoice(), { control: "1200", tax: "2200" });
    expect(lines[0].accountCode).toBe("1200");
    expect(toDecimalString(lines[0].debit)).toBe("1000.0000");

    const debits = lines.reduce((a, l) => a + l.debit.minor, 0n);
    const credits = lines.reduce((a, l) => a + l.credit.minor, 0n);
    expect(debits).toBe(credits);
  });

  it("reverses the direction for a payable, and still balances", () => {
    const bill = invoice({ side: "PAYABLE", partyRef: "SUPP-1", lines: [
      { description: "Materials", quantity: "2", unitPrice: eur("150"), accountCode: "5100" },
    ] });
    const lines = postingFor(bill, { control: "2100", tax: "2200" });

    // The control account is credited for a bill, not debited.
    const control = lines.find((l) => l.accountCode === "2100")!;
    expect(toDecimalString(control.credit)).toBe("300.0000");

    const debits = lines.reduce((a, l) => a + l.debit.minor, 0n);
    const credits = lines.reduce((a, l) => a + l.credit.minor, 0n);
    expect(debits).toBe(credits);
  });

  it("includes a tax line only when there is tax", () => {
    const taxed = invoice({ lines: [
      { description: "X", quantity: "1", unitPrice: eur("100"), taxRatePercent: "21", accountCode: "4100" },
    ] });
    expect(postingFor(taxed, { control: "1200", tax: "2200" }).some((l) => l.accountCode === "2200")).toBe(true);
    expect(postingFor(invoice(), { control: "1200", tax: "2200" }).some((l) => l.accountCode === "2200")).toBe(false);
  });
});
