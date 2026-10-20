import { prisma } from "@app/db";

/** Slug for a vendor's public profile page (derived from vendorName). */
export function vendorSlug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** A vendor's published solutions (aggregated by vendorName). */
export async function getVendor(slug: string): Promise<{ name: string; solutions: Awaited<ReturnType<typeof allVendorSolutions>> } | null> {
  const sols = await allVendorSolutions();
  const match = sols.filter((s) => s.vendorName && vendorSlug(s.vendorName) === slug);
  if (match.length === 0) return null;
  return { name: match[0].vendorName as string, solutions: match };
}

function allVendorSolutions() {
  return prisma.solution.findMany({
    where: { published: true, vendorName: { not: null } },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
  });
}

export async function getAllVendorSlugs(): Promise<string[]> {
  const sols = await prisma.solution.findMany({
    where: { published: true, vendorName: { not: null } },
    select: { vendorName: true },
  });
  return [...new Set(sols.map((s) => vendorSlug(s.vendorName as string)))];
}
