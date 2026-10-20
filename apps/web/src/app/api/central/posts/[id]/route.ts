import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  const b = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (b.title !== undefined) data.title = String(b.title).trim();
  if (b.excerpt !== undefined) data.excerpt = b.excerpt ? String(b.excerpt).slice(0, 300) : null;
  if (b.body !== undefined) data.body = String(b.body);
  if (b.coverImage !== undefined) data.coverImage = b.coverImage ? String(b.coverImage) : null;
  if (b.published !== undefined) {
    data.published = Boolean(b.published);
    // Stamp publishedAt the first time it goes live.
    if (b.published && !existing.publishedAt) data.publishedAt = new Date();
  }

  await prisma.post.update({ where: { id }, data: data as never });
  await logAudit(admin, "post.update", existing.slug);
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  await prisma.post.delete({ where: { id } });
  await logAudit(admin, "post.delete", post.slug);
  return NextResponse.json({ success: true });
}
