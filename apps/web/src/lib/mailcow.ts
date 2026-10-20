/**
 * Thin client for the mailcow API, scoped to the console's own domains.
 *
 * IMPORTANT: this mailcow instance is shared — it also hosts partner-one.example,
 * partner-two.example and partner-three.example. The API key is instance-wide, so every
 * mutation here must prove its target belongs to one of MAIL_DOMAINS before
 * calling out. Aliases are the sharp edge: mailcow addresses them by numeric
 * id, which carries no domain, so `deleteAlias` resolves the id first.
 *
 * Reads return a result object rather than throwing or silently returning an
 * empty array — an unreachable mail server must look different from a domain
 * with no mailboxes.
 */
const BASE = process.env.MAILCOW_API_URL || ""; // e.g. https://mail.gmquran.com/api/v1
const KEY = process.env.MAILCOW_API_KEY || "";
/** Comma-separated, e.g. MAIL_DOMAINS=gmquran.com,gmquran.com */
export const MAIL_DOMAINS = (process.env.MAIL_DOMAINS || "gmquran.com")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);
/** Back-compat alias: the first managed domain. */
export const MAIL_DOMAIN = MAIL_DOMAINS[0];

export const mailcowEnabled = () => Boolean(BASE && KEY);

export type Ok<T> = { ok: true; data: T };
export type Err = { ok: false; error: string };
export type Result<T> = Ok<T> | Err;

const MB = 1048576;

const managed = (email: string) =>
  MAIL_DOMAINS.some((d) => email.toLowerCase().endsWith("@" + d));

function guard(email: string) {
  if (!managed(email)) {
    throw new Error(`Only @${MAIL_DOMAINS.join(" or @")} mailboxes can be managed here`);
  }
}

/** Fetch that turns transport failures into a value instead of an exception. */
async function mc(path: string, init?: RequestInit): Promise<Result<Response>> {
  if (!mailcowEnabled()) return { ok: false, error: "Mail API is not configured" };
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "X-API-Key": KEY, "Content-Type": "application/json", ...(init?.headers || {}) },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    return { ok: true, data: res };
  } catch (e) {
    const err = e as Error;
    const reason =
      err.name === "TimeoutError" || err.name === "AbortError"
        ? "Mail server did not respond within 12s"
        : `Could not reach the mail server (${err.message})`;
    return { ok: false, error: reason };
  }
}

/** GET a JSON body, or a human-readable reason why not. */
async function getJson<T>(path: string): Promise<Result<T>> {
  const r = await mc(path);
  if (!r.ok) return r;
  const res = r.data;
  if (!res.ok) {
    return {
      ok: false,
      error:
        res.status === 401 || res.status === 403
          ? "Mail server rejected the API key (401/403) — check MAILCOW_API_KEY and its IP allow-list"
          : `Mail server returned HTTP ${res.status}`,
    };
  }
  try {
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, error: "Mail server returned a malformed response" };
  }
}

/** mailcow returns [{type:"success"|"danger", msg:[...]}] for mutations. */
async function result(r: Result<Response>): Promise<{ ok: boolean; message: string }> {
  if (!r.ok) return { ok: false, message: r.error };
  let body: unknown;
  try {
    body = await r.data.json();
  } catch {
    return { ok: false, message: `HTTP ${r.data.status}` };
  }
  const arr = (Array.isArray(body) ? body : [body]) as { type?: string; msg?: unknown }[];
  const danger = arr.find((x) => x && (x.type === "danger" || x.type === "error"));
  if (danger) {
    const m = Array.isArray(danger.msg) ? danger.msg.join(" ") : String(danger.msg);
    return { ok: false, message: m };
  }
  return { ok: true, message: "ok" };
}

// ──────────────────────────────── mailboxes ───────────────────────────────────

export type MailboxRow = {
  email: string;
  name: string;
  active: boolean;
  /** 0 means unlimited in mailcow. */
  quotaMb: number;
  usedMb: number;
  messages: number;
  lastLogin: string | null;
};

