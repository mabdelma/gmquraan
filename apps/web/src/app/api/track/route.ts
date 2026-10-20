import { NextResponse } from "next/server";
import { prisma } from "@app/db";

/** Record a page view (privacy-friendly: path only, no PII, no cookies). */
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({}));
    let path = String(b.path || "").slice(0, 300);
    if (!path.startsWith("/")) return NextResponse.json({ ok: false }, { status: 400 });
    // Ignore internal/admin paths from analytics.
    if (path.startsWith("/api") || path.startsWith("/central") || path.startsWith("/admin")) {
      return NextResponse.json({ ok: true });
    }
    const referrer = b.referrer ? String(b.referrer).slice(0, 300) : null;
    const locale = b.locale ? String(b.locale).slice(0, 8) : null;
    await prisma.pageView.create({ data: { path, referrer, locale } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
