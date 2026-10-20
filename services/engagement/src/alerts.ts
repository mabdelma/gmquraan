import { prisma } from "@app/db";
import type { Prisma } from "@app/db";

/** Decode a saved-search query string into Solution filters. */
function parseQuery(query: string): Prisma.SolutionWhereInput {
  const p = new URLSearchParams(query);
  const where: Prisma.SolutionWhereInput = { published: true };
  const q = p.get("q");
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { summary: { contains: q, mode: "insensitive" } },
    ];
  }
  if (p.get("category")) where.category = p.get("category") as never;
  if (p.get("region")) where.region = p.get("region") as never;
  if (p.get("licenseModel")) where.licenseModel = p.get("licenseModel") as never;
  return where;
}

/** Send a saved-search alert digest via the notifications service. */
async function sendDigest(to: string, locale: string | null, vars: Record<string, unknown>) {
  const base = process.env.NOTIFICATIONS_URL_INTERNAL;
  if (!base) return { ok: false, skipped: true };
  try {
    const res = await fetch(`${base}/v1/notifications/email/send`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to, template: "alertDigest", locale: locale || "en", vars }),
    });
    return { ok: res.ok, skipped: false };
  } catch {
    return { ok: false, skipped: false };
  }
}

/** Run all enabled saved-search alerts. Returns a per-run summary. */
export async function runSavedSearchAlerts(): Promise<{ searches: number; emailed: number; matches: number }> {
  const searches = await prisma.savedSearch.findMany({
    where: { alerts: true },
    include: { user: { select: { email: true, name: true, locale: true } } },
  });

  let emailed = 0;
  let matches = 0;

  for (const s of searches) {
    const since = s.lastNotifiedAt ?? s.createdAt;
    const where = parseQuery(s.query);
    const items = await prisma.solution.findMany({
      where: { ...where, createdAt: { gt: since } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { slug: true, title: true, summary: true, createdAt: true },
    });
    if (items.length === 0) continue;

    matches += items.length;
    const newest = items[0].createdAt;
    const res = await sendDigest(s.user.email, s.user.locale, {
      name: s.user.name,
      searchName: s.name,
      count: items.length,
      url: `${process.env.APP_URL || "http://localhost:3000"}/marketplace?${s.query}`,
    });
    if (res.ok || res.skipped) {
      await prisma.savedSearch.update({ where: { id: s.id }, data: { lastNotifiedAt: newest } });
    }
    if (res.ok) emailed++;
  }

  return { searches: searches.length, emailed, matches };
}
