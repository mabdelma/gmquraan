/**
 * Unskinned reseller client — drop into any Node/TS product to share income with
 * Unskinned resellers.
 *
 *   import { createResellerClient } from "./reseller";
 *   const r = createResellerClient(process.env.APP_PRODUCT_KEY!);
 *
 *   // at checkout: apply the discount if the code is a valid Unskinned reseller code
 *   const v = await r.validate(code);
 *   if (v.valid) applyDiscount(v.discountPercent);
 *
 *   // after successful payment: report the sale (reseller earns commission)
 *   await r.reportSale({ code, amountCents: 12000, currency: "EUR", externalId: orderId });
 *
 * The product key is issued in the Unskinned central console → Resellers → Connected products.
 */
const APP_BASE = process.env.APP_API_BASE || "https://example.com";

export type ValidateResult =
  | { valid: false }
  | { valid: true; code: string; resellerId: string; resellerName: string | null; discountPercent: number; commissionPercent: number };

export function createResellerClient(productKey: string, base = APP_BASE) {
  const headers = { authorization: `Bearer ${productKey}`, "content-type": "application/json" };

  return {
    /** Validate a reseller code (returns { valid:false } for unknown codes — never throws on a bad code). */
    async validate(code: string): Promise<ValidateResult> {
      try {
        const res = await fetch(`${base}/api/v1/reseller/validate?code=${encodeURIComponent(code)}`, { headers });
        const j = await res.json();
        return j?.valid ? j : { valid: false };
      } catch {
        return { valid: false };
      }
    },

    /**
     * Report an attributed sale. Best-effort: never throws, so it can't break your
     * checkout. Pass a stable externalId (your order id) — reporting is idempotent.
     */
    async reportSale(input: {
      code: string;
      amountCents: number;
      currency?: string;
      externalId: string;
      customerRef?: string;
    }): Promise<{ ok: boolean; commissionCents?: number }> {
      try {
        const res = await fetch(`${base}/api/v1/reseller/sales`, {
          method: "POST",
          headers,
          body: JSON.stringify({ currency: "EUR", ...input }),
        });
        const j = await res.json();
        return { ok: !!j?.ok, commissionCents: j?.commissionCents };
      } catch {
        return { ok: false };
      }
    },
  };
}
