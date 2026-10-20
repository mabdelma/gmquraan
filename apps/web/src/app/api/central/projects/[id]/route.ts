import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { PROJECT_STATUSES } from "@/lib/central-projects";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  const b = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (b.title !== undefined) data.title = String(b.title).trim();
  if (b.summary !== undefined) data.summary = String(b.summary).trim();
  if (b.body !== undefined) data.body = String(b.body);
  if (b.sector !== undefined) data.sector = b.sector ? String(b.sector) : null;
  if (b.coverImage !== undefined) data.coverImage = b.coverImage ? String(b.coverImage) : null;
  if (b.status !== undefined) {
    const status = String(b.status).toUpperCase();
    if ((PROJECT_STATUSES as readonly string[]).includes(status)) data.status = status;
  }
  if (b.published !== undefined) {
    data.published = Boolean(b.published);
    // Stamp publishedAt the first time it goes live.
    if (b.published && !existing.publishedAt) data.publishedAt = new Date();
  }

  await prisma.project.update({ where: { id }, data: data as never });
  await logAudit(admin, "project.update", existing.slug);
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  await prisma.project.delete({ where: { id } });
  await logAudit(admin, "project.delete", project.slug);
  return NextResponse.json({ success: true });
}
