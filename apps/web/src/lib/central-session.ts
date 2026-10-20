import { createHmac, timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";

/**
 * Central (admin console) session — DELIBERATELY separate from the client
 * session. It lives in its own host-only cookie, so signing in as a client
 * elsewhere does NOT grant access to the central console; admins authenticate on
 * central directly. Mirrors the upstream platform's central-session structure.
 */

export const CENTRAL_COOKIE = "app_admin";
const TTL_MS = 12 * 3600_000; // 12 hours — admins re-auth daily
const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

function secret(): string {
  return process.env.AUTH_SECRET || "insecure-dev-secret";
}
const b64 = (b: Buffer) => b.toString("base64url");

export type CentralAdmin = { id: string; role: string; name: string | null; email: string };

export function signCentralSession(a: CentralAdmin): string {
  const payload = b64(Buffer.from(JSON.stringify({ ...a, exp: Date.now() + TTL_MS })));
  const sig = b64(createHmac("sha256", secret()).update(payload).digest());
  return `${payload}.${sig}`;
}

export function verifyCentralSession(token?: string | null): CentralAdmin | null {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const expected = b64(createHmac("sha256", secret()).update(payload).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const d = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!d.id || typeof d.exp !== "number" || d.exp < Date.now() || !ADMIN_ROLES.has(d.role)) return null;
    return { id: d.id, role: d.role, name: d.name ?? null, email: d.email };
  } catch {
    return null;
  }
}

/** Host-only cookie (no Domain) so it stays on the central host. */
export const centralCookieOptions = (maxAgeSec = Math.floor(TTL_MS / 1000)) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: maxAgeSec,
});

export async function isCentralHost(): Promise<boolean> {
  const h = await headers();
  return (h.get("host") || "").toLowerCase().startsWith("central.");
}

export async function getCentralAdmin(): Promise<CentralAdmin | null> {
  const c = await cookies();
  return verifyCentralSession(c.get(CENTRAL_COOKIE)?.value);
}
