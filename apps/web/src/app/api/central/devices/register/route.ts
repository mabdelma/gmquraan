import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";

export const dynamic = "force-dynamic";

const PLATFORMS = ["ios", "android", "web"];

/**
 * POST /api/central/devices/register — register a push device for the signed-in
 * central admin. Links the DeviceToken to the User record matching the admin's
 * email, so notifyAdmins() (which targets ADMIN/SUPER_ADMIN user ids) reaches it.
 * Body: { token, platform }.
 */
export async function POST(req: Request) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  let b: { token?: unknown; platform?: unknown };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }
  const token = String(b.token || "").trim().slice(0, 2000);
  const platform = PLATFORMS.includes(String(b.platform)) ? String(b.platform) : "web";
  if (!token) return NextResponse.json({ success: false, error: "token required" }, { status: 400 });

  // Resolve the admin's User row so the device links to a real admin account.
  const user = await prisma.user.findUnique({ where: { email: admin.email }, select: { id: true } });

  try {
    await prisma.deviceToken.upsert({
      where: { token },
      update: { platform, lastSeenAt: new Date(), ...(user?.id ? { userId: user.id } : {}) },
      create: { token, platform, userId: user?.id ?? null },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Could not register device" }, { status: 500 });
  }

  return NextResponse.json({ success: true, linked: !!user });
}
