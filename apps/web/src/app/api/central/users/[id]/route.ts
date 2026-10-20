import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { isAdminRole, isValidRole, isValidPlan } from "@/lib/central-users";
import { logAudit } from "@/lib/audit";

async function isLastSuperAdmin(id: string) {
  const supers = await prisma.user.findMany({ where: { role: "SUPER_ADMIN" }, select: { id: true } });
  return supers.length <= 1 && supers.some((u) => u.id === id);
}

/** Edit a user: name, role, plan, optional password reset. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

  const b = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  // Touching an admin, or granting/removing admin, requires super-admin.
  const touchesAdmin = isAdminRole(target.role) || (b.role && isAdminRole(String(b.role)));
  if (touchesAdmin && admin.role !== "SUPER_ADMIN") {
    return NextResponse.json({ success: false, error: "Only a super-admin can manage admins" }, { status: 403 });
  }

  if (b.name !== undefined) data.name = b.name ? String(b.name).trim() : null;

  if (b.role !== undefined) {
    const role = String(b.role);
    if (!isValidRole(role)) return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
    // Don't demote the last super-admin.
    if (target.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN" && (await isLastSuperAdmin(id))) {
      return NextResponse.json({ success: false, error: "Cannot demote the last super-admin" }, { status: 400 });
    }
    data.role = role;
  }

  if (b.plan !== undefined) {
    const plan = String(b.plan);
    if (!isValidPlan(plan)) return NextResponse.json({ success: false, error: "Invalid plan" }, { status: 400 });
    data.plan = plan;
  }

  if (b.password) {
    const pw = String(b.password).trim();
    if (pw.length < 8) return NextResponse.json({ success: false, error: "Password must be at least 8 characters" }, { status: 400 });
    data.passwordHash = await bcrypt.hash(pw, 10);
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ success: false, error: "Nothing to update" }, { status: 400 });

  await prisma.user.update({ where: { id }, data: data as never });
  const changed = Object.keys(data).map((k) => (k === "passwordHash" ? "password" : k));
  await logAudit(admin, "user.update", target.email, `changed: ${changed.join(", ")}`);
  return NextResponse.json({ success: true });
}

/** Remove a user. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  if (id === admin.id) return NextResponse.json({ success: false, error: "You cannot delete your own account" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

  if (isAdminRole(target.role) && admin.role !== "SUPER_ADMIN") {
    return NextResponse.json({ success: false, error: "Only a super-admin can delete admins" }, { status: 403 });
  }
  if (target.role === "SUPER_ADMIN" && (await isLastSuperAdmin(id))) {
    return NextResponse.json({ success: false, error: "Cannot delete the last super-admin" }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id } });
  } catch {
    return NextResponse.json(
      { success: false, error: "This user still owns records (solutions, leads…). Reassign or remove those first." },
      { status: 409 }
    );
  }
  await logAudit(admin, "user.delete", target.email, `role=${target.role}`);
  return NextResponse.json({ success: true });
}
