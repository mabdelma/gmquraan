import { NextResponse } from "next/server";
import { prisma } from "@app/db";

export const dynamic = "force-dynamic";

/** Fetch a single published solution by slug for the "show solution" tool. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await prisma.solution.findFirst({
    where: { slug, published: true },
    select: {
      slug: true, title: true, summary: true, description: true, category: true, region: true,
      price: true, currency: true, tags: true, techStack: true, whiteLabel: true, url: true,
      vendorName: true, images: true, licenseModel: true,
    },
  });
  if (!s) return NextResponse.json({ success: false, error: "not found" }, { status: 404 });
  return NextResponse.json({ success: true, solution: s });
}
