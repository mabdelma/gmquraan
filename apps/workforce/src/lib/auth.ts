import bcrypt from "bcryptjs";
import { prisma } from "@app/db";
import { isLockedOut, lockoutUntil, verifyMailboxPassword } from "@app/core";
import { createHash, randomBytes } from "crypto";

/**
 * Sign-in.
 *
 * Two routes, both landing on the same session: the member's real mailbox
 * password checked against Dovecot, or a one-time link mailed to that same
 * mailbox. Either way the thing being proven is "you control this mailbox",
 * which is what makes a portal-only password unnecessary for most people.
 */

export type LoginOutcome =
  | { ok: true; memberId: string; method: "mailbox" | "magic-link" }
  | { ok: false; message: string; retryAfter?: Date };

/** One message for every failure that could reveal whether an account exists. */
const GENERIC = "That email and password combination was not accepted.";

function imapHost(): string {
  return process.env.IMAP_HOST || "mail.example.com";
}

/**
 * Verify a password and open a session.
 *
 * Order of checks matters. Lockout is evaluated before the password so a
 * locked account cannot be used as an oracle, and an unreachable mail server
 * never counts as a failed attempt — otherwise an outage would lock out the
 * whole company by the time it was fixed.
 */
export async function loginWithPassword(emailRaw: string, password: string): Promise<LoginOutcome> {
  const email = emailRaw.trim().toLowerCase();
  const member = await prisma.teamMember.findUnique({ where: { email } });

  // Unknown address: spend roughly the same time as a real check would, and
  // say the same thing.
  if (!member || member.status !== "ACTIVE") {
    await bcrypt.hash(password || "x", 10);
    return { ok: false, message: GENERIC };
  }

  if (isLockedOut(member.lockedUntil)) {
    return {
      ok: false,
      message: "Too many attempts. Try again shortly, or use the email sign-in link.",
      retryAfter: member.lockedUntil!,
    };
  }

  // Someone who came in by magic link and set a portal password is checked
  // against that; everyone else is checked against their mailbox.
  let accepted = false;
  if (member.portalPasswordHash) {
    accepted = await bcrypt.compare(password, member.portalPasswordHash);
  } else {
    const r = await verifyMailboxPassword(email, password, { host: imapHost() });
    if (!r.ok && r.reason === "unavailable") {
      return {
        ok: false,
        message: "The mail server is not responding, so we cannot check your password right now. Use the email sign-in link, or try again in a few minutes.",
      };
    }
    accepted = r.ok;
  }

  if (!accepted) {
    const failed = member.failedLogins + 1;
    await prisma.teamMember.update({
      where: { id: member.id },
      data: { failedLogins: failed, lockedUntil: lockoutUntil(failed) },
    });
    return { ok: false, message: GENERIC };
  }

  await prisma.teamMember.update({
    where: { id: member.id },
    data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  return { ok: true, memberId: member.id, method: "mailbox" };
}

// ── Magic link ─────────────────────────────────────────────────────────────

const MAGIC_TTL_MS = 15 * 60_000;
const hash = (s: string) => createHash("sha256").update(s).digest("hex");

/**
 * Issue a sign-in link. Returns the raw token for the caller to mail, or null
 * when there is nobody to mail it to — the caller reports success either way,
 * so the form cannot be used to discover who works here.
 */
export async function issueMagicLink(emailRaw: string): Promise<{ token: string; email: string } | null> {
  const email = emailRaw.trim().toLowerCase();
  const member = await prisma.teamMember.findUnique({ where: { email } });
  if (!member || member.status !== "ACTIVE") return null;

  // One live link at a time: issuing a new one invalidates the old.
  await prisma.teamLoginToken.updateMany({
    where: { memberId: member.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const raw = randomBytes(32).toString("base64url");
  await prisma.teamLoginToken.create({
    data: {
      memberId: member.id,
      tokenHash: hash(raw),
      expiresAt: new Date(Date.now() + MAGIC_TTL_MS),
    },
  });
  return { token: raw, email };
}

/** Burn a sign-in link. Single use, and expired links stay dead. */
export async function consumeMagicLink(raw: string): Promise<LoginOutcome> {
  if (!raw) return { ok: false, message: "That sign-in link is not valid." };

  const row = await prisma.teamLoginToken.findUnique({
    where: { tokenHash: hash(raw) },
    include: { member: true },
  });
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    return { ok: false, message: "That sign-in link has expired or has already been used." };
  }
  if (row.member.status !== "ACTIVE") {
    return { ok: false, message: "That account is not active." };
  }

  await prisma.teamLoginToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  await prisma.teamMember.update({
    where: { id: row.member.id },
    // A successful link also clears a lockout: proving mailbox control is a
    // stronger signal than the failed password attempts that caused it.
    data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  return { ok: true, memberId: row.member.id, method: "magic-link" };
}

/** Set or clear a portal-only password. Empty string returns them to mailbox auth. */
export async function setPortalPassword(memberId: string, password: string): Promise<string | null> {
  if (!password) {
    await prisma.teamMember.update({ where: { id: memberId }, data: { portalPasswordHash: null } });
    return null;
  }
  if (password.length < 12) return "Choose a password of at least 12 characters.";
  await prisma.teamMember.update({
    where: { id: memberId },
    data: { portalPasswordHash: await bcrypt.hash(password, 12) },
  });
  return null;
}
