import { createHash, randomBytes } from "crypto";
import { prisma } from "@app/db";

export type ProductPrincipal = { id: string; name: string };

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Generate a new product API key (plaintext shown once) + its stored hash/prefix. */
export function generateProductKey() {
  const key = `app_prod_${randomBytes(24).toString("hex")}`;
  return { key, keyHash: sha256(key), prefix: key.slice(0, 17) };
}

/** Extract the bearer / X-API-Key value from a request. */
export function readKey(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return req.headers.get("x-api-key");
}

/** Authenticate an external product by its API key. Returns the product, or null. */
export async function authenticateProduct(req: Request): Promise<ProductPrincipal | null> {
  const key = readKey(req);
  if (!key) return null;
  const row = await prisma.productKey.findUnique({ where: { keyHash: sha256(key) } });
  if (!row || !row.active || row.revokedAt) return null;
  prisma.productKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return { id: row.id, name: row.name };
}

export function apiError(message: string, status = 400) {
  return Response.json({ ok: false, error: message }, { status });
}
