/**
 * Next.js instrumentation — `onRequestError` fires for every server-side error
 * (API routes, RSC, SSR). We forward it to the self-hosted error reporter, which
 * emails ops (throttled). No external monitoring service required.
 */
export async function onRequestError(
  err: unknown,
  request: { path?: string; method?: string },
  context: { routePath?: string; routerKind?: string }
): Promise<void> {
  try {
    const { reportError } = await import("@/lib/error-report");
    const e = err as { message?: string; stack?: string };
    reportError({
      message: e?.message || String(err),
      stack: e?.stack,
      url: request?.path || context?.routePath,
      source: `server${request?.method ? ` ${request.method}` : ""}`,
    });
  } catch {
    /* never throw from instrumentation */
  }
}
