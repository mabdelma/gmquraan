import { prisma } from "@app/db";

/**
 * Instant sync: ping every connected product's sync endpoint so it pulls the
 * latest reseller codes immediately (instead of waiting for its poll). Each
 * ProductKey stores the product's syncUrl + the secret its endpoint expects.
 * Best-effort and time-boxed — never throws, never blocks meaningfully.
 */
export async function notifyProductsResellerChange(): Promise<void> {
  try {
    const keys = await prisma.productKey.findMany({
      where: { active: true, revokedAt: null, NOT: { syncUrl: null } },
      select: { syncUrl: true, syncSecret: true },
    });
    await Promise.allSettled(
      keys.map((k) =>
        fetch(k.syncUrl as string, {
          method: "POST",
          headers: k.syncSecret ? { authorization: `Bearer ${k.syncSecret}` } : {},
          signal: AbortSignal.timeout(6000),
        }).catch(() => {})
      )
    );
  } catch {
    /* best-effort */
  }
}
