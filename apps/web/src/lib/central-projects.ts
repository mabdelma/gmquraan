import type { Project } from "@prisma/client";

export type ProjectInput = Omit<Project, "id" | "createdAt" | "updatedAt" | "publishedAt"> & { publishedAt?: Date | null };

export const PROJECT_STATUSES = ["PLANNED", "ONGOING", "COMPLETED"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Normalise a request body into project fields. */
export function readProjectBody(b: Record<string, unknown>): ProjectInput {
  const str = (v: unknown) => String(v ?? "").trim();
  const orNull = (v: unknown) => str(v) || null;
  const status = str(b.status).toUpperCase();
  const published = b.published === true;
  return {
    slug: slugify(str(b.slug) || str(b.title)),
    title: str(b.title),
    summary: str(b.summary),
    body: str(b.body),
    sector: orNull(b.sector),
    status: (PROJECT_STATUSES as readonly string[]).includes(status) ? (status as ProjectStatus) : "ONGOING",
    coverImage: orNull(b.coverImage),
    published,
    publishedAt: published ? new Date() : null,
  };
}

/** First validation failure, or null when the project is usable. */
export function validateProject(d: ProjectInput): string | null {
  if (!d.title) return "Title is required";
  if (!d.slug) return "Could not derive a slug — add one manually";
  if (!d.summary) return "Summary is required — it appears on the /projects card";
  if (!d.body) return "Body is required";
  return null;
}
