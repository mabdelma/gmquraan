# Unskinned Reseller Integration

Let any product share income with Unskinned resellers: accept a
reseller's referral code at checkout (buyer gets the discount) and report the
sale (reseller earns commission). Two calls. ~5 lines.

## 1. Get a product key
Unskinned central console → **Resellers → Connected products → Issue key** (one per
product). Store it as `APP_PRODUCT_KEY` in that product's environment.

## 2. Drop in the client
Copy `app-reseller.ts` (Node/TS) or `app-reseller.php` (PHP) into the product.

## 3. Wire two points in the checkout

**At checkout** — when the buyer enters a promo/referral code:
```ts
const r = createResellerClient(process.env.APP_PRODUCT_KEY!);
const v = await r.validate(code);
if (v.valid) applyDiscountPercent(v.discountPercent); // e.g. 10%
```

**After a successful payment** (order paid / webhook) — report it once:
```ts
await r.reportSale({
  code,                       // the reseller code used
  amountCents: order.totalCents,
  currency: order.currency,   // "EUR"
  externalId: order.id,       // your order id — makes it idempotent
  customerRef: order.customerId, // optional, opaque
});
```

## Notes
- `reportSale` is **best-effort and never throws** — it can't break your checkout.
- It's **idempotent** on `externalId`, so retries/duplicate webhooks are safe.
- Commission accrues to the reseller and is paid out from Unskinned central → Payouts.
- Endpoints: `GET /api/v1/reseller/validate?code=…`, `POST /api/v1/reseller/sales`,
  auth `Authorization: Bearer <APP_PRODUCT_KEY>`, base `https://example.com`.
