import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { signToken } from "@app/shared";
import { getCentralAdmin } from "@/lib/central-session";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/notify";
import { notifyUser } from "@/lib/push";
import { emit } from "@/lib/events";
import { PAYOUT_MIN_THRESHOLD_CENTS } from "@/lib/partner-policy";

const APP_URL = process.env.APP_URL || "https://gmquran.com";
const BILLING = process.env.BILLING_URL_INTERNAL || "http://app-billing:8080";

/** Record a reseller payout (central admin). */
export async function POST(req: Request) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const resellerId = String(b.resellerId || "");
  const amount = Math.round(Number(b.amount));
  if (!resellerId || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ success: false, error: "resellerId and a positive amount are required" }, { status: 400 });
  }
  if (amount < PAYOUT_MIN_THRESHOLD_CENTS) {
    return NextResponse.json(
      { success: false, error: `Below the minimum payout threshold (${PAYOUT_MIN_THRESHOLD_CENTS / 100}); it rolls over` },
      { status: 400 }
    );
  }
  const reseller = await prisma.user.findUnique({
    where: { id: resellerId },
    select: { id: true, email: true, locale: true, stripeConnectId: true },
  });
  if (!reseller) return NextResponse.json({ success: false, error: "Reseller not found" }, { status: 404 });

  // If the recipient has a Connect account, move the money automatically via Stripe.
  // Falls back to a manually-recorded payout when they haven't onboarded.
  let note = b.note ? String(b.note) : null;
  if (reseller.stripeConnectId) {
    try {
      const token = signToken({ sub: admin.id, role: admin.role, ttlMs: 60_000 });
      const r = await fetch(`${BILLING}/v1/billing/connect/transfer`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ userId: resellerId, amountCents: amount, currency: "EUR" }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.data?.transferId) {
        note = `Stripe Connect · ${j.data.transferId}${note ? ` · ${note}` : ""}`;
      } else {
        // They have a Connect account but the transfer couldn't complete — surface it, don't record a misleading payout.
        return NextResponse.json({ success: false, error: j.error || j.data?.error || "Connect transfer failed" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ success: false, error: "Billing service unavailable for transfer" }, { status: 502 });
    }
  }

  await prisma.payout.create({
    data: { resellerId, amount, status: "PAID", note, paidAt: new Date() },
  });
  await logAudit(admin, "payout.record", reseller.email, `€${(amount / 100).toFixed(2)}${reseller.stripeConnectId ? " (Connect)" : ""}`);
  void emit("payout.sent", { resellerId, amountCents: amount, viaConnect: !!reseller.stripeConnectId });

  // Notify the recipient that they've been paid.
  await sendEmail({
    to: reseller.email,
    template: "payoutSent",
    locale: reseller.locale ?? undefined,
    vars: { url: `${APP_URL}/partner/earnings` },
  });
  void notifyUser(resellerId, { title: "Payout sent 💸", body: `€${(amount / 100).toFixed(2)} is on its way.`, data: { type: "payout", url: "/partner/earnings" } });
  return NextResponse.json({ success: true });
}
