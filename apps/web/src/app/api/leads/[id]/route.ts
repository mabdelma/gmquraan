import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";

const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const central = await getCentralAdmin();
  if (!central) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  if (!STATUSES.includes(b.status)) {
    return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
  }
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  await prisma.lead.update({ where: { id }, data: { status: b.status, lastContactedAt: new Date() } });
  return NextResponse.json({ success: true });
}
