import { prisma } from "@app/db";

/**
 * Vacancies — job openings, authored at /central/vacancies. Nothing is seeded:
 * the brief forbids inventing roles, so /careers renders an honest empty state
 * until the first opening is published.
 */
export function getPublishedVacancies() {
  return prisma.vacancy.findMany({
    where: { published: true },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 50,
    select: { slug: true, title: true, summary: true, department: true, location: true, workMode: true, type: true, publishedAt: true },
  });
}

export function getVacancyBySlug(slug: string) {
  return prisma.vacancy.findFirst({ where: { slug, published: true } });
}

export function getPublishedVacancySlugs() {
  return prisma.vacancy.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } });
}
