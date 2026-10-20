import { NextResponse } from "next/server";
import { prisma } from "@app/db";

export const dynamic = "force-dynamic";

/** Search the live published Unskinned catalog (keyword + optional category). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").toLowerCase().trim();
  const category = url.searchParams.get("category") || undefined;
  const terms = q.split(/\s+/).filter((t) => t.length > 2);

  const all = await prisma.solution.findMany({
    where: { published: true, ...(category ? { category: category as never } : {}) },
    orderBy: { createdAt: "desc" },
    take: 80,
    select: {
      slug: true, title: true, summary: true, category: true, region: true,
      price: true, currency: true, tags: true, whiteLabel: true, url: true,
    },
  });

  let results = all;
  if (terms.length) {
    results = all
      .map((s) => {
        const hay = `${s.title} ${s.summary} ${s.category} ${s.tags.join(" ")}`.toLowerCase();
        return { s, score: terms.reduce((a, t) => a + (hay.includes(t) ? 1 : 0), 0) };
      })
      .sort((a, b) => b.score - a.score)
      .filter((x) => x.score > 0)
      .map((x) => x.s);
    if (results.length === 0) results = all;
  }

  return NextResponse.json({ success: true, count: results.length, matches: results.slice(0, 8) });
}
