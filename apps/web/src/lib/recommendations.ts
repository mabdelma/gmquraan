import { prisma } from "@app/db";
import type { Prisma } from "@prisma/client";

/**
 * Recommendations for a client — solutions in categories they've engaged with
 * (saved or requested demos), excluding what they already saved. Cold-start
 * (no history) falls back to featured + newest.
 */
export async function getRecommendedSolutions(userId: string, limit = 6) {
  const [saved, demos] = await Promise.all([
    prisma.savedSolution.findMany({ where: { userId }, select: { solutionId: true, solution: { select: { category: true } } } }),
    prisma.demoRequest.findMany({ where: { userId }, select: { solution: { select: { category: true } } }, take: 20 }),
  ]);

  const cats = [
    ...new Set(
      [...saved.map((s) => s.solution?.category), ...demos.map((d) => d.solution?.category)].filter(Boolean) as string[]
    ),
  ];
  const excludeIds = saved.map((s) => s.solutionId);

  const where: Prisma.SolutionWhereInput = {
    published: true,
    ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
    ...(cats.length ? { category: { in: cats as never } } : {}),
  };

  return prisma.solution.findMany({
    where,
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
}
