import { PrismaClient } from "@prisma/client";
import { headers } from "next/headers";
import {
  isGeneratedSchemaName,
  slugFromHostname,
  tenantIsReachable,
  tenantWriteProblem,
} from "@app/core";

/**
 * Resolving which tenant a request belongs to (Wave 1.9).
 *
 * Isolation is a property of the connection: each tenant's data lives in its
 * own Postgres schema and the client carries the boundary. See
 * docs/architecture/001-tenant-isolation.md.
 *
 * Two rules run this file:
 *
 * 1. A schema name is only ever one this system generated, checked against
 *    `isGeneratedSchemaName` immediately before it reaches a connection string.
 *    A hostname is attacker-controlled; a schema name derived from one is the
 *    single way this isolation model leaks.
 *
 * 2. An unrecognised host resolves to the host tenant, not to an error and not
 *    to somebody else's schema. workforce.example.com is Grand
 *    Minds' own portal and must keep working exactly as it does today, which is
 *    also why nothing here changes behaviour until a tenant actually exists.
 */

const ROOT = process.env.TENANT_ROOT_DOMAIN || "example.com";

export type Resolved =
  | { kind: "host"; prisma: PrismaClient }
  | { kind: "tenant"; slug: string; schema: string; prisma: PrismaClient; readOnly: string | null };

/**
 * One client per schema, bounded.
 *
 * Each PrismaClient holds a connection pool, so an unbounded map is how a busy
 * instance exhausts `max_connections` and every tenant fails at once. The cap
 * is deliberately small and the eviction closes the client rather than dropping
 * the reference — an orphaned pool keeps its connections.
 */
const MAX_CLIENTS = Number(process.env.TENANT_CLIENT_CACHE || 25);
const clients = new Map<string, PrismaClient>();

function clientForSchema(schema: string): PrismaClient {
  // The gate. Nothing reaches a connection string without passing it.
  if (!isGeneratedSchemaName(schema)) {
    throw new Error(`Refusing to connect: "${schema}" is not a schema name this system generated.`);
  }

  const existing = clients.get(schema);
  if (existing) {
    // Refresh recency: delete and re-set moves it to the end of the Map order.
    clients.delete(schema);
    clients.set(schema, existing);
    return existing;
  }

  if (clients.size >= MAX_CLIENTS) {
    const oldest = clients.keys().next().value as string | undefined;
    if (oldest) {
      const evicted = clients.get(oldest);
      clients.delete(oldest);
      // Fire and forget: the pool must be released, but a slow disconnect must
      // not delay the request that triggered the eviction.
      void evicted?.$disconnect().catch(() => {});
    }
  }

  const base = process.env.DATABASE_URL ?? "";
  const url = new URL(base);
  url.searchParams.set("schema", schema);

  const client = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  clients.set(schema, client);
  return client;
}

/** The control-plane client, which knows who the tenants are and nothing else. */
let control: PrismaClient | null = null;
function controlClient(): PrismaClient | null {
  if (!process.env.CONTROL_DATABASE_URL) return null;
  control ??= new PrismaClient({
    datasources: { db: { url: process.env.CONTROL_DATABASE_URL } },
  });
  return control;
}

/**
 * Which tenant this request is for.
 *
 * Returns the host tenant when there is no tenant label, when the control plane
 * is not configured, or when the label matches no active tenant. It never
 * guesses: an unknown label is Unskinned' own portal, not a partial match
 * against somebody's schema.
 */
export async function resolveTenant(hostOverride?: string): Promise<Resolved> {
  const { prisma } = await import("@app/db");

  const host = hostOverride ?? (await headers()).get("host") ?? "";
  const slug = slugFromHostname(host, ROOT);
  if (!slug) return { kind: "host", prisma };

  const cp = controlClient();
  if (!cp) return { kind: "host", prisma };

  // Queried as parameterised SQL rather than through a model delegate.
  //
  // The control plane has its own Prisma schema and its own generated client;
  // this client is the tenant-datamodel one pointed at a different database, so
  // it has no `tenant` delegate and calling one throws. That threw silently
  // into the catch below and every tenant fell back to the host — the branch
  // looked correct and had never once run. Raw SQL is what this client can
  // honestly do against that database, and $queryRaw is parameterised, so the
  // slug is a bound value and not string-built SQL.
  const rows = await cp
    .$queryRaw<{ slug: string; schemaName: string; status: string }[]>`
      SELECT slug, "schemaName", status FROM "Tenant" WHERE slug = ${slug} LIMIT 1
    `
    .catch((e: unknown) => {
      // A control plane that is unreachable must not take the host portal down
      // with it, but it must be loud — falling back silently is what hid the
      // defect above.
      console.error("[tenant] control-plane lookup failed:", e instanceof Error ? e.message : e);
      return [] as { slug: string; schemaName: string; status: string }[];
    });

  const tenant = rows[0];
  if (!tenant || !tenantIsReachable({ status: tenant.status as never })) {
    return { kind: "host", prisma };
  }

  return {
    kind: "tenant",
    slug: tenant.slug,
    schema: tenant.schemaName,
    prisma: clientForSchema(tenant.schemaName),
    // Suspended and closing tenants stay readable. A customer who has not paid
    // still has records they may be legally required to produce.
    readOnly: tenantWriteProblem({ status: tenant.status as never }),
  };
}

/** Close every cached client. For shutdown and for tests. */
export async function closeTenantClients(): Promise<void> {
  await Promise.all([...clients.values()].map((c) => c.$disconnect().catch(() => {})));
  clients.clear();
}

/** Cache state, for the health endpoint. */
export const tenantCacheState = () => ({ size: clients.size, max: MAX_CLIENTS });
