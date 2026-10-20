import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { SITE_SECTIONS, defaultCards, type SiteSection } from "@/lib/site-cards";
import { logAudit } from "@/lib/audit";

/**
 * Import the site's current built-in content into the editor, so a section
 * starts populated with exactly what the pages already show — including the
 * hand-written translations for every locale we have them in.
 *
 * Existing rows are left untouched: this only fills gaps, so it is safe to run
 * again after adding a card by hand.
 */
export async function POST(req: Request) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const only = String(body.section ?? "");
  const sections: SiteSection[] = (SITE_SECTIONS as readonly SiteSection[]).includes(only as SiteSection)
    ? [only as SiteSection]
    : [...SITE_SECTIONS];

  let created = 0;
  let skipped = 0;
  for (const section of sections) {
    const existing = new Set(
      (await prisma.siteCard.findMany({ where: { section }, select: { slug: true } })).map((r) => r.slug)
    );
    for (const card of defaultCards(section)) {
      if (existing.has(card.slug)) {
        skipped++;
        continue;
      }
      // Prisma's nullable JSON column rejects a bare `null`, so drop the key.
      const { meta, ...rest } = card;
      await prisma.siteCard.create({ data: meta ? { ...rest, meta } : rest });
      created++;
    }
  }

  await logAudit(admin, "sitecard.seed", sections.join(","), `created=${created}, skipped=${skipped}`);
  return NextResponse.json({ success: true, created, skipped });
}