export async function listMailboxes(): Promise<Result<MailboxRow[]>> {
  const per = await Promise.all(
    MAIL_DOMAINS.map((d) => getJson<Record<string, unknown>[]>(`/get/mailbox/all/${d}`))
  );
  const failed = per.find((r) => !r.ok);
  if (failed) return failed;
  const seen = new Set<string>();
  const rows: MailboxRow[] = [];
  for (const r of per) {
    if (!r.ok) continue;
    if (!Array.isArray(r.data)) return { ok: false, error: "Mail server returned an unexpected mailbox list" };
    for (const m of r.data) {
      const email = String(m.username);
      if (seen.has(email)) continue;
      seen.add(email);
      const last =
        (m.last_imap_login && String(m.last_imap_login)) || (m.last_pop3_login && String(m.last_pop3_login)) || "0";
      rows.push({
        email,
        name: String(m.name || ""),
        active: m.active === 1 || m.active === "1" || m.active === true,
        quotaMb: Math.round(Number(m.quota || 0) / MB),
        usedMb: Math.round(Number(m.quota_used || 0) / MB),
        messages: Number(m.messages || 0),
        lastLogin: last && last !== "0" ? new Date(Number(last) * 1000).toISOString() : null,
      });
    }
  }
  return { ok: true, data: rows };
}

export async function createMailbox(input: { localPart: string; name: string; password: string; quotaMb: number; domain?: string }) {
  const local = input.localPart.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
  if (!local) return { ok: false, message: "Invalid local part" };
  const domain = (input.domain || MAIL_DOMAIN).toLowerCase();
  if (!MAIL_DOMAINS.includes(domain)) return { ok: false, message: `Domain @${domain} is not managed here` };
  return result(
    await mc(`/add/mailbox`, {
      method: "POST",
      body: JSON.stringify({
        local_part: local,
        domain,
        name: input.name || local,
        password: input.password,
        password2: input.password,
        quota: input.quotaMb || 2048,
        active: "1",
      }),
    })
  );
}

export async function setMailboxPassword(email: string, password: string) {
  guard(email);
  return result(
    await mc(`/edit/mailbox`, {
      method: "POST",
      body: JSON.stringify({ items: [email], attr: { password, password2: password } }),
    })
  );
}

/** Edit a mailbox's display name and/or quota (MB). */
export async function editMailbox(email: string, input: { name?: string; quotaMb?: number }) {
  guard(email);
  const attr: Record<string, string> = {};
  if (input.name !== undefined) attr.name = input.name;
  if (input.quotaMb !== undefined) attr.quota = String(Math.max(64, Math.round(input.quotaMb)));
  return result(await mc(`/edit/mailbox`, { method: "POST", body: JSON.stringify({ items: [email], attr }) }));
}

export async function setMailboxActive(email: string, active: boolean) {
  guard(email);
  return result(
    await mc(`/edit/mailbox`, {
      method: "POST",
      body: JSON.stringify({ items: [email], attr: { active: active ? "1" : "0" } }),
    })
  );
}

export async function deleteMailbox(email: string) {
  guard(email);
  return result(await mc(`/delete/mailbox`, { method: "POST", body: JSON.stringify([email]) }));
}

// ───────────────────────────────── aliases ────────────────────────────────────

export type AliasRow = { id: number; address: string; goto: string; active: boolean };

const mapAlias = (a: Record<string, unknown>): AliasRow => ({
  id: Number(a.id),
  address: String(a.address),
  goto: String(a.goto),
  active: a.active === 1 || a.active === "1" || a.active === true,
});

const belongsToDomain = (address: string) => managed(address);

export async function listAliases(): Promise<Result<AliasRow[]>> {
  const r = await getJson<Record<string, unknown>[]>(`/get/alias/all`);
  if (!r.ok) return r;
  if (!Array.isArray(r.data)) return { ok: false, error: "Mail server returned an unexpected alias list" };
  return { ok: true, data: r.data.filter((a) => belongsToDomain(String(a.address || ""))).map(mapAlias) };
}

