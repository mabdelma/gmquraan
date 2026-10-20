import crypto from "crypto";

/**
 * RFC 6238 TOTP (SHA-1, 30-second step, six digits) with RFC 4648 base32.
 * Dependency-free.
 *
 * Moved here from the central console so the console and the portal share one
 * implementation. Two implementations of a second factor is two places for it
 * to be subtly wrong, and only one of them would get fixed.
 */

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const c of clean) {
    const idx = B32.indexOf(c);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** New random base32 secret (20 bytes → 32 characters). */
export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = crypto.createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 1_000_000).toString().padStart(6, "0");
}

/**
 * Constant-time compare for two six-digit strings.
 *
 * The original used `===`, which returns as soon as a character differs. With
 * only a million possibilities and a remote attacker, that leak is thin — but
 * it costs nothing to close, and "thin" is not an argument that survives
 * somebody removing the rate limit later.
 */
function sameCode(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  if (x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}

/**
 * Verify a six-digit token, allowing ±`window` 30-second steps for clock drift.
 *
 * Every candidate step is evaluated even after a match, so the time taken does
 * not reveal *which* step matched — which would narrow the client's clock
 * offset for an attacker watching.
 */
export function verifyTotp(secret: string, token: string, window = 1): boolean {
  const t = String(token || "").trim();
  if (!secret || !/^\d{6}$/.test(t)) return false;

  const key = base32Decode(secret);
  const counter = Math.floor(Date.now() / 30000);
  let ok = false;
  for (let i = -window; i <= window; i++) {
    if (sameCode(hotp(key, counter + i), t)) ok = true;
  }
  return ok;
}

/** otpauth:// URI for authenticator apps — manual key entry or a QR code. */
export function otpauthUri(secret: string, account: string, issuer = "Unskinned"): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: "6", period: "30" });
  return `otpauth://totp/${label}?${params.toString()}`;
}

// ── Policy ─────────────────────────────────────────────────────────────────

import { APPROVAL_LEVELS, type ApprovalLevel } from "./config.js";
import { isGroupWide, type Viewer } from "./access.js";

/**
 * Who must hold a second factor.
 *
 * §13 requires MFA enrolment. Requiring it of literally everybody on day one
 * would stop six people who have never signed in from getting in at all, so it
 * is scoped to the accounts where a compromise actually costs something:
 * anybody who can approve (A2 and above), anybody group-wide, and anybody
 * holding an elevated capability.
 *
 * Everyone else is offered it and encouraged; nobody is blocked by it.
 */
export function mfaRequired(m: {
  approvalLevel: ApprovalLevel;
  role: Viewer["role"];
  grantedCapabilities?: unknown;
}): boolean {
  if (isGroupWide(m.role)) return true;
  if (APPROVAL_LEVELS.indexOf(m.approvalLevel) >= APPROVAL_LEVELS.indexOf("A2")) return true;
  // An elevated capability is exactly the thing worth a second factor.
  return Boolean(m.grantedCapabilities);
}

/** Recovery codes, issued once at enrolment. */
export function generateRecoveryCodes(count = 8): string[] {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(5).toString("hex").toUpperCase().match(/.{1,5}/g)!.join("-")
  );
}

/** Recovery codes are stored hashed — a database dump must not hand over a bypass. */
export function hashRecoveryCode(code: string): string {
  return crypto.createHash("sha256").update(code.replace(/-/g, "").toUpperCase()).digest("hex");
}
