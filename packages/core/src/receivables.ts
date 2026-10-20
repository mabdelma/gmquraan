/**
 * Receivables and payables (FIN-01).
 *
 * One module for both, because a customer invoice and a supplier bill are the
 * same shape pointed in opposite directions: an amount owed, a due date, a set
 * of allocations against it, and a balance that must never go the wrong way.
 * Duplicating the arithmetic for AR and AP is how the two drift until only one
 * of them handles part-payment correctly.
 *
 * Everything is `Money` from `money.ts` — bigint at four decimal places. No
 * JavaScript number appears anywhere in this file.
 */
import {
  add,
  compare,
  isNegative,
  isZero,
  subtract,
  sum,
  toDisplayString,
  zero,
  type Money,
} from "./money.js";

/** Which direction the money runs. */
export const LEDGER_SIDES = ["RECEIVABLE", "PAYABLE"] as const;
export type LedgerSide = (typeof LEDGER_SIDES)[number];

export const INVOICE_STATES = ["DRAFT", "ISSUED", "PART_PAID", "PAID", "VOID", "WRITTEN_OFF"] as const;
export type InvoiceState = (typeof INVOICE_STATES)[number];

export type InvoiceLine = {
  description: string;
  /** Decimal string, four places. Quantities are not money. */
  quantity: string;
  unitPrice: Money;
  /** Tax rate as a percentage, e.g. "21". Rates are configuration, never here. */
  taxRatePercent?: string | null;
  accountCode: string;
  projectId?: string | null;
};

export type Invoice = {
  side: LedgerSide;
  companyId: string;
  currency: string;
  /** The counterparty: a customer for AR, a supplier for AP. */
  partyRef: string;
  issuedOn: Date | string;
  dueOn: Date | string;
  state: InvoiceState;
  lines: InvoiceLine[];
};

export type Allocation = {
  /** A receipt for AR, a payment for AP. */
  paymentRef: string;
  amount: Money;
  on: Date | string;
};

/**
 * Why this invoice cannot be issued, or null.
 *
 * Issuing is the point of no return: after it, the document exists in somebody
 * else's records too, so the checks happen here rather than at payment time.
 */
export function issueProblem(inv: Invoice): string | null {
  if (inv.state !== "DRAFT") return `Only a draft can be issued; this one is ${inv.state.toLowerCase().replace(/_/g, " ")}.`;
  if (!inv.lines.length) return "An invoice needs at least one line.";
  if (!inv.partyRef.trim()) return `An invoice needs a ${inv.side === "RECEIVABLE" ? "customer" : "supplier"}.`;

  if (new Date(inv.dueOn).getTime() < new Date(inv.issuedOn).getTime()) {
    return "The due date is before the invoice date.";
  }

  for (const [i, l] of inv.lines.entries()) {
    const where = `Line ${i + 1}`;
    if (!l.description.trim()) return `${where}: give it a description.`;
    if (!l.accountCode.trim()) return `${where}: choose an account.`;
    if (isNegative(l.unitPrice)) {
      // A credit note is its own document with its own number, not an invoice
      // with a minus sign. Conflating them makes every aging report wrong.
      return `${where}: a negative price belongs on a credit note, not an invoice.`;
    }
    if (l.unitPrice.currency !== inv.currency) return `${where}: amounts must be in ${inv.currency}.`;
    if (!/^\d+(\.\d{1,4})?$/.test(l.quantity.trim())) return `${where}: the quantity is not a positive number.`;
  }

  if (isZero(netTotal(inv))) return "An invoice for nothing cannot be issued.";
  return null;
}

/** Net of tax. */
export function netTotal(inv: Invoice): Money {
  return sum(
    inv.lines.map((l) => multiplyByQuantity(l.unitPrice, l.quantity)),
    inv.currency
  );
}

function multiplyByQuantity(price: Money, quantity: string): Money {
  // Reuses the scaled-integer multiply from money.ts semantics: parse the
  // quantity at the same scale and divide back down.
  const [whole, frac = ""] = quantity.trim().split(".");
  const scaled = BigInt(whole) * 10_000n + BigInt(frac.padEnd(4, "0") || "0");
  const product = price.minor * scaled;
  const q = product / 10_000n;
  const r = product % 10_000n;
  const rounded = r * 2n >= 10_000n ? q + 1n : q;
  return { minor: rounded, currency: price.currency };
}

/**
 * Tax per line, then summed — never the tax of the summed total.
 *
 * Rounding the total once and rounding each line then adding give different
 * answers, and the tax authority cares which. Per line is what an invoice
 * shows, so it is what is computed.
 *
 * The *rate* is configuration and is never decided here; this only applies one
 * that was supplied.
 */
export function taxTotal(inv: Invoice): Money {
  return sum(
    inv.lines.map((l) => {
      if (!l.taxRatePercent) return zero(inv.currency);
      const net = multiplyByQuantity(l.unitPrice, l.quantity);
      const [w, f = ""] = l.taxRatePercent.trim().split(".");
      const rate = BigInt(w) * 10_000n + BigInt(f.padEnd(4, "0") || "0");
      const product = net.minor * rate;
      const denom = 1_000_000n; // percent (100) × scale (10 000)
      const q = product / denom;
      const rem = product % denom;
      return { minor: rem * 2n >= denom ? q + 1n : q, currency: inv.currency };
    }),
    inv.currency
  );
}

