import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { readVacancyBody, validateVacancy } from "@/lib/central-vacancies";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false }, { status: 403 });
  const vacancies = await prisma.vacancy.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json({ success: true, vacancies });
}

export async function POST(req: Request) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const input = readVacancyBody(b);
  const error = validateVacancy(input);
  if (error) return NextResponse.json({ success: false, error }, { status: 400 });

  let slug = input.slug;
  if (await prisma.vacancy.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

  const vacancy = await prisma.vacancy.create({
    data: { ...input, slug, publishedAt: input.published ? new Date() : null },
  });
  await logAudit(admin, "vacancy.create", vacancy.slug);
  return NextResponse.json({ success: true, vacancy });
}
