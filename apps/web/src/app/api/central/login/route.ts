import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@app/db";
import { limited } from "@/lib/rate-limit";
import { verifyTotp } from "@/lib/totp";
import { CENTRAL_COOKIE, centralCookieOptions, signCentralSession } from "@/lib/central-session";

const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

/** Authenticate an admin into the separate central console session. */
export async function POST(req: Request) {
  const tooMany = limited(req, "central-login", 8, 60_000);
  if (tooMany) return tooMany;

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").toLowerCase().trim();
  const password = String(body.password ?? "").trim();
  if (!email || !password) {
    return NextResponse.json({ success: false, error: "Email and password required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Same generic error whether email is unknown, password wrong, or not an admin.
  const generic = NextResponse.json(
    { success: false, error: "Invalid credentials or not an admin account" },
    { status: 401 }
  );
  if (!user || !user.passwordHash) return generic;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok || !ADMIN_ROLES.has(user.role)) return generic;

  // Second factor (if the admin enrolled TOTP). Password is already verified here.
  if (user.totpEnabled) {
    const code = String(body.code ?? "").trim();
    if (!code) {
      return NextResponse.json({ success: false, error: "Enter your 2FA code", need2fa: true }, { status: 401 });
    }
    if (!verifyTotp(user.totpSecret ?? "", code)) {
      return NextResponse.json({ success: false, error: "Invalid 2FA code", need2fa: true }, { status: 401 });
    }
  }

  const token = signCentralSession({ id: user.id, role: user.role, name: user.name ?? null, email: user.email });
  const res = NextResponse.json({ success: true });
  res.cookies.set(CENTRAL_COOKIE, token, centralCookieOptions());
  return res;
}
