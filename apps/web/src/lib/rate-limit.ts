/**
 * Lightweight in-memory fixed-window rate limiter (per process). Good enough for
 * a single web instance; swap for a Redis store when scaling horizontally.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}

/** Best-effort client IP from proxy headers (Caddy sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/** Returns a 429 Response if over the limit, else null. */
export function limited(req: Request, name: string, limit = 10, windowMs = 60_000): Response | null {
  const ok = rateLimit(`${name}:${clientIp(req)}`, limit, windowMs);
  if (ok) return null;
  return new Response(JSON.stringify({ success: false, error: "Too many requests — please slow down." }), {
    status: 429,
    headers: { "content-type": "application/json", "retry-after": String(Math.ceil(windowMs / 1000)) },
  });
}

// Occasionally evict expired buckets to bound memory.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
  }, 5 * 60_000).unref?.();
}
