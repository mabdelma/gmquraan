import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";
import { prisma } from "@app/db";
import { companyScopeFor, isGroupWide } from "@app/core";
import type { ApprovalLevel, Confidentiality, GmRole, Viewer } from "@app/core";

/**
 * Portal sessions.
 *
 * Deliberately database-backed rather than a signed cookie like the central
 * console uses. The console signs a short-lived claim and moves on; here an
 * administrator has to be able to end someone's access the moment they are
 * offboarded, and a self-contained token cannot be revoked. So the cookie
 * carries an opaque random string and the row is the authority.
 *
 * Only the SHA-256 of the token is stored, so a database dump does not hand
 * anyone a working session.
 */

export const SESSION_COOKIE = "app_workforce";
const TTL_MS = 12 * 3600_000; // a working day; re-auth each morning

export const hashToken = (raw: string) => createHash("sha256").update(raw).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");

export function cookieOptions(maxAgeSec = Math.floor(TTL_MS / 1000)) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}

export type PortalMember = {
  id: string;
  email: string;
  name: string;
  title: string | null;
  photo: string | null;
  locale: string | null;
  role: GmRole;
  approvalLevel: ApprovalLevel;
  clearance: Confidentiality;
  entityId: string | null;
  departmentId: string | null;
  managerId: string | null;
};

/** Create a session row and return the raw token for the cookie. */
export async function createSession(
  memberId: string,
  method: "mailbox" | "magic-link" | "invite" | "sso",
  meta: { ip?: string; userAgent?: string; stage?: "ACTIVE" | "PENDING_MFA" } = {}
): Promise<string> {
  const raw = newToken();
  await prisma.teamSession.create({
    data: {
      memberId,
      tokenHash: hashToken(raw),
      method,
      stage: meta.stage ?? "ACTIVE",
      ip: meta.ip ?? null,
      userAgent: meta.userAgent?.slice(0, 300) ?? null,
      expiresAt: new Date(Date.now() + TTL_MS),
    },
  });
  return raw;
}

export async function revokeSession(raw: string): Promise<void> {
  await prisma.teamSession.updateMany({
    where: { tokenHash: hashToken(raw), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Every session for a member — used on offboarding and on password change. */
export async function revokeAllSessions(memberId: string): Promise<void> {
  await prisma.teamSession.updateMany({
    where: { memberId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * The signed-in member, or null.
 *
 * Status is re-read on every request rather than trusted from the session, so
 * suspending someone takes effect on their next click instead of in twelve
 * hours.
 */
export async function getMember(): Promise<PortalMember | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const session = await prisma.teamSession.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: { member: true },
  });
  if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) return null;
  if (session.member.status !== "ACTIVE") return null;
  // A session that has passed the password but not the second factor is not a
  // session. Returning the member here would mean the password alone opened
  // the portal, which is the thing the second factor exists to prevent.
  if (session.stage !== "ACTIVE") return null;

  const m = session.member;
  return {
    id: m.id,
    email: m.email,
    name: m.name,
    title: m.title,
    photo: m.photo,
    locale: m.locale,
    role: m.role as GmRole,
    approvalLevel: m.approvalLevel as ApprovalLevel,
    clearance: m.clearance as Confidentiality,
    entityId: m.entityId,
    departmentId: m.departmentId,
    managerId: m.managerId,
  };
}

/**
 * The member as an access-control Viewer, with their reporting line resolved.
 *
 * Reports are transitive: a director sees their managers' teams too. The walk
 * is bounded by a depth limit so a cycle in the org chart — which is a data
 * error, not an impossibility — cannot hang a request.
 */
export async function toViewer(m: PortalMember): Promise<Viewer> {
  const reportIds: string[] = [];
  let frontier = [m.id];
  for (let depth = 0; depth < 8 && frontier.length; depth++) {
    const rows: { id: string }[] = await prisma.teamMember.findMany({
      where: { managerId: { in: frontier } },
      select: { id: true },
    });
    const next = rows.map((r) => r.id).filter((id) => id !== m.id && !reportIds.includes(id));
    reportIds.push(...next);
    frontier = next;
  }
  // The company scope axis. Group-wide roles reach across the group, so they
  // need the list of companies to reach across; everybody else is confined to
  // their own and the query is skipped.
  //
  // This is the only place a Viewer is built, and `withinCompanyScope` is
  // fail-closed, so forgetting it here means seeing nothing rather than
  // seeing everything.
  const codes = isGroupWide(m.role)
    ? (await prisma.company.findMany({ select: { code: true } })).map((c) => c.code)
    : [];

  return {
    id: m.id,
    role: m.role,
    approvalLevel: m.approvalLevel,
    clearance: m.clearance,
    entityId: m.entityId,
    departmentId: m.departmentId,
    reportIds,
    companyIds: companyScopeFor(m, codes),
  };
}

/** Client IP and user agent, for the session record. */
export async function requestMeta(): Promise<{ ip?: string; userAgent?: string }> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for") || "";
  return {
    ip: fwd.split(",")[0].trim() || undefined,
    userAgent: h.get("user-agent") || undefined,
  };
}

/** Constant-time compare for anything secret that is not a session token. */
export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * The member behind a half-finished session, for the second-factor challenge
 * only. Deliberately separate from getMember so no page can reach it by
 * accident — a caller has to ask for the pending state by name.
 */
export async function getPendingMember(): Promise<{ id: string; email: string; tokenHash: string } | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const hash = hashToken(raw);
  const session = await prisma.teamSession.findUnique({
    where: { tokenHash: hash },
    include: { member: { select: { id: true, email: true, status: true } } },
  });
  if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) return null;
  if (session.stage !== "PENDING_MFA") return null;
  if (session.member.status !== "ACTIVE") return null;

  return { id: session.member.id, email: session.member.email, tokenHash: hash };
}
