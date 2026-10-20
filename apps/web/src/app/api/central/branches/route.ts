import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { readBranchBody, validateBranch } from "@/lib/central-branches";
import { logAudit } from "@/lib/audit";

/** Create a branch. */
export async function POST(req: Request) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const d = readBranchBody(await req.json().catch(() => ({})));
  const invalid = validateBranch(d);
  if (invalid) return NextResponse.json({ success: false, error: invalid }, { status: 400 });

  if (await prisma.branch.findUnique({ where: { slug: d.slug }, select: { id: true } })) {
    return NextResponse.json({ success: false, error: "A branch with that slug already exists" }, { status: 409 });
  }

  const last = await prisma.branch.findFirst({ orderBy: { position: "desc" }, select: { position: true } });
  await prisma.branch.create({ data: { ...d, position: d.position || (last ? last.position + 1 : 0) } });
  await logAudit(admin, "branch.create", d.slug, d.legalName);
  return NextResponse.json({ success: true });
}
