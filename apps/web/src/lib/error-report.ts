/**
 * Self-hosted error monitoring (no external service). Fire-and-forget: forwards
 * server/client errors to the ops-alert sink (/api/internal/monitor/alert) over
 * the internal loopback, which emails ops. Never blocks the caller, deduped so a
 * recurring error can't flood the inbox, and dependency-free (edge-safe).
 */
const seen = new Map<string, number>(); // dedupe key -> last-sent epoch ms
const WINDOW_MS = 10 * 60_000; // one alert per unique error per 10 minutes

export function reportError(info: { message: string; stack?: string; url?: string; source?: string }): void {
  try {
    const key = `${info.source || ""}:${(info.message || "").slice(0, 140)}`;
    const now = Date.now();
    const last = seen.get(key);
    if (last && now - last < WINDOW_MS) return; // throttle duplicates
    seen.set(key, now);
    if (seen.size > 500) seen.clear();

    const secret = process.env.MONITOR_SECRET;
    if (!secret) return; // no sink configured
    const base = process.env.SELF_URL || `http://localhost:${process.env.PORT || 3000}`;
    const message = [
      info.source ? `Source: ${info.source}` : null,
      info.url ? `URL: ${info.url}` : null,
      "",
      info.stack || info.message,
    ]
      .filter((l) => l !== null)
      .join("\n")
      .slice(0, 4000);

    // Fire-and-forget — do NOT await; the container process keeps it alive.
    void fetch(`${base}/api/internal/monitor/alert`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-monitor-secret": secret },
      body: JSON.stringify({ subject: `App error: ${info.message}`.slice(0, 180), message }),
      signal: AbortSignal.timeout(8000),
    }).catch(() => {});
  } catch {
    /* the reporter must never throw */
  }
}
