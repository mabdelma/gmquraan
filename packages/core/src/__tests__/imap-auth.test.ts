import { describe, expect, it } from "vitest";
import { LOCKOUT, isLockedOut, lockoutUntil, verifyMailboxPassword } from "../imap-auth.js";

/**
 * These cover what verifyMailboxPassword itself decides: credential framing,
 * refusal to send unsafe input, and mapping a dead server to "unavailable"
 * rather than "wrong password". The TLS handshake and Dovecot's own responses
 * are exercised against the real server at deploy time, not mocked here.
 */

describe("lockout policy", () => {
  it("does not lock before the threshold", () => {
    expect(lockoutUntil(0)).toBeNull();
    expect(lockoutUntil(LOCKOUT.threshold - 1)).toBeNull();
  });

  it("locks at the threshold and backs off exponentially", () => {
    const now = 1_000_000;
    const first = lockoutUntil(LOCKOUT.threshold, now)!;
    expect(first.getTime() - now).toBe(LOCKOUT.baseMs);

    const second = lockoutUntil(LOCKOUT.threshold + 1, now)!;
    expect(second.getTime() - now).toBe(LOCKOUT.baseMs * 2);

    const third = lockoutUntil(LOCKOUT.threshold + 2, now)!;
    expect(third.getTime() - now).toBe(LOCKOUT.baseMs * 4);
  });

  it("stops doubling at the ceiling", () => {
    const now = 1_000_000;
    const far = lockoutUntil(LOCKOUT.threshold + 40, now)!;
    expect(far.getTime() - now).toBe(LOCKOUT.maxMs);
  });

  it("reports whether a lock is still in force", () => {
    expect(isLockedOut(null)).toBe(false);
    expect(isLockedOut(new Date(Date.now() + 60_000))).toBe(true);
    expect(isLockedOut(new Date(Date.now() - 60_000))).toBe(false);
  });
});

describe("credential rejection before any network call", () => {
  // Host is unroutable on purpose: if any of these reached the network the
  // test would hang rather than return instantly.
  const nowhere = { host: "192.0.2.1", port: 993, timeoutMs: 50 };

  it("refuses empty credentials", async () => {
    expect(await verifyMailboxPassword("", "x", nowhere)).toEqual({ ok: false, reason: "credentials" });
    expect(await verifyMailboxPassword("a@b.c", "", nowhere)).toEqual({ ok: false, reason: "credentials" });
  });

  it("refuses credentials carrying CRLF rather than sanitising them", async () => {
    // A newline in a password would break IMAP command framing. Sanitising
    // silently would mean the user's real password never gets tried.
    const r = await verifyMailboxPassword("a@b.c", "pass\r\na2 LOGIN evil evil", nowhere);
    expect(r).toEqual({ ok: false, reason: "credentials" });
  });
});

describe("unreachable server", () => {
  it("reports unavailable, not bad credentials", async () => {
    // The distinction matters: a member must not be told their password is
    // wrong, and must not be counted a failed attempt, when the mail server is
    // simply down.
    const r = await verifyMailboxPassword("a@b.c", "pw", { host: "192.0.2.1", port: 993, timeoutMs: 300 });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.reason).toBe("unavailable");
  });
});
