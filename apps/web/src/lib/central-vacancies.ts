import type { Vacancy } from "@prisma/client";

export type VacancyInput = Omit<Vacancy, "id" | "createdAt" | "updatedAt" | "publishedAt"> & { publishedAt?: Date | null };

export const WORK_MODES = ["ON_SITE", "REMOTE", "HYBRID"] as const;
export const JOB_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"] as const;

const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Normalise a request body into vacancy fields. */
export function readVacancyBody(b: Record<string, unknown>): VacancyInput {
  const str = (v: unknown) => String(v ?? "").trim();
  const orNull = (v: unknown) => str(v) || null;
  const workMode = str(b.workMode).toUpperCase();
  const type = str(b.type).toUpperCase();
  const published = b.published === true;
  return {
    slug: slugify(str(b.slug) || str(b.title)),
    title: str(b.title),
    summary: str(b.summary),
    body: str(b.body),
    department: orNull(b.department),
    location: str(b.location),
    workMode: (WORK_MODES as readonly string[]).includes(workMode) ? workMode : "ON_SITE",
    type: (JOB_TYPES as readonly string[]).includes(type) ? type : "FULL_TIME",
    published,
    publishedAt: published ? new Date() : null
  };
}

/** First validation failure, or null when the vacancy is usable. */
export function validateVacancy(d: VacancyInput): string | null {
  if (!d.title) return "Title is required";
  if (!d.slug) return "Could not derive a slug — add one manually";
  if (!d.location) return "Location is required — candidates need to know where the role is";
  if (!d.body) return "Body is required";
  return null;
}
