import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/push";
import { emit } from "@/lib/events";

const toArr = (v: unknown) =>
  String(v ?? "").split(/[\n,]/).map((s) => s.trim()).filter(Boolean);

/** Central full-edit of a solution (every field). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const b = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof b.published === "boolean") data.published = b.published;
  if (typeof b.featured === "boolean") data.featured = b.featured;
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

  if (Object.keys(data).length === 0)
    return NextResponse.json({ success: false, error: "Nothing to update" }, { status: 400 });

  const updated = await prisma.solution.update({ where: { id }, data });
  await logAudit(admin, "solution.update", updated.code || updated.title, "central edit");
  if (data.published === true) void emit("solution.published", { id: updated.id, slug: updated.slug });
  // When an admin publishes a solution, push the owning partner.
  if (data.published === true && updated.ownerId) {
    void notifyUser(updated.ownerId, {
      title: "Your solution is live ✅",
      body: `"${updated.title}" is now published on the marketplace.`,
      data: { type: "solution_published", slug: updated.slug, url: `/marketplace/${updated.slug}` },
    });
  }
  return NextResponse.json({ success: true, slug: updated.slug });
}
