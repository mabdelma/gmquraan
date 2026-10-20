import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { logAudit } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCentralAdmin();
  if (!actor) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const approved = Boolean(b.approved);
  await prisma.review.update({ where: { id }, data: { approved, moderated: true } });
  await logAudit(actor, approved ? "review.approve" : "review.reject", id);
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCentralAdmin();
  if (!actor) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await prisma.review.delete({ where: { id } });
  await logAudit(actor, "review.delete", id);
  return NextResponse.json({ success: true });
}