export async function createAlias(input: { address: string; goto: string }) {
  const address = input.address.trim().toLowerCase();
  // A catch-all is "@domain"; give guard() a local part so the check still holds.
  guard(address.startsWith("@") ? "catchall" + address : address);
  if (!input.goto.trim()) return { ok: false, message: "Destination (goto) required" };
  return result(
    await mc(`/add/alias`, {
      method: "POST",
      body: JSON.stringify({ address, goto: input.goto.trim(), active: "1" }),
    })
  );
}

/**
 * Resolve an alias id to its record, refusing ids outside MAIL_DOMAIN.
 * mailcow ids are instance-wide, so this is what stops the console from
 * touching the other domains hosted on the same server.
 */
async function ownedAlias(id: number): Promise<Result<AliasRow>> {
  const r = await getJson<Record<string, unknown> | Record<string, unknown>[]>(`/get/alias/${id}`);
  if (!r.ok) return r;
  const raw = Array.isArray(r.data) ? r.data[0] : r.data;
  if (!raw || raw.address === undefined) return { ok: false, error: "Alias not found" };
  const alias = mapAlias(raw);
  if (!belongsToDomain(alias.address)) {
    return { ok: false, error: `Alias ${alias.address} does not belong to ${MAIL_DOMAINS.join(" or ")}` };
  }
  return { ok: true, data: alias };
}

export async function setAliasActive(id: number, active: boolean) {
  const owned = await ownedAlias(id);
  if (!owned.ok) return { ok: false, message: owned.error };
  return result(
    await mc(`/edit/alias`, {
      method: "POST",
      body: JSON.stringify({ items: [id], attr: { active: active ? "1" : "0" } }),
    })
  );
}

export async function deleteAlias(id: number) {
  const owned = await ownedAlias(id);
  if (!owned.ok) return { ok: false, message: owned.error };
  return result(await mc(`/delete/alias`, { method: "POST", body: JSON.stringify([id]) }));
}

// ──────────────────────────────── domain status ───────────────────────────────

export type DomainStatus = {
  domain: string;
  active: boolean;
  mailboxes: number;
  mailboxesLeft: number;
  aliases: number;
  aliasesLeft: number;
  /** Quota handed out across mailboxes, and the domain ceiling. */
  allocatedMb: number;
  capacityMb: number;
  /** What is actually on disk. */
  storedMb: number;
  messages: number;
};

export async function getDomainStatus(): Promise<Result<DomainStatus>> {
  const per = await Promise.all(
    MAIL_DOMAINS.map((d) => getJson<Record<string, unknown> | Record<string, unknown>[]>(`/get/domain/${d}`))
  );
  const failed = per.find((r) => !r.ok);
  if (failed) return failed;
  const agg: DomainStatus = {
    domain: MAIL_DOMAINS.join(", "),
    active: true,
    mailboxes: 0,
    mailboxesLeft: 0,
    aliases: 0,
    aliasesLeft: 0,
    allocatedMb: 0,
    capacityMb: 0,
    storedMb: 0,
    messages: 0,
  };
  for (const r of per) {
    if (!r.ok) continue;
    const d = Array.isArray(r.data) ? r.data[0] : r.data;
    if (!d || d.domain_name === undefined) return { ok: false, error: "Domain not found on the mail server" };
    agg.active = agg.active && (d.active === 1 || d.active === "1" || d.active === true);
    agg.mailboxes += Number(d.mboxes_in_domain || 0);
    agg.mailboxesLeft += Number(d.mboxes_left || 0);
    agg.aliases += Number(d.aliases_in_domain || 0);
    agg.aliasesLeft += Number(d.aliases_left || 0);
    agg.allocatedMb += Math.round(Number(d.quota_used_in_domain || 0) / MB);
    agg.capacityMb += Math.round(Number(d.max_quota_for_domain || 0) / MB);
    agg.storedMb += Math.round(Number(d.bytes_total || 0) / MB);
    agg.messages += Number(d.msgs_total || 0);
  }
  return { ok: true, data: agg };
}
