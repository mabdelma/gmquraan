import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { isAdminRole, isValidRole, isValidPlan, isValidEmail } from "@/lib/central-users";
import { logAudit } from "@/lib/audit";

/** Create a user (central). Only SUPER_ADMIN may create ADMIN/SUPER_ADMIN accounts. */
export async function POST(req: Request) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const email = String(b.email || "").trim().toLowerCase();
  const name = b.name ? String(b.name).trim() : null;
  const password = String(b.password || "").trim();
  const role = String(b.role || "CLIENT");
  const plan = String(b.plan || "STARTER");

  if (!isValidEmail(email)) return NextResponse.json({ success: false, error: "Invalid email" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ success: false, error: "Password must be at least 8 characters" }, { status: 400 });
  if (!isValidRole(role)) return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
  if (!isValidPlan(plan)) return NextResponse.json({ success: false, error: "Invalid plan" }, { status: 400 });
  if (isAdminRole(role) && admin.role !== "SUPER_ADMIN") {
    return NextResponse.json({ success: false, error: "Only a super-admin can create admins" }, { status: 403 });
  }

  if (await prisma.user.findUnique({ where: { email } })) {
    return NextResponse.json({ success: false, error: "A user with that email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: role as never,
      plan: plan as never,
      onboarded: true,
      emailVerified: new Date(),
      consentAt: new Date(),
    },
  });
  await logAudit(admin, "user.create", email, `role=${role}, plan=${plan}`);
  return NextResponse.json({ success: true });
}
