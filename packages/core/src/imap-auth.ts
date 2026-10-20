/**
 * Mailbox credential verification.
 *
 * Members sign in to the portal with the same password they use for their
 * email. This opens a TLS connection to Dovecot, attempts a LOGIN, and reports
 * whether it was accepted. The password is used for that one exchange and never
 * written anywhere — not to the database, not to a log, not to an error string.
 *
 * Written against the socket directly rather than pulling in an IMAP client:
 * the entire requirement is "does this password bind", the exchange is four
 * lines of RFC 3501, and an IMAP library would bring a parser and a connection
 * pool we have no use for.
 */
import { connect as tlsConnect, type TLSSocket } from "node:tls";

export type ImapResult =
  | { ok: true }
  | { ok: false; reason: "credentials" | "unavailable"; detail?: string };

export type ImapOptions = {
  host: string;
  port?: number;
  /** Milliseconds for the whole exchange, including TLS. */
  timeoutMs?: number;
  /** Only ever disabled for a local test server. */
  rejectUnauthorized?: boolean;
};

/**
 * IMAP quoted-string escaping (RFC 3501 §4.3). A password containing a quote or
 * a backslash would otherwise break the command framing — which is both a bug
 * and, if the server were lenient, a way to smuggle a second command.
 */
function quote(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * A password containing CR or LF cannot be sent safely in a quoted string, and
 * no legitimate password has one. Refuse rather than sanitise: silently
 * altering a credential makes failures inexplicable.
 */
function unsendable(s: string): boolean {
  return /[\r\n\0]/.test(s);
}

export async function verifyMailboxPassword(
  email: string,
  password: string,
  opts: ImapOptions
): Promise<ImapResult> {
  if (!email || !password) return { ok: false, reason: "credentials" };
  if (unsendable(email) || unsendable(password)) return { ok: false, reason: "credentials" };

  const port = opts.port ?? 993;
  const timeoutMs = opts.timeoutMs ?? 8000;

  return new Promise<ImapResult>((resolve) => {
    let settled = false;
    const finish = (r: ImapResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        socket.destroy();
      } catch {
        /* already gone */
      }
      resolve(r);
    };

    const timer = setTimeout(
      () => finish({ ok: false, reason: "unavailable", detail: "timed out" }),
      timeoutMs
    );

    let socket: TLSSocket;
    try {
      socket = tlsConnect({
        host: opts.host,
        port,
        servername: opts.host,
        rejectUnauthorized: opts.rejectUnauthorized ?? true,
      });
    } catch (e) {
      finish({ ok: false, reason: "unavailable", detail: (e as Error).message });
      return;
    }

    let buffer = "";
    let sent = false;

    socket.setEncoding("utf8");
    socket.on("error", (e) => finish({ ok: false, reason: "unavailable", detail: e.message }));
    socket.on("close", () => finish({ ok: false, reason: "unavailable", detail: "connection closed" }));

    socket.on("data", (chunk: string) => {
      buffer += chunk;

      // Greeting: * OK … / * PREAUTH … / * BYE …
      if (!sent) {
        if (!buffer.includes("\r\n")) return;
        if (/^\* BYE/i.test(buffer)) {
          finish({ ok: false, reason: "unavailable", detail: "server refused the connection" });
          return;
        }
        if (!/^\* (OK|PREAUTH)/i.test(buffer)) {
          finish({ ok: false, reason: "unavailable", detail: "unexpected greeting" });
          return;
        }
        sent = true;
        buffer = "";
        socket.write(`a1 LOGIN ${quote(email)} ${quote(password)}\r\n`);
        return;
      }

      // Tagged response to our LOGIN.
      const line = buffer.split("\r\n").find((l) => l.startsWith("a1 "));
      if (!line) return;

      if (/^a1 OK/i.test(line)) {
        socket.write("a2 LOGOUT\r\n");
        finish({ ok: true });
      } else if (/^a1 (NO|BAD)/i.test(line)) {
        // Deliberately not surfacing the server's text: it distinguishes
        // "no such user" from "wrong password", which is an enumeration oracle.
        finish({ ok: false, reason: "credentials" });
      } else {
        finish({ ok: false, reason: "unavailable", detail: "unexpected response" });
      }
    });
  });
}

// ── Lockout ────────────────────────────────────────────────────────────────

/**
 * Failed-attempt policy. Deliberately generous for the first few tries — real
 * people mistype — then hard.
 */
export const LOCKOUT = {
  threshold: 5,
  /** Doubles for each failure past the threshold, to a ceiling. */
  baseMs: 60_000,
  maxMs: 30 * 60_000,
} as const;

export function lockoutUntil(failedLogins: number, now = Date.now()): Date | null {
  if (failedLogins < LOCKOUT.threshold) return null;
  const over = failedLogins - LOCKOUT.threshold;
  const wait = Math.min(LOCKOUT.baseMs * 2 ** over, LOCKOUT.maxMs);
  return new Date(now + wait);
}

export function isLockedOut(lockedUntil: Date | string | null | undefined, now = Date.now()): boolean {
  if (!lockedUntil) return false;
  return new Date(lockedUntil).getTime() > now;
}
