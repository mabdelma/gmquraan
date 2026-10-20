import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { readPersonBody, validatePerson, toPrismaData } from "@/lib/central-people";
import { logAudit } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const target = await prisma.workforcePerson.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  const d = readPersonBody(await req.json().catch(() => ({})));
  const invalid = validatePerson(d);
  if (invalid) return NextResponse.json({ success: false, error: invalid }, { status: 400 });

  if (d.slug !== target.slug) {
    const clash = await prisma.workforcePerson.findFirst({ where: { slug: d.slug, NOT: { id } }, select: { id: true } });
    if (clash) return NextResponse.json({ success: false, error: "That slug is taken" }, { status: 409 });
  }

  await prisma.workforcePerson.update({ where: { id }, data: toPrismaData(d) });
  await logAudit(admin, "workforce.update", d.slug, d.name);
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const target = await prisma.workforcePerson.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  await prisma.workforcePerson.delete({ where: { id } });
  await logAudit(admin, "workforce.delete", target.slug, target.name);
  return NextResponse.json({ success: true });
}
