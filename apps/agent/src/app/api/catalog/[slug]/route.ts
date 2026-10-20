import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** One solution by slug. Same reasoning as the list route. */
function base(): string {
  return process.env.CATALOG_URL_INTERNAL || "http://app-catalog:8080";
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  // Slugs are the catalogue's own identifiers; anything else is not a lookup.
  if (!/^[a-z0-9-]{1,120}$/i.test(slug)) {
    return NextResponse.json({ success: false, error: "Not a valid slug" }, { status: 400 });
  }

  try {
    const res = await fetch(`${base()}/v1/catalog/${encodeURIComponent(slug)}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (res.status === 404) {
      return NextResponse.json({ success: false, error: "Solution not found" }, { status: 404 });
    }
    if (!res.ok) {
      return NextResponse.json({ success: false, error: `Catalogue returned ${res.status}` }, { status: 502 });
    }
    return NextResponse.json(await res.json());
  } catch (e) {
    return NextResponse.json(
      { success: false, error: `Catalogue unreachable: ${(e as Error).message}` },
      { status: 503 }
    );
  }
}
