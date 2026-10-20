import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { generateTotpSecret, verifyTotp, otpauthUri } from "@/lib/totp";
import { logAudit } from "@/lib/audit";
import { limited } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Current 2FA state for the signed-in admin. */
export async function GET() {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false }, { status: 403 });
  const u = await prisma.user.findUnique({ where: { id: admin.id }, select: { totpEnabled: true } });
  return NextResponse.json({ success: true, enabled: !!u?.totpEnabled });
}

/** Manage the signed-in admin's own TOTP 2FA: setup | enable | disable. */
export async function POST(req: Request) {
  const tooMany = limited(req, "central-2fa", 15, 60_000);
  if (tooMany) return tooMany;
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const action = String(b.action || "");
  const code = String(b.code || "").trim();

  if (action === "setup") {
    const secret = generateTotpSecret();
    await prisma.user.update({ where: { id: admin.id }, data: { totpSecret: secret, totpEnabled: false } });
    return NextResponse.json({ success: true, secret, uri: otpauthUri(secret, admin.email) });
  }

  if (action === "enable") {
    const u = await prisma.user.findUnique({ where: { id: admin.id }, select: { totpSecret: true } });
    if (!u?.totpSecret) return NextResponse.json({ success: false, error: "Start setup first" }, { status: 400 });
    if (!verifyTotp(u.totpSecret, code)) return NextResponse.json({ success: false, error: "Invalid code" }, { status: 400 });
    await prisma.user.update({ where: { id: admin.id }, data: { totpEnabled: true } });
    await logAudit(admin, "admin.2fa_enabled", admin.email);
    return NextResponse.json({ success: true });
  }

  if (action === "disable") {
    const u = await prisma.user.findUnique({ where: { id: admin.id }, select: { totpSecret: true, totpEnabled: true } });
    if (u?.totpEnabled && u.totpSecret && !verifyTotp(u.totpSecret, code)) {
      return NextResponse.json({ success: false, error: "Invalid code" }, { status: 400 });
    }
    await prisma.user.update({ where: { id: admin.id }, data: { totpSecret: null, totpEnabled: false } });
    await logAudit(admin, "admin.2fa_disabled", admin.email);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
}
