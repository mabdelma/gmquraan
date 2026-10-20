import { prisma } from "@app/db";

/**
 * Projects — the group's delivered and developing work, authored at
 * /central/projects. Nothing is seeded: the brief forbids inventing projects,
 * so the public pages render an honest empty state until the first one is
 * published.
 */
export function getPublishedProjects() {
  return prisma.project.findMany({
    where: { published: true },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 50,
    select: { slug: true, title: true, summary: true, sector: true, status: true, coverImage: true, publishedAt: true },
  });
}

export function getProjectBySlug(slug: string) {
  return prisma.project.findFirst({ where: { slug, published: true } });
}

export function getPublishedProjectSlugs() {
  return prisma.project.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } });
}
