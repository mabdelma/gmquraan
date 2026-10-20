import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { readBranchBody, validateBranch } from "@/lib/central-branches";
import { logAudit } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const target = await prisma.branch.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ success: false, error: "Branch not found" }, { status: 404 });

  const d = readBranchBody(await req.json().catch(() => ({})));
  const invalid = validateBranch(d);
  if (invalid) return NextResponse.json({ success: false, error: invalid }, { status: 400 });

  if (d.slug !== target.slug) {
    const clash = await prisma.branch.findFirst({ where: { slug: d.slug, NOT: { id } }, select: { id: true } });
    if (clash) return NextResponse.json({ success: false, error: "That slug is taken" }, { status: 409 });
    // People reference branches by slug, so renaming one would orphan their address.
    const people = await prisma.workforcePerson.findMany({ select: { branchSlugs: true } });
    const inUse = people.some((p) => Array.isArray(p.branchSlugs) && (p.branchSlugs as string[]).includes(target.slug));
    if (inUse) {
      return NextResponse.json(
        { success: false, error: "Cannot change the slug while people are assigned to this branch" },
        { status: 409 }
      );
    }
  }

  await prisma.branch.update({ where: { id }, data: d });
  await logAudit(admin, "branch.update", d.slug, d.legalName);
  return NextResponse.json({ success: true });
}

/**
 * Remove a branch. Refused while anyone still lists it, since their card would
 * silently lose its contact address.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const target = await prisma.branch.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ success: false, error: "Branch not found" }, { status: 404 });

  const people = await prisma.workforcePerson.findMany({ select: { name: true, branchSlugs: true } });
  const users = people.filter(
    (p) => Array.isArray(p.branchSlugs) && (p.branchSlugs as string[]).includes(target.slug)
  );
  if (users.length) {
    const names = users.map((u) => u.name).join(", ");
    return NextResponse.json(
      { success: false, error: `Still used by ${users.length} person(s): ${names}. Reassign them first.` },
      { status: 409 }
    );
  }

  await prisma.branch.delete({ where: { id } });
  await logAudit(admin, "branch.delete", target.slug, target.legalName);
  return NextResponse.json({ success: true });
}
