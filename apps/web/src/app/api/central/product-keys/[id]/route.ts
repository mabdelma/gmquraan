import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Revoke (deactivate) a product key. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const key = await prisma.productKey.findUnique({ where: { id } });
  if (!key) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  await prisma.productKey.update({ where: { id }, data: { active: false, revokedAt: new Date() } });
  await logAudit(admin, "productkey.revoke", key.name);
  return NextResponse.json({ success: true });
}
