import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { limited } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const PLATFORMS = ["ios", "android", "web", "unifiedpush"];

/**
 * POST /api/v1/devices/register — store a push-notification device token from the
 * mobile (Capacitor) app. Body: { token, platform }. Idempotent per token; links
 * to the acting central admin. Called same-origin by the native-bridge running
 * inside the app shell.
 */
export async function POST(req: Request) {
  const tooMany = limited(req, "device-register", 30, 60_000);
  if (tooMany) return tooMany;

  const central = await getCentralAdmin();
  if (!central) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  let b: { token?: unknown; platform?: unknown };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }
  // Web Push subscriptions are JSON blobs (endpoint + keys) and run longer than FCM/APNs tokens.
  const token = String(b.token || "").trim().slice(0, 2000);
  const platform = PLATFORMS.includes(String(b.platform)) ? String(b.platform) : "unknown";
  if (!token) return NextResponse.json({ success: false, error: "token required" }, { status: 400 });

  try {
    await prisma.deviceToken.upsert({
      where: { token },
      update: { platform, lastSeenAt: new Date(), userId: central.id },
      create: { token, platform, userId: central.id },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Could not register device" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
