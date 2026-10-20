import { prisma } from "@app/db";
import {
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  mfaRequired,
  otpauthUri,
  verifyTotp,
  type ApprovalLevel,
  type GmRole,
} from "@app/core";

/**
 * The second factor.
 *
 * A session that has passed the password but not the second factor is recorded
 * as PENDING_MFA and authenticates nothing except the right to finish signing
 * in. Treating it as a real session until the code arrives would mean the
 * password alone opened the portal, which is what the second factor exists to
 * prevent.
 */

export type MfaSubject = {
  id: string;
  email: string;
  role: GmRole;
  approvalLevel: ApprovalLevel;
  grantedCapabilities?: unknown;
  totpEnabled: boolean;
  totpSecret: string | null;
};

export function isRequired(m: MfaSubject): boolean {
  return mfaRequired({ role: m.role, approvalLevel: m.approvalLevel, grantedCapabilities: m.grantedCapabilities });
}

/** Enrolment has to be completed before this account can be used at all. */
export function mustEnrolNow(m: MfaSubject): boolean {
  return isRequired(m) && !m.totpEnabled;
}

/** Begin enrolment: a secret is generated but not yet trusted. */
export async function beginEnrolment(memberId: string, email: string) {
  const secret = generateTotpSecret();
  // Written but not enabled. An enrolment abandoned halfway must not leave an
  // account that demands a code nobody can produce.
  await prisma.teamMember.update({
    where: { id: memberId },
    data: { totpSecret: secret, totpEnabled: false, totpConfirmedAt: null },
  });
  return { secret, uri: otpauthUri(secret, email) };
}

/**
 * Finish enrolment by proving the authenticator works.
 *
 * Only here does `totpEnabled` become true — a secret alone proves the server
 * generated something, not that anybody can read it.
 */
export async function confirmEnrolment(memberId: string, token: string) {
  const m = await prisma.teamMember.findUnique({
    where: { id: memberId },
    select: { totpSecret: true, email: true },
  });
  if (!m?.totpSecret) return { ok: false as const, error: "Start enrolment again — no secret is pending." };
  if (!verifyTotp(m.totpSecret, token)) {
    return { ok: false as const, error: "That code was not accepted. Check your device's clock and try the next one." };
  }

  const codes = generateRecoveryCodes();
  await prisma.teamMember.update({
    where: { id: memberId },
    data: {
      totpEnabled: true,
      totpConfirmedAt: new Date(),
      recoveryCodes: codes.map(hashRecoveryCode),
    },
  });
  // Returned once. They are not recoverable afterwards, which is the point.
  return { ok: true as const, recoveryCodes: codes };
}

/** Check a code, or burn a recovery code. Returns why it failed, or null. */
export async function checkSecondFactor(memberId: string, token: string): Promise<string | null> {
  const m = await prisma.teamMember.findUnique({
    where: { id: memberId },
    select: { totpSecret: true, totpEnabled: true, recoveryCodes: true },
  });
  if (!m?.totpEnabled || !m.totpSecret) return "Two-factor authentication is not set up on this account.";

  if (verifyTotp(m.totpSecret, token)) return null;

  // Recovery codes are single use, so a match removes it. Otherwise a stolen
  // list would work for ever.
  const held: string[] = Array.isArray(m.recoveryCodes) ? (m.recoveryCodes as string[]) : [];
  const offered = hashRecoveryCode(token);
  if (held.includes(offered)) {
    await prisma.teamMember.update({
      where: { id: memberId },
      data: { recoveryCodes: held.filter((h) => h !== offered) },
    });
    return null;
  }

  return "That code was not accepted.";
}

/** Promote a half-finished session once the second factor is presented. */
export async function completeSession(tokenHash: string) {
  await prisma.teamSession.updateMany({ where: { tokenHash }, data: { stage: "ACTIVE" } });
}
