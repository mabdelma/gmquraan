import { describe, expect, it } from "vitest";
import {
  MoneyError,
  add,
  allocate,
  compare,
  equals,
  money,
  multiply,
  negate,
  subtract,
  sum,
  toDecimalString,
  toDisplayString,
  zero,
} from "../index.js";

describe("parsing", () => {
  it("reads a decimal string exactly", () => {
    expect(toDecimalString(money("100.50", "EUR"))).toBe("100.5000");
    expect(toDecimalString(money("0.0001", "EUR"))).toBe("0.0001");
    expect(toDecimalString(money("-42", "EUR"))).toBe("-42.0000");
  });

  it("refuses more places than the scale rather than rounding them away", () => {
    // Silently dropping a digit somebody typed is how a total stops
    // reconciling with its source.
    expect(() => money("1.00001", "EUR")).toThrow(MoneyError);
  });

  it("refuses anything that is not a decimal", () => {
    for (const bad of ["", "abc", "1,50", "1.2.3", "1e5", " ", "--1"]) {
      expect(() => money(bad, "EUR")).toThrow(MoneyError);
    }
  });

  it("refuses a currency that is not ISO 4217", () => {
    expect(() => money("1.00", "eur")).toThrow(MoneyError);
    expect(() => money("1.00", "EUROS")).toThrow(MoneyError);
  });
});

describe("the arithmetic IEEE 754 gets wrong", () => {
  it("adds 0.1 and 0.2 to exactly 0.3", () => {
    // 0.1 + 0.2 === 0.30000000000000004 as a float. This is the whole reason
    // the module exists.
    const r = add(money("0.1", "EUR"), money("0.2", "EUR"));
    expect(toDecimalString(r)).toBe("0.3000");
    expect(equals(r, money("0.3", "EUR"))).toBe(true);
  });

  it("sums a long list without drift", () => {
    const items = Array.from({ length: 1000 }, () => money("0.01", "EUR"));
    expect(toDecimalString(sum(items, "EUR"))).toBe("10.0000");
  });

  it("subtracts without a residue", () => {
    expect(toDecimalString(subtract(money("1.10", "EUR"), money("1.00", "EUR")))).toBe("0.1000");
  });
});

describe("currency is never assumed", () => {
  it("refuses to combine two currencies", () => {
    // A rate is a business fact with a date and a source, not something
    // arithmetic may invent.
    expect(() => add(money("1", "EUR"), money("1", "USD"))).toThrow(/without an explicit rate/i);
    expect(() => subtract(money("1", "EUR"), money("1", "AED"))).toThrow(MoneyError);
    expect(() => compare(money("1", "EUR"), money("1", "CAD"))).toThrow(MoneyError);
  });
});

describe("multiplication", () => {
  it("multiplies a unit cost by a quantity", () => {
    // The BOQ case: four places on both sides.
    expect(toDecimalString(multiply(money("12.3456", "EUR"), "1250"))).toBe("15432.0000");
  });

  it("rounds half up, once, at the last place", () => {
    expect(toDecimalString(multiply(money("0.0001", "EUR"), "0.5"))).toBe("0.0001");
    expect(toDecimalString(multiply(money("0.0001", "EUR"), "0.4"))).toBe("0.0000");
  });

  it("keeps the sign", () => {
    expect(toDecimalString(multiply(money("-2.5", "EUR"), "3"))).toBe("-7.5000");
  });
});

describe("allocation loses nothing", () => {
  it("splits an indivisible amount without dropping the remainder", () => {
    // 0.10 over three ways. Dropping the remainder is the classic way a ledger
    // stops balancing by a penny nobody can find.
    const parts = allocate(money("0.1", "EUR"), 3);
    expect(parts.map(toDecimalString)).toEqual(["0.0334", "0.0333", "0.0333"]);
    expect(toDecimalString(sum(parts, "EUR"))).toBe("0.1000");
  });

  it("always sums back to the original", () => {
    for (const [amount, n] of [["100", 7], ["0.0007", 3], ["1234.5678", 11], ["-10", 3]] as const) {
      const parts = allocate(money(amount, "EUR"), n);
      expect(toDecimalString(sum(parts, "EUR"))).toBe(toDecimalString(money(amount, "EUR")));
      expect(parts).toHaveLength(n);
    }
  });

  it("refuses a nonsensical split", () => {
    expect(() => allocate(money("1", "EUR"), 0)).toThrow(MoneyError);
    expect(() => allocate(money("1", "EUR"), 1.5)).toThrow(MoneyError);
  });
});

describe("presentation", () => {
  it("rounds to the minor unit for display only", () => {
    expect(toDisplayString(money("100.5049", "EUR"))).toBe("100.50");
    expect(toDisplayString(money("100.5050", "EUR"))).toBe("100.51");
    expect(toDisplayString(money("-0.005", "EUR"))).toBe("-0.01");
  });

  it("keeps the exact value separate from the displayed one", () => {
    const m = money("100.5050", "EUR");
    expect(toDisplayString(m)).toBe("100.51");
    // The stored value is untouched — a rounded figure is never written back.
    expect(toDecimalString(m)).toBe("100.5050");
  });

  it("handles zero and whole numbers", () => {
    expect(toDisplayString(zero("EUR"))).toBe("0.00");
    expect(toDisplayString(money("5", "EUR"), 0)).toBe("5");
  });
});

describe("negation and comparison", () => {
  it("negates", () => {
    expect(toDecimalString(negate(money("2.5", "EUR")))).toBe("-2.5000");
  });

  it("orders", () => {
    expect(compare(money("1", "EUR"), money("2", "EUR"))).toBe(-1);
    expect(compare(money("2", "EUR"), money("1", "EUR"))).toBe(1);
    expect(compare(money("1", "EUR"), money("1", "EUR"))).toBe(0);
  });
});
