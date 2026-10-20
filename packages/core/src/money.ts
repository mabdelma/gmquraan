/**
 * Exact money arithmetic (D-001).
 *
 * `Decimal(18,4)` is the storage decision. This is the arithmetic that has to
 * match it, because the moment a figure passes through a JavaScript number the
 * storage type stops protecting anything: 0.1 + 0.2 is 0.30000000000000004 in
 * IEEE 754 whatever column it later lands in.
 *
 * So amounts are held as a bigint of ten-thousandths — the same scale as the
 * column — and every operation is integer arithmetic. Parsing and formatting
 * are the only places a string is involved, and neither uses `parseFloat`.
 *
 * Four places because a BOQ line is a quantity times a unit cost and both carry
 * four in the reference model. Presentation rounds to two at the edge, once.
 */

export const SCALE = 4;
const FACTOR = 10_000n;

/** An exact amount, in ten-thousandths, with its currency. */
export type Money = { minor: bigint; currency: string };

export class MoneyError extends Error {}

const CURRENCY = /^[A-Z]{3}$/;

/**
 * Parse a decimal string. Never a number.
 *
 * Taking a `number` here would let a caller lose precision before this function
 * ever ran, which is the failure this module exists to prevent — so the type
 * refuses it and the parser reads the digits itself.
 */
export function money(amount: string | bigint, currency: string): Money {
  if (!CURRENCY.test(currency)) throw new MoneyError(`"${currency}" is not an ISO 4217 code.`);
  if (typeof amount === "bigint") return { minor: amount, currency };

  const s = amount.trim();
  if (!/^-?\d+(\.\d+)?$/.test(s)) throw new MoneyError(`"${amount}" is not a decimal amount.`);

  const negative = s.startsWith("-");
  const [whole, frac = ""] = (negative ? s.slice(1) : s).split(".");
  if (frac.length > SCALE) {
    // Refused rather than rounded. Silently dropping a digit from an amount
    // somebody typed is how a total stops reconciling with its source.
    throw new MoneyError(`"${amount}" has more than ${SCALE} decimal places.`);
  }

  const scaled = BigInt(whole) * FACTOR + BigInt(frac.padEnd(SCALE, "0") || "0");
  return { minor: negative ? -scaled : scaled, currency };
}

export const zero = (currency: string): Money => money(0n, currency);

function sameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    // Never silently converted. A rate is a business fact with a date and a
    // source, not something arithmetic may invent.
    throw new MoneyError(`Cannot combine ${a.currency} and ${b.currency} without an explicit rate.`);
  }
}

export function add(a: Money, b: Money): Money {
  sameCurrency(a, b);
  return { minor: a.minor + b.minor, currency: a.currency };
}

export function subtract(a: Money, b: Money): Money {
  sameCurrency(a, b);
  return { minor: a.minor - b.minor, currency: a.currency };
}

export function negate(a: Money): Money {
  return { minor: -a.minor, currency: a.currency };
}

export function sum(items: readonly Money[], currency: string): Money {
  return items.reduce((acc, m) => add(acc, m), zero(currency));
}

export const isZero = (a: Money): boolean => a.minor === 0n;
export const isNegative = (a: Money): boolean => a.minor < 0n;
export const compare = (a: Money, b: Money): number => {
  sameCurrency(a, b);
  return a.minor === b.minor ? 0 : a.minor < b.minor ? -1 : 1;
};
export const equals = (a: Money, b: Money): boolean => compare(a, b) === 0;

/**
 * Multiply by a quantity given as a decimal string.
 *
 * Half-up at the last place. Rounding is explicit and happens once, here,
 * rather than being inherited from whatever the runtime felt like doing.
 */
export function multiply(a: Money, quantity: string): Money {
  const q = money(quantity, a.currency); // reuse the parser; currency is ignored
  const product = a.minor * q.minor; // scaled by FACTOR twice
  const rounded = divideRoundHalfUp(product, FACTOR);
  return { minor: rounded, currency: a.currency };
}

function divideRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  const negative = numerator < 0n !== denominator < 0n;
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  const q = n / d;
  const remainder = n % d;
  const rounded = remainder * 2n >= d ? q + 1n : q;
  return negative ? -rounded : rounded;
}

/**
 * Split an amount into `parts`, losing nothing.
 *
 * The remainder is distributed one unit at a time rather than left on the last
 * share, so an allocation across cost codes still sums to what was allocated.
 * Dropping a remainder is the classic way a ledger stops balancing by a penny
 * that nobody can find.
 */
export function allocate(a: Money, parts: number): Money[] {
  if (!Number.isInteger(parts) || parts < 1) throw new MoneyError("Parts must be a positive integer.");
  const n = BigInt(parts);
  const base = a.minor / n;
  let remainder = a.minor - base * n;
  const step = a.minor < 0n ? -1n : 1n;

  return Array.from({ length: parts }, () => {
    let share = base;
    if (remainder !== 0n) {
      share += step;
      remainder -= step;
    }
    return { minor: share, currency: a.currency };
  });
}

/** The exact value, at full scale. Suitable for `Decimal(18,4)`. */
export function toDecimalString(a: Money): string {
  const negative = a.minor < 0n;
  const abs = negative ? -a.minor : a.minor;
  const whole = abs / FACTOR;
  const frac = (abs % FACTOR).toString().padStart(SCALE, "0");
  return `${negative ? "-" : ""}${whole}.${frac}`;
}

/**
 * For display, rounded to the currency's minor unit.
 *
 * Presentation only. A rounded figure must never be written back or added to
 * anything — that is how a total drifts from the lines it was made of.
 */
export function toDisplayString(a: Money, places = 2): string {
  const factor = 10n ** BigInt(SCALE - places);
  const rounded = divideRoundHalfUp(a.minor, factor);
  const negative = rounded < 0n;
  const abs = negative ? -rounded : rounded;
  const unit = 10n ** BigInt(places);
  const whole = abs / unit;
  const frac = places ? `.${(abs % unit).toString().padStart(places, "0")}` : "";
  return `${negative ? "-" : ""}${whole}${frac}`;
}
