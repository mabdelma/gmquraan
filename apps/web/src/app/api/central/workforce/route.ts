import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { readPersonBody, validatePerson, toPrismaData } from "@/lib/central-people";
import { logAudit } from "@/lib/audit";

/** Add someone to the workforce shown on /cards. */
export async function POST(req: Request) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const d = readPersonBody(await req.json().catch(() => ({})));
  const invalid = validatePerson(d);
  if (invalid) return NextResponse.json({ success: false, error: invalid }, { status: 400 });

  if (await prisma.workforcePerson.findUnique({ where: { slug: d.slug }, select: { id: true } })) {
    return NextResponse.json({ success: false, error: "Someone with that slug already exists" }, { status: 409 });
  }

  const last = await prisma.workforcePerson.findFirst({ orderBy: { position: "desc" }, select: { position: true } });
  await prisma.workforcePerson.create({ data: { ...toPrismaData(d), position: d.position || (last ? last.position + 1 : 0) } });
  await logAudit(admin, "workforce.create", d.slug, d.name);
  return NextResponse.json({ success: true });
}
