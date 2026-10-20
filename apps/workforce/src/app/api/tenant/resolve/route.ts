import { NextResponse } from "next/server";
import { resolveTenant, tenantCacheState } from "@/lib/tenant";
import { slugFromHostname } from "@app/core";

export const dynamic = "force-dynamic";

/**
 * What this request resolves to.
 *
 * Exists so tenant resolution can be proven without DNS: a `Host` header is all
 * resolution actually reads, so exercising it with one tests the entire path
 * bar the name lookup itself. That matters while the wildcard record is
 * missing — the code is either right or wrong today, independently of it.
 *
 * Deliberately says nothing a caller could not already work out from the
 * hostname they sent. No tenant names, no schema names, no list of who exists —
 * that would make this the cheapest customer-enumeration endpoint in the
 * product.
 */
export async function GET(req: Request) {
  const host = req.headers.get("host") ?? "";
  const resolved = await resolveTenant(host);

  return NextResponse.json(
    {
      host,
      // The label the hostname *claims*, before any lookup. Safe: it is the
      // caller's own input echoed back.
      label: slugFromHostname(host) ?? null,
      resolvesTo: resolved.kind,
      // Only ever about the tenant the caller already addressed.
      ...(resolved.kind === "tenant"
        ? { readOnly: Boolean(resolved.readOnly), reason: resolved.readOnly }
        : {}),
      clientCache: tenantCacheState(),
    },
    { headers: { "cache-control": "no-store" } }
  );
}
