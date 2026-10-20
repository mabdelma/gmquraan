import { NextResponse } from "next/server";
import { limited } from "@/lib/rate-limit";
import { reportError } from "@/lib/error-report";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Sink for client-side crash reports from the error boundaries (throttled). */
export async function POST(req: Request) {
  const tooMany = limited(req, "client-error", 10, 60_000);
  if (tooMany) return tooMany;
  const b = await req.json().catch(() => ({}));
  reportError({
    message: String(b.message || "client error").slice(0, 200),
    stack: b.stack ? String(b.stack).slice(0, 2000) : undefined,
    url: b.url ? String(b.url).slice(0, 300) : undefined,
    source: "client",
  });
  return NextResponse.json({ success: true });
}
