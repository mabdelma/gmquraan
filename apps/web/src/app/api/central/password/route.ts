import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { limited } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

/** Change the central admin's own password (verifies the current password). */
export async function POST(req: Request) {
  const tooMany = limited(req, "central-password", 10, 60_000);
  if (tooMany) return tooMany;

  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Not signed in" }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const current = String(b.currentPassword || "").trim();
  const next = String(b.newPassword || "").trim();
  if (next.length < 8) {
    return NextResponse.json({ success: false, error: "New password must be 8+ characters" }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({ where: { id: admin.id } });
  if (!dbUser?.passwordHash) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  const ok = await bcrypt.compare(current, dbUser.passwordHash);
  if (!ok) return NextResponse.json({ success: false, error: "Current password is incorrect" }, { status: 400 });

  await prisma.user.update({ where: { id: admin.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  await logAudit(admin, "admin.password_change", admin.email);
  return NextResponse.json({ success: true });
}
