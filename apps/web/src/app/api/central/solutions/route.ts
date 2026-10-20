import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { logAudit } from "@/lib/audit";

const CATEGORIES = [
  "SAAS_PLATFORM", "LAUNCH_KIT", "AI_AUTOMATION",
  "PRODUCTIZED_SERVICE", "MARKETPLACE_SOLUTION", "MARKET_ENABLEMENT"
];

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
const toArr = (v: unknown) =>
  String(v ?? "").split(/[\n]/).map((s) => s.trim()).filter(Boolean);

/** Central creation of a solution. Admin-created listings publish immediately. */
export async function POST(req: Request) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const title = String(b.title || "").trim();
  if (!title) return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 });
  if (!CATEGORIES.includes(b.category)) {
    return NextResponse.json({ success: false, error: "Invalid category" }, { status: 400 });
  }

  const slug = slugify(b.slug || title);
  const exists = await prisma.solution.findUnique({ where: { slug } });
  if (exists) return NextResponse.json({ success: false, error: "A solution with this name exists" }, { status: 409 });

  const solution = await prisma.solution.create({
    data: {
      slug,
      title,
      summary: String(b.summary || "").trim(),
      description: String(b.description || "").trim(),
      price: Number.isFinite(+b.price) ? Math.round(+b.price * 100) : 0,
      currency: b.currency || "EUR",
      category: b.category,
      licenseModel: b.licenseModel || "SUBSCRIPTION",
      region: b.region || "GLOBAL",
      vendorName: b.vendorName || null,
      url: b.url ? String(b.url).trim() : null,
      whiteLabel: Boolean(b.whiteLabel),
      tags: toArr(b.tags),
      techStack: toArr(b.techStack),
      partnerSharePercent: Math.min(100, Math.max(0, Math.round(+b.partnerSharePercent || 50))),
      images: b.imageUrl ? [String(b.imageUrl)] : ["/logo.svg?v=2"],
      published: true,
      code: "APP-" + randomBytes(4).toString("hex").toUpperCase()
    }
  });
  await logAudit(admin, "solution.create", solution.code || solution.title, "central create");
  return NextResponse.json({ success: true, slug: solution.slug });
}
