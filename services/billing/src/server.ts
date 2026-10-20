import Fastify from "fastify";
import { createLogger, ok, err, verifyToken, bearer } from "@app/shared";
import { prisma } from "@app/db";
import { getStripe } from "./stripe.js";
import { PLAN_PRICE_CENTS, STRIPE_PRICE_LOOKUP, isPaidPlan } from "./plans.js";
import { validateCoupon, recordRedemption, discountLabel } from "./coupons.js";

/**
 * BILLING service — plans, Stripe checkout, coupons, webhooks, transactions.
 * On payment success it upgrades the user's plan and records the transaction.
 */
const log = createLogger("billing");
const app = Fastify({ loggerInstance: log });
const PORT = Number(process.env.PORT || 8080);
const APP_URL = process.env.APP_URL || "http://localhost:3000";

// Stripe webhooks need the raw body for signature verification.
app.addContentTypeParser("application/json", { parseAs: "buffer" }, (_req, body, done) => {
  try {
    done(null, { raw: body, json: JSON.parse(body.toString() || "{}") });
  } catch (e) {
    done(e as Error);
  }
});

app.get("/health", async () => ok({ service: "billing", status: "up" }));
app.get("/ready", async () => ok({ ready: true }));

// Validate a coupon (used by the pricing/checkout UI before paying).
app.post("/v1/billing/coupons/validate", async (req, reply) => {
  const claims = verifyToken(bearer(req.headers.authorization));
  if (!claims) return reply.code(401).send(err("Unauthorized"));
  const b = ((req.body as { json?: Record<string, unknown> })?.json ?? req.body ?? {}) as {
    code: string;
    plan: string;
  };
  if (!isPaidPlan(b.plan)) return reply.code(400).send(err("Invalid plan"));
  const result = await validateCoupon(b.code, b.plan, PLAN_PRICE_CENTS[b.plan], claims.sub);
  if (!result.ok) return reply.code(400).send(err(result.error));
  return ok({
    discountCents: result.discountCents,
    finalCents: result.finalCents,
    label: discountLabel(result.coupon),
  });
});