export const grossTotal = (inv: Invoice): Money => add(netTotal(inv), taxTotal(inv));

/** What is still owed. */
export function outstanding(inv: Invoice, allocations: readonly Allocation[]): Money {
  return subtract(grossTotal(inv), sum(allocations.map((a) => a.amount), inv.currency));
}

/**
 * Why this allocation cannot be made, or null.
 *
 * Over-allocation is refused rather than absorbed. An invoice paid to a
 * negative balance is either a duplicate receipt or a refund, and both are
 * their own document — silently letting the balance go negative loses that
 * distinction and quietly breaks the aging report.
 */
export function allocationProblem(
  inv: Invoice,
  existing: readonly Allocation[],
  next: Allocation
): string | null {
  if (inv.state === "DRAFT") return "Nothing can be allocated to a draft.";
  if (inv.state === "VOID") return "This invoice was voided.";
  if (inv.state === "WRITTEN_OFF") return "This invoice was written off.";
  if (next.amount.currency !== inv.currency) return `Allocations must be in ${inv.currency}.`;
  if (isZero(next.amount)) return "An allocation of nothing changes nothing.";
  if (isNegative(next.amount)) return "An allocation cannot be negative — record a refund instead.";

  if (existing.some((a) => a.paymentRef === next.paymentRef)) {
    // Idempotency at the domain level: the same payment allocated twice is the
    // classic double-count when a webhook is redelivered.
    return `${next.paymentRef} has already been allocated to this invoice.`;
  }

  const left = outstanding(inv, existing);
  if (compare(next.amount, left) > 0) {
    return `That is more than the ${toDisplayString(left)} ${inv.currency} still outstanding.`;
  }
  return null;
}

/** The state an invoice reaches once these allocations are applied. */
export function stateAfter(inv: Invoice, allocations: readonly Allocation[]): InvoiceState {
  if (inv.state === "DRAFT" || inv.state === "VOID" || inv.state === "WRITTEN_OFF") return inv.state;
  const left = outstanding(inv, allocations);
  if (isZero(left)) return "PAID";
  return allocations.length ? "PART_PAID" : "ISSUED";
}

/**
 * Why an invoice cannot be voided, or null.
 *
 * Voiding is only available before anything has been paid against it. After
 * that the correction is a credit note, because the payment really happened
 * and voiding would leave it allocated to a document that no longer exists.
 */
export function voidProblem(inv: Invoice, allocations: readonly Allocation[]): string | null {
  if (inv.state === "DRAFT") return "A draft does not need voiding — delete it.";
  if (inv.state === "VOID") return "It is already void.";
  if (allocations.length) {
    return "Something has already been paid against this invoice. Raise a credit note instead, so the payment stays attached to a real document.";
  }
  return null;
}

export type AgeBand = "current" | "1-30" | "31-60" | "61-90" | "90+";

/** Which age band an unpaid invoice falls into. */
export function ageBand(dueOn: Date | string, asAt: Date = new Date()): AgeBand {
  const days = Math.floor((asAt.getTime() - new Date(dueOn).getTime()) / 86_400_000);
  if (days <= 0) return "current";
  if (days <= 30) return "1-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

/** The aged balance, by band. */
export function aging(
  items: readonly { dueOn: Date | string; outstanding: Money }[],
  currency: string,
  asAt: Date = new Date()
): Record<AgeBand, Money> {
  const bands: Record<AgeBand, Money> = {
    current: zero(currency),
    "1-30": zero(currency),
    "31-60": zero(currency),
    "61-90": zero(currency),
    "90+": zero(currency),
  };
  for (const i of items) {
    if (isZero(i.outstanding)) continue;
    const b = ageBand(i.dueOn, asAt);
    bands[b] = add(bands[b], i.outstanding);
  }
  return bands;
}

/**
 * The double-entry an issued invoice produces.
 *
 * Returned as a description rather than posted here: the ledger owns posting,
 * and a module that both computed and posted its own entries would be able to
 * disagree with the balance check.
 */
export function postingFor(
  inv: Invoice,
  accounts: { control: string; tax: string }
): { accountCode: string; debit: Money; credit: Money; description: string }[] {
  const net = netTotal(inv);
  const tax = taxTotal(inv);
  const gross = add(net, tax);
  const z = zero(inv.currency);

  if (inv.side === "RECEIVABLE") {
    return [
      { accountCode: accounts.control, debit: gross, credit: z, description: `Invoice to ${inv.partyRef}` },
      ...inv.lines.map((l) => ({
        accountCode: l.accountCode,
        debit: z,
        credit: multiplyByQuantity(l.unitPrice, l.quantity),
        description: l.description,
      })),
      ...(isZero(tax) ? [] : [{ accountCode: accounts.tax, debit: z, credit: tax, description: "Tax" }]),
    ];
  }

  return [
    ...inv.lines.map((l) => ({
      accountCode: l.accountCode,
      debit: multiplyByQuantity(l.unitPrice, l.quantity),
      credit: z,
      description: l.description,
    })),
    ...(isZero(tax) ? [] : [{ accountCode: accounts.tax, debit: tax, credit: z, description: "Tax" }]),
    { accountCode: accounts.control, debit: z, credit: gross, description: `Bill from ${inv.partyRef}` },
  ];
}
