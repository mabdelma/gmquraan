import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Catalogue search, proxied to the catalog service.
 *
 * The advisor's tools run in the browser, so they need a same-origin endpoint:
 * api.example.com sends no CORS headers, and adding them would
 * open the catalogue to every origin on the internet to solve a problem that a
 * proxy solves for one. This route also keeps the call on the internal Docker
 * network rather than going out to the public edge and back.
 *
 * Only the query parameters the catalogue understands are forwarded — an
 * open passthrough would let a crafted tool call reach parameters the advisor
 * has no business setting.
 */
const ALLOWED = ["q", "category", "licenseModel", "region", "whiteLabel", "minPrice", "maxPrice", "page", "sort"];

function base(): string {
  return process.env.CATALOG_URL_INTERNAL || "http://app-catalog:8080";
}

export async function GET(req: Request) {
  const incoming = new URL(req.url).searchParams;
  const qs = new URLSearchParams();
  for (const k of ALLOWED) {
    const v = incoming.get(k);
    if (v) qs.set(k, v.slice(0, 120));
  }

  try {
    const res = await fetch(`${base()}/v1/catalog?${qs.toString()}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ success: false, error: `Catalogue returned ${res.status}` }, { status: 502 });
    }
    return NextResponse.json(await res.json());
  } catch (e) {
    // Reported rather than swallowed: the tool needs to know the difference
    // between "no matches" and "the catalogue is down", because those are two
    // very different things for the advisor to say out loud.
    return NextResponse.json(
      { success: false, error: `Catalogue unreachable: ${(e as Error).message}` },
      { status: 503 }
    );
  }
}
