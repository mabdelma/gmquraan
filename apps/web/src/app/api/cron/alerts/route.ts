import { NextResponse } from "next/server";

const ENGAGEMENT = process.env.ENGAGEMENT_URL_INTERNAL || "http://localhost:8084";

/**
 * Saved-search alert cron. Protected by CRON_SECRET (Authorization: Bearer …).
 * Triggers the engagement service to email digests for matching new solutions.
 *   Schedule e.g. with a system cron / Vercel cron hitting this endpoint.
 */
export async function GET(req: Request) {
  // Fail closed: without a configured secret the endpoint is disabled entirely,
  // so it can never be triggered by an anonymous request.
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const res = await fetch(`${ENGAGEMENT}/v1/engagement/alerts/run`, { method: "POST" }).catch(() => null);
  if (!res) return NextResponse.json({ success: false, error: "Engagement service unavailable" }, { status: 502 });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
