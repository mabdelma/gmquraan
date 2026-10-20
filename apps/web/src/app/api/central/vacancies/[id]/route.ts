import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { JOB_TYPES, WORK_MODES } from "@/lib/central-vacancies";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const existing = await prisma.vacancy.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  const b = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (b.title !== undefined) data.title = String(b.title).trim();
  if (b.summary !== undefined) data.summary = String(b.summary).trim();
  if (b.body !== undefined) data.body = String(b.body);
  if (b.department !== undefined) data.department = b.department ? String(b.department) : null;
  if (b.location !== undefined) data.location = String(b.location).trim();
  if (b.workMode !== undefined) {
    const workMode = String(b.workMode).toUpperCase();
    if ((WORK_MODES as readonly string[]).includes(workMode)) data.workMode = workMode;
  }
  if (b.type !== undefined) {
    const type = String(b.type).toUpperCase();
    if ((JOB_TYPES as readonly string[]).includes(type)) data.type = type;
  }
  if (b.published !== undefined) {
    data.published = Boolean(b.published);
    // Stamp publishedAt the first time it goes live.
    if (b.published && !existing.publishedAt) data.publishedAt = new Date();
  }

  await prisma.vacancy.update({ where: { id }, data: data as never });
  await logAudit(admin, "vacancy.update", existing.slug);
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const vacancy = await prisma.vacancy.findUnique({ where: { id } });
  if (!vacancy) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  await prisma.vacancy.delete({ where: { id } });
  await logAudit(admin, "vacancy.delete", vacancy.slug);
  return NextResponse.json({ success: true });
}