// Create a Stripe Checkout session for a paid plan.
app.post("/v1/billing/checkout", async (req, reply) => {
  const claims = verifyToken(bearer(req.headers.authorization));
  if (!claims) return reply.code(401).send(err("Unauthorized"));
  const b = ((req.body as { json?: Record<string, unknown> })?.json ?? req.body ?? {}) as { plan: string };
  if (!isPaidPlan(b.plan)) return reply.code(400).send(err("Invalid plan"));

  const stripe = getStripe();
  if (!stripe) return reply.code(503).send(err("Billing is not configured (STRIPE_SECRET_KEY missing)"));
  const priceId = STRIPE_PRICE_LOOKUP[b.plan];
  if (!priceId) return reply.code(503).send(err(`No Stripe price configured for ${b.plan}`));

  const user = await prisma.user.findUnique({ where: { id: claims.sub } });
  if (!user) return reply.code(404).send(err("User not found"));

  // Optional coupon (e.g. a reseller referral code): validate + apply as a Stripe discount.
  const metadata: Record<string, string> = { userId: user.id, plan: b.plan };
  let discounts: { coupon: string }[] | undefined;
  const code = ((req.body as { json?: { couponCode?: string } })?.json?.couponCode ?? (req.body as { couponCode?: string })?.couponCode ?? "").toString().trim();
  if (code) {
    const v = await validateCoupon(code, b.plan, PLAN_PRICE_CENTS[b.plan], user.id);
    if (!v.ok) return reply.code(400).send(err(v.error));
    try {
      const sc =
        v.coupon.discountType === "PERCENT"
          ? await stripe.coupons.create({ percent_off: v.coupon.amount, duration: "once" })
          : await stripe.coupons.create({ amount_off: v.coupon.amount, currency: "eur", duration: "once" });
      discounts = [{ coupon: sc.id }];
      metadata.couponId = v.coupon.id;
    } catch (e) {
      log.error({ err: e }, "stripe coupon create failed");
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${APP_URL}/dashboard?checkout=success`,
    cancel_url: `${APP_URL}/pricing?checkout=cancelled`,
    ...(discounts ? { discounts } : {}),
    metadata,
  });
  return ok({ url: session.url });
});

// Create a Stripe subscription Checkout session for a single solution (revenue-shared 50/50).
app.post("/v1/billing/solution-checkout", async (req, reply) => {
  const claims = verifyToken(bearer(req.headers.authorization));
  if (!claims) return reply.code(401).send(err("Unauthorized"));
  const b = ((req.body as { json?: Record<string, unknown> })?.json ?? req.body ?? {}) as { solutionId?: string };

  const stripe = getStripe();
  if (!stripe) return reply.code(503).send(err("Billing is not configured (STRIPE_SECRET_KEY missing)"));

  const sol = await prisma.solution.findUnique({ where: { id: String(b.solutionId || "") } });
  if (!sol || !sol.published) return reply.code(404).send(err("Solution not available"));
  if (sol.price <= 0) return reply.code(400).send(err("This solution is contact-priced — no checkout"));
  const user = await prisma.user.findUnique({ where: { id: claims.sub } });
  if (!user) return reply.code(404).send(err("User not found"));

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: (sol.currency || "EUR").toLowerCase(),
          unit_amount: sol.price,
          recurring: { interval: "month" },
          product_data: { name: sol.title },
        },
        quantity: 1,
      },
    ],
    subscription_data: {
      metadata: {
        type: "solution",
        solutionId: sol.id,
        ownerId: sol.ownerId ?? "",
        partnerSharePercent: String(sol.partnerSharePercent),
        buyerId: user.id,
      },
    },
    success_url: `${APP_URL}/dashboard?sub=success`,
    cancel_url: `${APP_URL}/marketplace/${sol.slug}?sub=cancelled`,
    metadata: { type: "solution", solutionId: sol.id },
  });
  return ok({ url: session.url });
});

// Stripe webhook — verify signature, then upgrade the user + record the transaction.
app.post("/v1/billing/webhooks/stripe", async (req, reply) => {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return reply.code(503).send(err("Stripe not configured"));

  const raw = (req.body as { raw?: Buffer })?.raw;
  const sig = req.headers["stripe-signature"] as string;
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw as Buffer, sig, secret);
  } catch (e) {
    return reply.code(400).send(err(`Webhook signature failed: ${(e as Error).message}`));
  }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as { metadata?: Record<string, string>; customer?: string; subscription?: string };
    const userId = s.metadata?.userId;
    const plan = s.metadata?.plan;
    const couponId = s.metadata?.couponId || null;
    if (userId && plan && isPaidPlan(plan)) {
      const expires = new Date(Date.now() + 31 * 24 * 3600_000);
      await prisma.user.update({
        where: { id: userId },
        data: {
          plan: plan as never,
          planExpiresAt: expires,
          stripeCustomerId: s.customer ?? undefined,
          stripeSubscriptionId: s.subscription ?? undefined,
        },
      });
      await prisma.paymentTransaction.create({
        data: {
          userId,
          plan: plan as never,
          amount: PLAN_PRICE_CENTS[plan],
          method: "STRIPE",
          status: "COMPLETED",
          providerRef: s.subscription ?? null,
          couponId,
          completedAt: new Date(),
        },
      });
      if (couponId) await recordRedemption(couponId);
      log.info({ userId, plan, couponId }, "plan upgraded via Stripe");
    }
  }

  // Per-solution subscription paid (first + renewals) → record a 50/50 PartnerSale.
  if (event.type === "invoice.payment_succeeded") {
    const inv = event.data.object as { id: string; amount_paid?: number; currency?: string; subscription?: string };
    if (inv.subscription) {
      try {
        const sub = await stripe.subscriptions.retrieve(inv.subscription);
        const m = (sub.metadata || {}) as Record<string, string>;
        const amount = inv.amount_paid ?? 0;
        if (m.type === "solution" && m.ownerId && m.solutionId && amount > 0) {
          const exists = await prisma.partnerSale.findUnique({ where: { externalId: inv.id } });
          if (!exists) {
            const share = Math.min(100, Math.max(0, parseInt(m.partnerSharePercent || "50", 10)));
            const partnerShare = Math.round((amount * share) / 100);
            await prisma.partnerSale.create({
              data: {
                ownerId: m.ownerId,
                solutionId: m.solutionId,
                amount,
                currency: (inv.currency || "eur").toUpperCase(),
                partnerShare,
                platformShare: amount - partnerShare,
                customerRef: m.buyerId || null,
                externalId: inv.id,
                status: "COMPLETED",
              },
            });
            log.info({ solutionId: m.solutionId, amount }, "solution subscription sale recorded");
          }
        }
      } catch (e) {
        log.error({ err: e }, "solution invoice handling failed");
      }
    }
  }

  // Renewal: extend the access window to the new period end.
  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as { id: string; status: string; current_period_end?: number };
    const user = await prisma.user.findFirst({ where: { stripeSubscriptionId: sub.id } });
    if (user) {
      if (sub.status === "active" || sub.status === "trialing") {
        const end = sub.current_period_end ? new Date(sub.current_period_end * 1000) : undefined;
        await prisma.user.update({ where: { id: user.id }, data: { planExpiresAt: end } });
      } else if (sub.status === "canceled" || sub.status === "unpaid") {
        await prisma.user.update({ where: { id: user.id }, data: { plan: "STARTER", planExpiresAt: null } });
      }
      log.info({ userId: user.id, status: sub.status }, "subscription updated");
    }
  }

  // Cancellation: downgrade to STARTER.
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as { id: string };
    const user = await prisma.user.findFirst({ where: { stripeSubscriptionId: sub.id } });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { plan: "STARTER", planExpiresAt: null, stripeSubscriptionId: null },
      });
      log.info({ userId: user.id }, "subscription cancelled → STARTER");
    }
  }

  // Failed payment: record it (access persists until period end / next dunning).
  if (event.type === "invoice.payment_failed") {
    const inv = event.data.object as { customer?: string };
    const user = inv.customer ? await prisma.user.findFirst({ where: { stripeCustomerId: inv.customer } }) : null;
    if (user) {
      await prisma.paymentTransaction.create({
        data: { userId: user.id, plan: user.plan, amount: 0, method: "STRIPE", status: "FAILED" },
      });
      log.warn({ userId: user.id }, "invoice payment failed");
    }
  }

  return ok({ received: true });
});

// Redeem a 100%-off coupon directly (no PSP) — e.g. ENTERPRISE comp or full discount.
app.post("/v1/billing/coupons/redeem", async (req, reply) => {
  const claims = verifyToken(bearer(req.headers.authorization));
  if (!claims) return reply.code(401).send(err("Unauthorized"));
  const b = ((req.body as { json?: Record<string, unknown> })?.json ?? req.body ?? {}) as {
    code: string;
    plan: string;
  };
  if (!isPaidPlan(b.plan)) return reply.code(400).send(err("Invalid plan"));
  const result = await validateCoupon(b.code, b.plan, PLAN_PRICE_CENTS[b.plan], claims.sub);
  if (!result.ok) return reply.code(400).send(err(result.error));
  if (result.finalCents > 0) return reply.code(400).send(err("This coupon does not fully cover the plan"));

  const expires = new Date(Date.now() + 31 * 24 * 3600_000);
  await prisma.user.update({ where: { id: claims.sub }, data: { plan: b.plan as never, planExpiresAt: expires } });
  await prisma.paymentTransaction.create({
    data: {
      userId: claims.sub,
      plan: b.plan as never,
      amount: 0,
      method: "COUPON",
      status: "COMPLETED",
      couponId: result.coupon.id,
      discountCents: result.discountCents,
      completedAt: new Date(),
    },
  });
  await recordRedemption(result.coupon.id);
  return ok({ upgraded: true });
});

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => log.info(`billing on :${PORT}`));
