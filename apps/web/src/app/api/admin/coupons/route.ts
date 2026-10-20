import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const central = await getCentralAdmin();
  if (!central) {
    return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
  }
  const b = await req.json().catch(() => ({}));
  const code = String(b.code || "").trim().toUpperCase();
  if (!code) return NextResponse.json({ success: false, error: "Code required" }, { status: 400 });
  const amount = Number(b.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ success: false, error: "Invalid amount" }, { status: 400 });
  }
  const exists = await prisma.coupon.findUnique({ where: { code } });
  if (exists) return NextResponse.json({ success: false, error: "Code already exists" }, { status: 409 });

  await prisma.coupon.create({
    data: {
      code,
      description: b.description || null,
      discountType: b.discountType === "FIXED" ? "FIXED" : "PERCENT",
      amount: b.discountType === "FIXED" ? Math.round(amount * 100) : Math.round(amount),
      appliesToPlan: b.appliesToPlan || null,
      maxRedemptions: b.maxRedemptions ? Number(b.maxRedemptions) : null,
    },
  });
  await logAudit(central, "coupon.create", code, `${b.discountType === "FIXED" ? amount : amount + "%"}`);
  return NextResponse.json({ success: true });
}
