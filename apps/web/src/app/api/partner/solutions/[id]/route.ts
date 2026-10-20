import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { logAudit } from "@/lib/audit";

const toArr = (v: unknown) =>
  String(v ?? "").split(/[\n,]/).map((s) => s.trim()).filter(Boolean);

/** Update a solution. Supports a published toggle + field edits. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCentralAdmin();
  if (!actor) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const b = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof b.published === "boolean") data.published = b.published;
  if (b.title !== undefined) data.title = String(b.title).trim();
  if (b.summary !== undefined) data.summary = String(b.summary).trim();
  if (b.description !== undefined) data.description = String(b.description).trim();
  if (b.price !== undefined) data.price = Number.isFinite(+b.price) ? Math.round(+b.price * 100) : 0;
  if (b.category !== undefined) data.category = b.category;
  if (b.licenseModel !== undefined) data.licenseModel = b.licenseModel;
  if (b.region !== undefined) data.region = b.region;
  if (b.vendorName !== undefined) data.vendorName = b.vendorName || null;
  if (b.url !== undefined) data.url = String(b.url).trim() || null;
  if (b.tags !== undefined) data.tags = toArr(b.tags);
  if (b.techStack !== undefined) data.techStack = toArr(b.techStack);
  if (typeof b.whiteLabel === "boolean") data.whiteLabel = b.whiteLabel;
  if (b.partnerSharePercent !== undefined)
    data.partnerSharePercent = Math.min(100, Math.max(0, Math.round(+b.partnerSharePercent || 50)));
  if (b.imageUrl) data.images = [String(b.imageUrl)];

  const updated = await prisma.solution.update({ where: { id }, data });
  const detail = typeof b.published === "boolean" ? (b.published ? "published" : "unpublished") : "edited";
  await logAudit(actor, "solution.update", updated.title, detail);
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCentralAdmin();
  if (!actor) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const s = await prisma.solution.findUnique({ where: { id }, select: { title: true } });
  await prisma.solution.delete({ where: { id } });
  await logAudit(actor, "solution.delete", s?.title ?? id);
  return NextResponse.json({ success: true });
}