import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@app/db";
import type { Role } from "@app/shared/types";

const VERIFY_TTL_MS = 48 * 3600_000;
const RESET_TTL_MS = 1 * 3600_000;

const VALID_ROLES: Role[] = ["CLIENT", "PARTNER", "VENDOR", "RESELLER"];

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
  role?: string;
  locale?: string;
  consent?: boolean;
}

export async function registerUser(input: RegisterInput) {
  const email = input.email?.trim().toLowerCase();
  if (!email || !input.password || input.password.length < 8) {
    throw new Error("Email and an 8+ character password are required");
  }
  if (!input.consent) throw new Error("You must accept the Privacy Policy and Terms");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("An account with this email already exists");

  const role = (VALID_ROLES.includes(input.role as Role) ? input.role : "CLIENT") as Role;
  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: input.name?.trim() || null,
      role,
      locale: input.locale || "en",
      consentAt: new Date(),
      onboarded: true,
    },
  });
  return user;
}

export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

// ── One-time tokens (email verify / password reset) ─────────────────────────

export type TokenType = "verify" | "reset";

export async function createToken(type: TokenType, userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const ttl = type === "verify" ? VERIFY_TTL_MS : RESET_TTL_MS;
  await prisma.authToken.deleteMany({ where: { userId, type } });
  await prisma.authToken.create({ data: { token, type, userId, expires: new Date(Date.now() + ttl) } });
  return token;
}

export async function consumeToken(token: string, type: TokenType): Promise<string | null> {
  if (!token) return null;
  const row = await prisma.authToken.findUnique({ where: { token } });
  if (!row || row.type !== type) return null;
  await prisma.authToken.delete({ where: { id: row.id } }).catch(() => {});
  if (row.expires < new Date()) return null;
  return row.userId;
}

export async function markVerified(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date() } });
}

export async function resetPassword(userId: string, newPassword: string) {
  if (!newPassword || newPassword.length < 8) throw new Error("Password must be 8+ characters");
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

/** Fire-and-forget email via the notifications service (no-op if not configured). */
export async function sendEmail(
  to: string,
  template: "verify" | "reset",
  locale: string | null | undefined,
  url: string
) {
  const base = process.env.NOTIFICATIONS_URL_INTERNAL;
  if (!base) {
    console.log(`[auth] email (${template}) for ${to}: ${url}`);
    return;
  }
  try {
    await fetch(`${base}/v1/notifications/email/send`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to, template, locale: locale || "en", vars: { url } }),
    });
  } catch (e) {
    console.error("[auth] notification send failed", e);
  }
}
