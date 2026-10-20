import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { readProjectBody, validateProject } from "@/lib/central-projects";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false }, { status: 403 });
  const projects = await prisma.project.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json({ success: true, projects });
}

export async function POST(req: Request) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const input = readProjectBody(b);
  const error = validateProject(input);
  if (error) return NextResponse.json({ success: false, error }, { status: 400 });

  let slug = input.slug;
  if (await prisma.project.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

  const project = await prisma.project.create({
    data: { ...input, slug, publishedAt: input.published ? new Date() : null },
  });
  await logAudit(admin, "project.create", project.slug);
  return NextResponse.json({ success: true, project });
}
