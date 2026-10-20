import { prisma } from "@app/db";

export function getPublishedPosts() {
  return prisma.post.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
    take: 50,
    select: { slug: true, title: true, excerpt: true, coverImage: true, publishedAt: true },
  });
}

export function getPostBySlug(slug: string) {
  return prisma.post.findFirst({ where: { slug, published: true } });
}

export function getPublishedSlugs() {
  return prisma.post.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } });
}
