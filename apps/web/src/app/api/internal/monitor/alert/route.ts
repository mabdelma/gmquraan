import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/notify";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Internal ops-alert sink for the VPS health monitor. Protected by a shared
 * secret (MONITOR_SECRET) so it can be called from a host cron over HTTPS.
 * Sends a branded system-alert email to the ops address via notifications.
 */
export async function POST(req: Request) {
  const secret = process.env.MONITOR_SECRET;
  if (!secret || req.headers.get("x-monitor-secret") !== secret) {
    return NextResponse.json({ success: false }, { status: 403 });
  }
  let body: { subject?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "invalid json" }, { status: 400 });
  }
  const to = process.env.MONITOR_ALERT_TO || "info@example.com";
  const subject = (body.subject || "Unskinned system alert").slice(0, 180);
  const message = (body.message || "(no detail)").slice(0, 4000);

  const sent = await sendEmail({
    to,
    template: "systemAlert",
    vars: { alertSubject: subject, message },
  });
  return NextResponse.json({ success: sent });
}
