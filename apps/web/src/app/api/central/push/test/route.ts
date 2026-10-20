import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { sendPush } from "@/lib/push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/central/push/test — central-admin only.
 * Fires a test notification to every admin device. Use it to verify the FCM/APNs
 * wiring after credentials are set. Returns { sent, total }: total=0 means no
 * device is registered yet (or push creds aren't configured).
 */
export async function POST() {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const admins = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    select: { id: true },
  });
  const result = await sendPush(
    { title: "Unskinned test push ✅", body: "Push notifications are working.", data: { type: "test" } },
    { userId: { in: admins.map((a) => a.id) } }
  );

  return NextResponse.json({ success: true, ...result });
}
