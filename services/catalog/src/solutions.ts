import { prisma } from "@app/db";
import type { Prisma, SolutionCategory, LicenseModel, Region } from "@app/db";

export interface SolutionFilters {
  q?: string;
  category?: string;
  licenseModel?: string;
  region?: string;
  minPrice?: number;
  maxPrice?: number;
  whiteLabel?: boolean;
  featured?: boolean;
  published?: boolean;
}

export function buildWhere(f: SolutionFilters): Prisma.SolutionWhereInput {
  const where: Prisma.SolutionWhereInput = {};

  if (f.q) {
    where.OR = [
      { title: { contains: f.q, mode: "insensitive" } },
      { summary: { contains: f.q, mode: "insensitive" } },
      { description: { contains: f.q, mode: "insensitive" } },
      { vendorName: { contains: f.q, mode: "insensitive" } },
      { tags: { has: f.q.toLowerCase() } },
    ];
  }
  if (f.category) where.category = f.category as SolutionCategory;
  if (f.licenseModel) where.licenseModel = f.licenseModel as LicenseModel;
  if (f.region) where.region = f.region as Region;
  if (f.whiteLabel != null) where.whiteLabel = f.whiteLabel;
  if (f.featured != null) where.featured = f.featured;
  if (f.published != null) where.published = f.published;
  if (f.minPrice != null || f.maxPrice != null) {
    where.price = {};
    if (f.minPrice != null) where.price.gte = f.minPrice;
    if (f.maxPrice != null) where.price.lte = f.maxPrice;
  }
  return where;
}

export type SortKey = "newest" | "price_asc" | "price_desc";

function orderFor(sort?: SortKey): Prisma.SolutionOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc": return [{ featured: "desc" }, { price: "asc" }];
    case "price_desc": return [{ featured: "desc" }, { price: "desc" }];
    default: return [{ featured: "desc" }, { createdAt: "desc" }];
  }
}

export async function getSolutionsPage(
  f: SolutionFilters = {},
  opts: { page?: number; perPage?: number; sort?: SortKey } = {}
) {
  const where = buildWhere({ published: true, ...f });
  const perPage = opts.perPage ?? 12;
  const page = Math.max(1, opts.page ?? 1);
  const [items, total] = await Promise.all([
    prisma.solution.findMany({
      where,
      orderBy: orderFor(opts.sort),
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.solution.count({ where }),
  ]);
  return { items, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getSolutionBySlug(slug: string) {
  return prisma.solution.findUnique({ where: { slug } });
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const CATEGORIES = [
  "SAAS_PLATFORM",
  "LAUNCH_KIT",
  "AI_AUTOMATION",
  "PRODUCTIZED_SERVICE",
  "MARKETPLACE_SOLUTION",
  "MARKET_ENABLEMENT",
];
const LICENSE_MODELS = ["SUBSCRIPTION", "ONE_TIME", "REVENUE_SHARE"];
const REGIONS = ["GCC", "EUROPE", "GLOBAL"];

/* eslint-disable @typescript-eslint/no-explicit-any */
const str = (v: any) => String(v ?? "").trim();
const int = (v: any) => {
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : 0;
};
const toArr = (v: any): string[] =>
  Array.isArray(v)
    ? v.map((s) => str(s)).filter(Boolean)
    : str(v).split(/[\n,]/).map((s) => s.trim()).filter(Boolean);

/** Coerce/validate a partner/admin form payload into Prisma data. */
export function parseSolutionInput(body: any, partial = false): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const has = (k: string) => body && body[k] !== undefined;

  if (!partial || has("title")) {
    const title = str(body.title);
    if (!title) throw new Error("Title is required");
    out.title = title;
  }
  if (!partial || has("slug") || has("title")) {
    const base = str(body.slug) || str(body.title);
    if (base) out.slug = slugify(base);
    else if (!partial) throw new Error("Title or slug is required");
  }
  if (!partial || has("category")) {
    const c = String(body.category);
    if (!CATEGORIES.includes(c)) throw new Error("Invalid solution category");
    out.category = c;
  }
  if (!partial || has("licenseModel")) {
    const m = String(body.licenseModel || "SUBSCRIPTION");
    if (!LICENSE_MODELS.includes(m)) throw new Error("Invalid license model");
    out.licenseModel = m;
  }
  if (!partial || has("region")) {
    const r = String(body.region || "GLOBAL");
    if (!REGIONS.includes(r)) throw new Error("Invalid region");
    out.region = r;
  }
  if (!partial || has("summary")) out.summary = str(body.summary);
  if (!partial || has("description")) out.description = str(body.description);
  if (!partial || has("price")) out.price = int(body.price);
  if (!partial || has("currency")) out.currency = str(body.currency) || "EUR";
  if (!partial || has("vendorName")) out.vendorName = str(body.vendorName) || null;
  if (!partial || has("whiteLabel")) out.whiteLabel = Boolean(body.whiteLabel);
  if (!partial || has("tags")) out.tags = toArr(body.tags);
  if (!partial || has("images")) out.images = toArr(body.images);
  if (!partial || has("demoMedia")) out.demoMedia = toArr(body.demoMedia);
  if (!partial || has("techStack")) out.techStack = toArr(body.techStack);
  if (!partial || has("featured")) out.featured = Boolean(body.featured);

  return out;
}

export async function createSolution(data: Record<string, unknown>, ownerId: string) {
  return prisma.solution.create({ data: { ...(data as any), ownerId } });
}
