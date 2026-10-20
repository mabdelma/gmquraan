import { NextResponse } from "next/server";
import { prisma } from "@app/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Data-retention / cleanup cron. Protected by CRON_SECRET (Bearer). Purges only
 * non-user-facing stale data:
 *   - page views older than 90 days (analytics minimization)
 *   - expired auth tokens (verify/reset)
 *   - read notifications older than 90 days
 * Fail-closed: disabled entirely if CRON_SECRET is unset.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const d90 = new Date(now.getTime() - 90 * 24 * 3600_000);

  const [views, tokens, notifs] = await Promise.all([
    prisma.pageView.deleteMany({ where: { createdAt: { lt: d90 } } }).catch(() => ({ count: 0 })),
    prisma.authToken.deleteMany({ where: { expires: { lt: now } } }).catch(() => ({ count: 0 })),
    prisma.notification.deleteMany({ where: { read: true, createdAt: { lt: d90 } } }).catch(() => ({ count: 0 })),
  ]);

  return NextResponse.json({
    success: true,
    purged: { pageViews: views.count, expiredTokens: tokens.count, readNotifications: notifs.count },
  });
}
