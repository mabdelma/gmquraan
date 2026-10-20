import type { MetadataRoute } from "next";
import { prisma } from "@app/db";
import { COMPANY } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = `https://www.${COMPANY.domain}`;
  const now = new Date();

  // The public surface, not the previous product's marketplace/hub routes —
  // those are no longer linked from the nav, so they are not indexed.
  const staticRoutes = [
    "",
    "/about",
    "/services",
    "/projects",
    "/media",
    "/careers",
    "/contact",
    "/licence",
    "/cards",
    "/blog",
    "/privacy",
    "/terms",
  ].map(
    (path) => ({
      url: `${base}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    })
  );

  let posts: { slug: string; updatedAt: Date }[] = [];
  let projects: { slug: string; updatedAt: Date }[] = [];
  let vacancies: { slug: string; updatedAt: Date }[] = [];
  try {
    [posts, projects, vacancies] = await Promise.all([
      prisma.post.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
      prisma.project.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
      prisma.vacancy.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    ]);
  } catch {
    // DB unavailable at build — still return the static routes.
  }

  const postRoutes = posts.map((p) => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  const projectRoutes = projects.map((p) => ({
    url: `${base}/projects/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  const vacancyRoutes = vacancies.map((v) => ({
    url: `${base}/careers/${v.slug}`,
    lastModified: v.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [...staticRoutes, ...postRoutes, ...projectRoutes, ...vacancyRoutes];
}
