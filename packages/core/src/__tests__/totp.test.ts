import { describe, expect, it, vi, afterEach } from "vitest";
import crypto from "crypto";
import {
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  mfaRequired,
  otpauthUri,
  verifyTotp,
} from "../index.js";

/** Recompute a valid code independently, so the test does not trust the code under test. */
function expectedCode(secretB32: string, atMs: number): string {
  const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const c of secretB32.toUpperCase().replace(/[^A-Z2-7]/g, "")) {
    value = (value << 5) | B32.indexOf(c);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  const counter = Math.floor(atMs / 30000);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = crypto.createHmac("sha1", Buffer.from(bytes)).update(buf).digest();
  const o = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[o] & 0x7f) << 24) | ((hmac[o + 1] & 0xff) << 16) | ((hmac[o + 2] & 0xff) << 8) | (hmac[o + 3] & 0xff);
  return (code % 1_000_000).toString().padStart(6, "0");
}

afterEach(() => vi.useRealTimers());

describe("secrets", () => {
  it("are base32 and long enough to matter", () => {
    const s = generateTotpSecret();
    expect(s).toMatch(/^[A-Z2-7]{32}$/);
  });

  it("differ every time", () => {
    const seen = new Set(Array.from({ length: 20 }, () => generateTotpSecret()));
    expect(seen.size).toBe(20);
  });
});

describe("verification", () => {
  const secret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";

  it("accepts the code for the current step", () => {
    const now = 1_800_000_000_000;
    vi.useFakeTimers();
    vi.setSystemTime(now);
    expect(verifyTotp(secret, expectedCode(secret, now))).toBe(true);
  });

  it("tolerates one step of clock drift in each direction", () => {
    const now = 1_800_000_000_000;
    vi.useFakeTimers();
    vi.setSystemTime(now);
    expect(verifyTotp(secret, expectedCode(secret, now - 30_000))).toBe(true);
    expect(verifyTotp(secret, expectedCode(secret, now + 30_000))).toBe(true);
  });

  it("refuses a code two steps out", () => {
    const now = 1_800_000_000_000;
    vi.useFakeTimers();
    vi.setSystemTime(now);
    expect(verifyTotp(secret, expectedCode(secret, now - 120_000))).toBe(false);
  });

  it("refuses anything that is not six digits", () => {
    for (const bad of ["", "12345", "1234567", "abcdef", "12 345", "  "]) {
      expect(verifyTotp(secret, bad), JSON.stringify(bad)).toBe(false);
    }
  });

  it("refuses when there is no secret", () => {
    expect(verifyTotp("", "123456")).toBe(false);
  });

  it("refuses a code from a different secret", () => {
    const now = 1_800_000_000_000;
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const other = generateTotpSecret();
    expect(verifyTotp(secret, expectedCode(other, now))).toBe(false);
  });
});

describe("otpauth URI", () => {
  it("carries the secret, issuer and parameters an authenticator needs", () => {
    const uri = otpauthUri("ABC234", "someone@example.com");
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain("secret=ABC234");
    expect(uri).toContain("issuer=Unskinned");
    expect(uri).toContain("digits=6");
    expect(uri).toContain("period=30");
  });

  it("escapes the label so an address cannot break the URI", () => {
    expect(otpauthUri("ABC", "a b/c@x.com")).not.toContain(" ");
  });
});

describe("who must hold a second factor", () => {
  const base = { approvalLevel: "A0" as const, role: "EMPLOYEE" as const };

  it("requires it of anybody who can approve", () => {
    expect(mfaRequired({ ...base, approvalLevel: "A2" })).toBe(true);
    expect(mfaRequired({ ...base, approvalLevel: "A3" })).toBe(true);
    expect(mfaRequired({ ...base, approvalLevel: "A4" })).toBe(true);
  });

  it("requires it of group-wide roles", () => {
    expect(mfaRequired({ ...base, role: "CEO" })).toBe(true);
    expect(mfaRequired({ ...base, role: "DOC_CONTROLLER" })).toBe(true);
  });

  it("requires it of anybody holding an elevated capability", () => {
    // The elevation is exactly the thing worth a second factor.
    expect(mfaRequired({ ...base, grantedCapabilities: { operations: ["administer"] } })).toBe(true);
  });

  it("does not block an ordinary employee", () => {
    // Six people have never signed in. Demanding enrolment of everybody on day
    // one would stop them getting in at all.
    expect(mfaRequired(base)).toBe(false);
  });
});

describe("recovery codes", () => {
  it("issues distinct, readable codes", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
    for (const c of codes) expect(c).toMatch(/^[0-9A-F]{5}-[0-9A-F]{5}$/);
  });

  it("hashes so a database dump does not hand over a bypass", () => {
    const [code] = generateRecoveryCodes(1);
    const h = hashRecoveryCode(code);
    expect(h).toMatch(/^[a-f0-9]{64}$/);
    expect(h).not.toContain(code);
  });

  it("hashes the same code the same way regardless of formatting", () => {
    // Somebody will type it without the dash, or in lower case.
    const [code] = generateRecoveryCodes(1);
    expect(hashRecoveryCode(code.replace("-", ""))).toBe(hashRecoveryCode(code));
    expect(hashRecoveryCode(code.toLowerCase())).toBe(hashRecoveryCode(code));
  });
});
