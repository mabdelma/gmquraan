import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "post";
}

export async function GET() {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false }, { status: 403 });
  const posts = await prisma.post.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json({ success: true, posts });
}

export async function POST(req: Request) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const title = String(b.title || "").trim();
  if (!title) return NextResponse.json({ success: false, error: "Title required" }, { status: 400 });

  let slug = b.slug ? slugify(String(b.slug)) : slugify(title);
  // Ensure unique slug.
  if (await prisma.post.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

  const published = Boolean(b.published);
  const post = await prisma.post.create({
    data: {
      slug,
      title,
      excerpt: b.excerpt ? String(b.excerpt).slice(0, 300) : null,
      body: String(b.body || ""),
      coverImage: b.coverImage ? String(b.coverImage) : null,
      published,
      publishedAt: published ? new Date() : null,
    },
  });
  await logAudit(admin, "post.create", post.slug);
  return NextResponse.json({ success: true, post });
}
