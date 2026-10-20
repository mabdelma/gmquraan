import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { SESSION_COOKIE, cookieOptions, createSession, requestMeta } from "./session";
import { isRequired, mustEnrolNow, type MfaSubject } from "./mfa";
import type { ApprovalLevel, GmRole } from "@app/core";

/**
 * What happens once identity is proven, whichever way it was proven.
 *
 * Shared by the password route, the magic link, the invitation and single
 * sign-on so the four cannot drift.
 *
 * It takes no Request on purpose. It used to, and built its redirect from
 * `req.url` — which behind the proxy resolved to localhost:3002 and stopped
 * every sign-in from arriving anywhere. Locations here are relative, so there
 * is no origin to get wrong. A second factor that applies on one path and not another is
 * the same as no second factor at all — the attacker simply uses the other
 * door.
 */
export async function completeAuthentication(
  memberId: string,
  method: "mailbox" | "magic-link" | "invite" | "sso"
): Promise<NextResponse> {
  const m = await prisma.teamMember.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      email: true,
      role: true,
      approvalLevel: true,
      grantedCapabilities: true,
      totpEnabled: true,
      totpSecret: true,
    },
  });
  if (!m) return new NextResponse(null, { status: 303, headers: { Location: "/" } });

  const subject: MfaSubject = {
    id: m.id,
    email: m.email,
    role: m.role as GmRole,
    approvalLevel: m.approvalLevel as ApprovalLevel,
    grantedCapabilities: m.grantedCapabilities,
    totpEnabled: m.totpEnabled,
    totpSecret: m.totpSecret,
  };

  const meta = await requestMeta();

  // Already enrolled: the password is not enough on its own.
  if (m.totpEnabled) {
    const raw = await createSession(memberId, method, { ...meta, stage: "PENDING_MFA" });
    const res = new NextResponse(null, { status: 303, headers: { Location: "/mfa" } });
    res.cookies.set(SESSION_COOKIE, raw, cookieOptions());
    return res;
  }

  // Required but not enrolled: they get in far enough to enrol and no further.
  // Locking them out entirely would strand exactly the accounts that most need
  // the factor, and there would be no way in to fix it.
  if (mustEnrolNow(subject)) {
    const raw = await createSession(memberId, method, { ...meta, stage: "PENDING_MFA" });
    const res = new NextResponse(null, { status: 303, headers: { Location: "/mfa/enrol" } });
    res.cookies.set(SESSION_COOKIE, raw, cookieOptions());
    return res;
  }

  // Not required. Signed in, with a nudge on the home page rather than a wall.
  const raw = await createSession(memberId, method, meta);
  const res = new NextResponse(null, {
    status: 303,
    headers: { Location: isRequired(subject) ? "/mfa/enrol" : "/home" },
  });
  res.cookies.set(SESSION_COOKIE, raw, cookieOptions());
  return res;
}
