import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

/**
 * This mailcow instance is shared with partner-one.example, partner-two.example and
 * partner-three.example, and the API key is instance-wide. The domain guards are the
 * only thing keeping the Unskinned console inside its own domain, so they are tested
 * directly against a stubbed mailcow.
 */

const OK = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as unknown as Response;
const STATUS = (status: number) =>
  ({ ok: false, status, json: async () => ({}) }) as unknown as Response;

/** Load mailcow.ts fresh with env applied — it reads env at module scope. */
async function load(routes: Record<string, unknown>, calls: string[] = []) {
  vi.resetModules();
  process.env.MAILCOW_API_URL = "https://mail.example.test/api/v1";
  process.env.MAILCOW_API_KEY = "test-key";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const path = String(url).replace("https://mail.example.test/api/v1", "");
      calls.push(`${init?.method || "GET"} ${path}`);
      const hit = routes[path];
      if (hit === undefined) return STATUS(404);
      if (hit instanceof Error) throw hit;
      return OK(hit);
    })
  );
  return import("../mailcow");
}

const APP_ALIAS = { id: 24, address: "@example.com", goto: "info@example.com", active: 1 };
const OTHER_ALIAS = { id: 99, address: "hello@partner-one.example", goto: "someone@partner-one.example", active: 1 };

afterEach(() => vi.unstubAllGlobals());

describe("alias domain guard", () => {
  it("deletes an alias that belongs to the Unskinned domain", async () => {
    const calls: string[] = [];
    const mc = await load({ "/get/alias/24": APP_ALIAS, "/delete/alias": [{ type: "success" }] }, calls);
    const r = await mc.deleteAlias(24);
    expect(r.ok).toBe(true);
    expect(calls).toContain("POST /delete/alias");
  });

  it("refuses to delete another domain's alias, and never calls delete", async () => {
    const calls: string[] = [];
    const mc = await load({ "/get/alias/99": OTHER_ALIAS, "/delete/alias": [{ type: "success" }] }, calls);
    const r = await mc.deleteAlias(99);
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/does not belong to example\.com/);
    // The important half: the destructive call must not have been made.
    expect(calls).not.toContain("POST /delete/alias");
  });

  it("applies the same guard when toggling an alias", async () => {
    const calls: string[] = [];
    const mc = await load({ "/get/alias/99": OTHER_ALIAS, "/edit/alias": [{ type: "success" }] }, calls);
    const r = await mc.setAliasActive(99, false);
    expect(r.ok).toBe(false);
    expect(calls).not.toContain("POST /edit/alias");
  });

  it("hides other domains from the alias list", async () => {
    const mc = await load({ "/get/alias/all": [APP_ALIAS, OTHER_ALIAS] });
    const r = await mc.listAliases();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.map((a) => a.address)).toEqual(["@example.com"]);
  });
});

describe("mailbox domain guard", () => {
  it("rejects mailbox operations outside the domain", async () => {
    const mc = await load({});
    await expect(mc.deleteMailbox("someone@partner-one.example")).rejects.toThrow(/Only @example\.com/);
    await expect(mc.setMailboxPassword("someone@partner-one.example", "x".repeat(12))).rejects.toThrow();
    await expect(mc.setMailboxActive("someone@partner-one.example", false)).rejects.toThrow();
  });
});

describe("failure reporting", () => {
  it("reports a rejected API key instead of an empty domain", async () => {
    vi.resetModules();
    process.env.MAILCOW_API_URL = "https://mail.example.test/api/v1";
    process.env.MAILCOW_API_KEY = "bad";
    vi.stubGlobal("fetch", vi.fn(async () => STATUS(401)));
    const mc = await import("../mailcow");
    const r = await mc.listMailboxes();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/rejected the API key/);
  });

  it("reports an unreachable server instead of throwing", async () => {
    const mc = await load({ "/get/mailbox/all/example.com": new Error("ECONNREFUSED") });
    const r = await mc.listMailboxes();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Could not reach the mail server/);
  });

  it("reports a timeout distinctly", async () => {
    vi.resetModules();
    process.env.MAILCOW_API_URL = "https://mail.example.test/api/v1";
    process.env.MAILCOW_API_KEY = "k";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const e = new Error("timed out");
        e.name = "TimeoutError";
        throw e;
      })
    );
    const mc = await import("../mailcow");
    const r = await mc.listAliases();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/did not respond within 12s/);
  });

  it("is disabled, not crashing, when unconfigured", async () => {
    vi.resetModules();
    delete process.env.MAILCOW_API_URL;
    delete process.env.MAILCOW_API_KEY;
    const mc = await import("../mailcow");
    expect(mc.mailcowEnabled()).toBe(false);
    const r = await mc.listMailboxes();
    expect(r.ok).toBe(false);
  });
});

describe("unit conversion", () => {
  it("converts mailcow byte counts to MB", async () => {
    const mc = await load({
      "/get/mailbox/all/example.com": [
        { username: "a@example.com", name: "A", active: 1, quota: 3221225472, quota_used: 363594302, messages: 772, last_imap_login: "0" },
      ],
    });
    const r = await mc.listMailboxes();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data[0].quotaMb).toBe(3072); // 3 GB
      expect(r.data[0].usedMb).toBe(347);
      expect(r.data[0].lastLogin).toBeNull(); // "0" means never
    }
  });

  it("maps the domain status fields the panel renders", async () => {
    const mc = await load({
      "/get/domain/example.com": {
        domain_name: "example.com",
        active: 1,
        mboxes_in_domain: 15,
        mboxes_left: 35,
        aliases_in_domain: 1,
        aliases_left: 399,
        quota_used_in_domain: "41875931136",
        max_quota_for_domain: 53687091200,
        bytes_total: "363594302",
        msgs_total: "772",
      },
    });
    const r = await mc.getDomainStatus();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.mailboxes).toBe(15);
      expect(r.data.mailboxesLeft).toBe(35);
      expect(r.data.allocatedMb).toBe(39936); // 39 GB allocated
      expect(r.data.capacityMb).toBe(51200); // 50 GB ceiling
      expect(r.data.storedMb).toBe(347);
    }
  });
});
