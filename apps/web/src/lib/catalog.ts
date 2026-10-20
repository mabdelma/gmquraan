import { prisma } from "@app/db";
import type { Prisma } from "@app/db";

export interface SolutionFilters {
  q?: string;
  category?: string;
  region?: string;
  licenseModel?: string;
}

function buildWhere(f: SolutionFilters): Prisma.SolutionWhereInput {
  const where: Prisma.SolutionWhereInput = { published: true };
  if (f.q) {
    // Multi-term search: every term must match somewhere (title/summary/description/tags).
    const terms = f.q.trim().split(/\s+/).filter(Boolean).slice(0, 6);
    if (terms.length) {
      where.AND = terms.map((term) => ({
        OR: [
          { title: { contains: term, mode: "insensitive" } },
          { summary: { contains: term, mode: "insensitive" } },
          { description: { contains: term, mode: "insensitive" } },
          { tags: { has: term.toLowerCase() } }
        ]
      }));
    }
  }
  if (f.category) where.category = f.category as never;
  if (f.region) where.region = f.region as never;
  if (f.licenseModel) where.licenseModel = f.licenseModel as never;
  return where;
}

export async function listSolutions(f: SolutionFilters = {}) {
  return prisma.solution.findMany({
    where: buildWhere(f),
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take: 60
  });
}

export async function getSolution(slug: string) {
  return prisma.solution.findUnique({ where: { slug } });
}

export async function relatedSolutions(category: string, excludeId: string) {
  return prisma.solution.findMany({
    where: { published: true, category: category as never, NOT: { id: excludeId } },
    take: 3,
    orderBy: { createdAt: "desc" }
  });
}
